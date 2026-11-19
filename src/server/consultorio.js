import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, validEmail } from './commerce.js';

const calEvents = { BOOKING_CREATED: 'confirmed', BOOKING_RESCHEDULED: 'confirmed', BOOKING_CANCELLED: 'cancelled', BOOKING_REQUESTED: 'pending', BOOKING_PAYMENT_INITIATED: 'pending', BOOKING_PAID: 'confirmed', BOOKING_REJECTED: 'cancelled', BOOKING_NO_SHOW_UPDATED: 'missed' };
export const token = () => randomBytes(24).toString('base64url');
export const surveyToken = (appointmentId, secret) => createHmac('sha256', secret).update(appointmentId).digest('hex');
export const surveyConsentRecord = allowed => ({ survey_allowed: allowed, survey_allowed_at: allowed ? new Date().toISOString() : null, survey_consent_version: allowed ? 'consultorio-encuesta-v1' : null });
export const queryValue = value => encodeURIComponent(value);

export function verifyCalWebhook(raw, signature, secret) {
  if (typeof raw !== 'string' || !/^[a-f\d]{64}$/i.test(signature || '') || !secret) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export function appointmentFromCal(event) {
  const payload = event?.payload;
  const eventAt = Number.isFinite(Date.parse(event?.createdAt)) ? { cal_event_at: event.createdAt } : {};
  if (event?.triggerEvent === 'BOOKING_NO_SHOW_UPDATED') {
    const attendee = payload?.attendees?.[0];
    const uid = payload?.bookingUid;
    if (!uid || !validEmail(attendee?.email) || typeof attendee.noShow !== 'boolean') return null;
    return { cal_uid:String(uid).slice(0,160), patient_email:attendee.email.trim().toLowerCase(), status:attendee.noShow ? 'missed' : 'confirmed', ...eventAt };
  }
  const status = event?.triggerEvent === 'BOOKING_PAID' && payload?.status !== 'ACCEPTED' ? 'pending' : calEvents[event?.triggerEvent];
  const attendee = payload?.attendees?.[0];
  const uid = payload?.uid || payload?.bookingUid;
  const start = payload?.startTime || payload?.start;
  const end = payload?.endTime || payload?.end;
  if (!status || !uid || !start || !end || !attendee?.name || !validEmail(attendee.email)) return null;
  return {
    cal_uid: String(uid).slice(0, 160),
    cal_booking_id: payload.bookingId || payload.id || null,
    patient_name: attendee.name.trim().slice(0, 120),
    patient_email: attendee.email.trim().toLowerCase(),
    patient_phone: typeof attendee.phoneNumber === 'string' ? attendee.phoneNumber.slice(0, 30) : '',
    starts_at: start,
    ends_at: end,
    kind: String(payload.type || payload.title || 'Consulta').slice(0, 100),
    status,
    source: 'cal',
    ...eventAt,
  };
}

export function clinicForUser(memberships, userId, clinicId) {
  return memberships.find(row => row.user_id === userId && row.clinic_id === clinicId && row.active)?.clinic_id || null;
}

export function matchingManualAppointment(manualRows, booking) {
  return manualRows.find(row => row.source === 'whatsapp' && row.status === 'unregistered' && row.patient_email?.toLowerCase() === booking.patient_email?.toLowerCase() && Date.parse(row.starts_at) === Date.parse(booking.starts_at)) || null;
}

export function welcomeMessage({ doctor, patient }) {
  return `Hola ${patient}, te damos la bienvenida al consultorio de ${doctor}. Tu cita se confirma y administra en Cal.com. Si necesitas cambiarla, usa el enlace de tu confirmación o responde a este correo. Si tienes una urgencia, acude a los servicios de emergencia. Este mensaje contiene indicaciones generales.`;
}

export function surveyMessage({ doctor, url }) {
  return `Gracias por visitar el consultorio de ${doctor}. Nos gustaría conocer tu experiencia. Califica la atención general y, si quieres, añade un comentario: ${url}`;
}

export function paymentInvitationMessage({ doctor, patient, url }) {
  return `Hola ${patient}, ${doctor} te invita a reservar tu siguiente cita. Para elegir un horario disponible y completar el anticipo, entra a Cal.com: ${url}. La cita quedará confirmada cuando Cal.com complete el pago. Si tienes dudas, responde a este correo.`;
}

async function claimDelivery(table, id, clinicId, field) {
  const now = new Date().toISOString();
  let rows = await db(table, { method:'PATCH', query:`?id=eq.${id}&clinic_id=eq.${clinicId}&${field}=in.(queued,failed)`, body:{ [field]:'sending', claimed_at:now } });
  if (!rows.length) rows = await db(table, { method:'PATCH', query:`?id=eq.${id}&clinic_id=eq.${clinicId}&${field}=eq.sending&claimed_at=lt.${encodeURIComponent(new Date(Date.now()-10*60_000).toISOString())}`, body:{ claimed_at:now } });
  return rows.length > 0;
}

async function applyEarlyDelivery(table, id, clinicId, field, resendId) {
  const events = await db('clinic_email_events', { query:`?resend_id=eq.${encodeURIComponent(resendId)}&select=status&order=received_at.desc&limit=1` });
  if (events.length) await db(table, { method:'PATCH', query:`?id=eq.${id}&clinic_id=eq.${clinicId}`, body:{ [field]:events[0].status } });
}

export async function deliverPaymentInvite(clinic, invite) {
  if (!await claimDelivery('clinic_payment_invites', invite.id, clinic.id, 'email_status')) return false;
  try {
    const bookingUrl = new URL(clinic.cal_booking_url);
    bookingUrl.searchParams.set('orkesta_invite', invite.id);
    bookingUrl.searchParams.set('name', invite.patient_name);
    bookingUrl.searchParams.set('email', invite.patient_email);
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json', 'Idempotency-Key':`payment-invite-${invite.id}` }, body:JSON.stringify({ from:`${clinic.doctor_name} <${clinic.sender_local_part}@orkestalo.com>`, reply_to:clinic.reply_to, to:[invite.patient_email], subject:`Reserva tu cita con ${clinic.doctor_name}`, text:paymentInvitationMessage({ doctor:clinic.doctor_name, patient:invite.patient_name, url:bookingUrl.toString() }) }), signal:AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Resend ${response.status}`);
    const { id } = await response.json();
    await db('clinic_payment_invites', { method:'PATCH', query:`?id=eq.${invite.id}&clinic_id=eq.${clinic.id}`, body:{ email_status:'sent', resend_id:id } });
    await applyEarlyDelivery('clinic_payment_invites', invite.id, clinic.id, 'email_status', id);
    return true;
  } catch (error) {
    await db('clinic_payment_invites', { method:'PATCH', query:`?id=eq.${invite.id}&clinic_id=eq.${clinic.id}`, body:{ email_status:'failed' } });
    return false;
  }
}

export async function userFromRequest(req) {
  const access = req.headers?.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!access || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return null;
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? user : null;
}

export async function requireClinic(req, clinicId) {
  const user = await userFromRequest(req);
  if (!user || !/^[0-9a-f-]{36}$/i.test(clinicId || '')) return null;
  const memberships = await db('clinic_memberships', { query: `?user_id=eq.${queryValue(user.id)}&clinic_id=eq.${queryValue(clinicId)}&active=eq.true&select=clinic_id,user_id,active` });
  return clinicForUser(memberships, user.id, clinicId) ? { user, clinicId } : null;
}

export async function sendClinicEmail({ clinic, appointment, kind, text, key }) {
  if (!process.env.RESEND_API_KEY || !validEmail(appointment.patient_email)) throw new Error('Correo no configurado');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from: `${clinic.doctor_name} <${clinic.sender_local_part}@orkestalo.com>`, reply_to: clinic.reply_to, to: [appointment.patient_email], subject: kind === 'welcome' ? `Bienvenida al consultorio de ${clinic.doctor_name}` : `Tu opinión sobre la visita con ${clinic.doctor_name}`, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}`);
  return (await response.json()).id;
}

export async function queueMessage(clinic, appointment, kind) {
  if (kind === 'survey' && !appointment.survey_allowed) return null;
  const key = kind === 'welcome' ? `welcome-${clinic.id}-${createHash('sha256').update(appointment.patient_email.toLowerCase()).digest('hex')}` : `survey-${appointment.id}`;
  const rows = await db('clinic_messages', { method: 'POST', query: '?on_conflict=clinic_id,idempotency_key', body: { clinic_id: clinic.id, appointment_id: appointment.id, kind, idempotency_key: key, status: 'queued' }, prefer: 'resolution=ignore-duplicates,return=representation' });
  return rows[0] || null;
}

export async function deliverMessage(clinic, appointment, message, surveyUrl) {
  if (!await claimDelivery('clinic_messages', message.id, clinic.id, 'status')) return false;
  const text = message.kind === 'welcome'
    ? welcomeMessage({ doctor: clinic.doctor_name, patient: appointment.patient_name })
    : surveyMessage({ doctor: clinic.doctor_name, url: surveyUrl });
  try {
    const id = await sendClinicEmail({ clinic, appointment, kind: message.kind, text, key: message.idempotency_key });
    await db('clinic_messages', { method: 'PATCH', query: `?id=eq.${message.id}&clinic_id=eq.${clinic.id}`, body: { status: 'sent', resend_id: id, sent_at: new Date().toISOString() } });
    await applyEarlyDelivery('clinic_messages', message.id, clinic.id, 'status', id);
    return true;
  } catch (error) {
    await db('clinic_messages', { method: 'PATCH', query: `?id=eq.${message.id}&clinic_id=eq.${clinic.id}`, body: { status: 'failed', last_error: String(error.message).slice(0, 180) } });
    return false;
  }
}

export async function ensureSurvey(clinic, appointment) {
  if (!clinic.survey_enabled || !appointment.survey_due || !appointment.survey_allowed || !process.env.SURVEY_TOKEN_SECRET) return false;
  const linkToken = surveyToken(appointment.id, process.env.SURVEY_TOKEN_SECRET);
  const hash = createHash('sha256').update(linkToken).digest('hex');
  await db('clinic_surveys', { method:'POST', query:'?on_conflict=appointment_id', body:{ clinic_id:clinic.id, appointment_id:appointment.id, token_hash:hash }, prefer:'resolution=ignore-duplicates,return=representation' });
  const message = await queueMessage(clinic, appointment, 'survey');
  if (!message) return false;
  return deliverMessage(clinic, appointment, message, `https://www.orkestalo.com/encuesta/?token=${linkToken}`);
}
