import { db, json } from '../commerce.js';
import { appointmentFromCal, deliverMessage, matchingManualAppointment, queryValue, queueMessage, verifyCalWebhook } from '../consultorio.js';

export const config = { api: { bodyParser: false } };
const q = queryValue;
const uuid = value => /^[0-9a-f-]{36}$/i.test(value || '');

async function rawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  const chunks = []; let size = 0;
  for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 100_000) throw new Error('Body too large'); chunks.push(bytes); }
  return Buffer.concat(chunks).toString('utf8');
}

async function findAppointment(clinicId, uid) {
  if (!uid) return null;
  const aliases = await db('clinic_cal_aliases', { query:`?clinic_id=eq.${q(clinicId)}&cal_uid=eq.${q(uid)}&select=appointment_id&limit=1` });
  const id = aliases[0]?.appointment_id;
  if (id) return (await db('clinic_appointments', { query:`?clinic_id=eq.${q(clinicId)}&id=eq.${q(id)}&select=*&limit=1` }))[0] || null;
  return (await db('clinic_appointments', { query:`?clinic_id=eq.${q(clinicId)}&cal_uid=eq.${q(uid)}&select=*&limit=1` }))[0] || null;
}

async function alias(clinicId, uid, appointmentId) {
  if (!uid) return;
  await db('clinic_cal_aliases', { method:'POST', query:'?on_conflict=clinic_id,cal_uid', body:{ clinic_id:clinicId, cal_uid:uid, appointment_id:appointmentId }, prefer:'resolution=ignore-duplicates,return=minimal' });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const signature = req.headers?.['x-cal-signature-256'];
  if (!/^[a-f\d]{64}$/i.test(signature || '')) return json(res, 401, { error: 'Firma inválida' });
  const clinicId = new URL(req.url, 'https://www.orkestalo.com').searchParams.get('clinic');
  if (!uuid(clinicId)) return json(res, 400, { error: 'Consultorio inválido' });
  try {
    const raw = await rawBody(req);
    const [clinic] = await db('clinics', { query:`?id=eq.${q(clinicId)}&select=*` });
    if (!clinic || !verifyCalWebhook(raw, signature, clinic.cal_webhook_secret)) return json(res, 401, { error: 'Firma inválida' });
    const event = JSON.parse(raw), appointment = appointmentFromCal(event);
    if (!appointment) return json(res, 200, { ignored:true });
    if (event.triggerEvent === 'BOOKING_PAID' && event.payload?.status !== 'ACCEPTED') return json(res, 200, { ignored:true });
    if (!appointment.cal_event_at) return json(res, 400, { error:'Fecha del evento inválida' });
    const typeId = event.payload?.eventTypeId;
    if (typeId && ![clinic.cal_event_type_id, clinic.cal_paid_event_type_id].map(Number).includes(Number(typeId))) return json(res, 200, { ignored:true });

    const previousUid = event.payload?.rescheduleUid;
    let existing = await findAppointment(clinicId, appointment.cal_uid) || await findAppointment(clinicId, previousUid);
    if (event.triggerEvent === 'BOOKING_NO_SHOW_UPDATED') {
      if (!existing) return json(res, 503, { error:'Reserva aún no recibida' });
      if (existing.patient_email !== appointment.patient_email) return json(res, 200, { ignored:true });
      if (existing.cal_event_at && Date.parse(existing.cal_event_at) >= Date.parse(appointment.cal_event_at)) return json(res, 200, { duplicate:true });
      await db('clinic_appointments', { method:'PATCH', query:`?id=eq.${existing.id}&clinic_id=eq.${q(clinicId)}&or=(cal_event_at.is.null,cal_event_at.lt.${q(appointment.cal_event_at)})`, body:{ status:appointment.status, cal_event_at:appointment.cal_event_at } });
      return json(res, 200, { ok:true });
    }

    const paidType = clinic.cal_paid_event_type_id && Number(typeId) === Number(clinic.cal_paid_event_type_id);
    if (paidType && ['BOOKING_CREATED','BOOKING_RESCHEDULED'].includes(event.triggerEvent) && !['confirmed','attended'].includes(existing?.status)) appointment.status = 'pending';

    let row;
    if (existing) {
      if (existing.cal_event_at && Date.parse(existing.cal_event_at) >= Date.parse(appointment.cal_event_at)) return json(res, 200, { duplicate:true });
      const status = existing.status === 'attended' && ['confirmed','pending'].includes(appointment.status) ? 'attended' : appointment.status;
      const [updated] = await db('clinic_appointments', { method:'PATCH', query:`?id=eq.${existing.id}&clinic_id=eq.${q(clinicId)}&or=(cal_event_at.is.null,cal_event_at.lt.${q(appointment.cal_event_at)})`, body:{ ...appointment, status } });
      row = updated || existing;
    } else {
      const manuals = await db('clinic_appointments', { query:`?clinic_id=eq.${q(clinicId)}&patient_email=eq.${q(appointment.patient_email)}&source=eq.whatsapp&status=eq.unregistered&select=*&limit=20` });
      const manual = matchingManualAppointment(manuals, appointment);
      if (manual) {
        [row] = await db('clinic_appointments', { method:'PATCH', query:`?id=eq.${manual.id}&clinic_id=eq.${q(clinicId)}&status=eq.unregistered`, body:appointment });
        if (row) await db('clinic_tasks', { method:'PATCH', query:`?clinic_id=eq.${q(clinicId)}&appointment_id=eq.${manual.id}&done_at=is.null`, body:{ done_at:new Date().toISOString() } });
      }
      if (!row) [row] = await db('clinic_appointments', { method:'POST', query:'?on_conflict=clinic_id,cal_uid', body:{ ...appointment, clinic_id:clinicId }, prefer:'resolution=ignore-duplicates,return=representation' });
      if (!row) row = await findAppointment(clinicId, appointment.cal_uid);
    }
    if (!row) throw new Error('Reserva no guardada');
    await alias(clinicId, appointment.cal_uid, row.id);
    await alias(clinicId, previousUid, row.id);

    if (event.triggerEvent === 'BOOKING_PAID' && event.payload?.status === 'ACCEPTED' && (!clinic.cal_paid_event_type_id || Number(typeId) === Number(clinic.cal_paid_event_type_id))) {
      const inviteId = event.payload?.responses?.orkesta_invite;
      if (uuid(inviteId)) await db('clinic_payment_invites', { method:'PATCH', query:`?id=eq.${q(inviteId)}&clinic_id=eq.${q(clinicId)}&patient_email=eq.${q(appointment.patient_email)}&status=eq.pending`, body:{ status:'confirmed', cal_uid:appointment.cal_uid } });
    }
    if (clinic.welcome_enabled && appointment.status === 'confirmed' && row.status === 'confirmed') {
      const message = await queueMessage(clinic, row, 'welcome');
      if (message) await deliverMessage(clinic, row, message);
    }
    return json(res, 200, { ok:true });
  } catch (error) { console.error('Cal webhook', error); return json(res, 503, { error:'No se pudo procesar' }); }
}
