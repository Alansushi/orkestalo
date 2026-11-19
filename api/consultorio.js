import { db, json, readBody, validEmail, validPhone, validText } from '../src/server/commerce.js';
import { queryValue, requireClinic, ensureSurvey, surveyConsentRecord, userFromRequest } from '../src/server/consultorio.js';
import calHandler from '../src/server/consultorio-endpoints/cal-api.js';
import emailSettings from '../src/server/consultorio-endpoints/clinic-email-settings.js';

const uuid = value => /^[0-9a-f-]{36}$/i.test(value || '');
const q = queryValue;

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Método no permitido' });
  const url = new URL(req.url, 'https://www.orkestalo.com');
  if (['callback','connect','slots','booking'].includes(url.searchParams.get('action'))) return calHandler(req, res);
  if (req.method === 'GET' && url.searchParams.get('action') === 'clinics') {
    try {
      const user = await userFromRequest(req);
      if (!user) return json(res, 401, { error: 'Acceso restringido' });
      const memberships = await db('clinic_memberships', { query: `?user_id=eq.${q(user.id)}&active=eq.true&select=clinic_id` });
      const clinics = await Promise.all(memberships.map(row => db('clinics', { query: `?id=eq.${q(row.clinic_id)}&select=id,name,doctor_name` })));
      return json(res, 200, { clinics: clinics.flat() });
    } catch { return json(res, 503, { error: 'Acceso no disponible' }); }
  }
  const clinicId = url.searchParams.get('clinic');
  let access;
  try { access = await requireClinic(req, clinicId); } catch { return json(res, 503, { error: 'Acceso no disponible' }); }
  if (!access) return json(res, 401, { error: 'Acceso restringido' });
  try {
    const clinics = await db('clinics', { query: `?id=eq.${q(clinicId)}&select=id,name,doctor_name,sender_name,sender_local_part,reply_to,website_url,location,brand_color,cal_event_type_id,cal_booking_url,survey_enabled,welcome_enabled,followup_enabled,invite_enabled` });
    const clinic = clinics[0];
    if (!clinic) return json(res, 404, { error: 'Consultorio no encontrado' });
    if (['email','analyze-site','email-settings','email-template','email-preview','email-test','email-approve'].includes(url.searchParams.get('action'))) return emailSettings(req, res, { clinic, clinicId, user:access.user, action:url.searchParams.get('action') });
    if (req.method === 'GET') {
      const now = new Date(), weekAgo = new Date(Date.now() - 7 * 86400000);
      const [upcoming, recent, openTasks, completedTasks, messages, connection, paymentInvites] = await Promise.all([
        db('clinic_appointments', { query: `?clinic_id=eq.${q(clinicId)}&starts_at=gte.${q(now.toISOString())}&select=id,cal_uid,patient_name,patient_email,patient_phone,kind,starts_at,ends_at,status,source,survey_allowed,survey_allowed_at&order=starts_at.asc&limit=100` }),
        db('clinic_appointments', { query: `?clinic_id=eq.${q(clinicId)}&starts_at=gte.${q(weekAgo.toISOString())}&starts_at=lt.${q(now.toISOString())}&select=id,cal_uid,patient_name,patient_email,patient_phone,kind,starts_at,ends_at,status,source,survey_allowed,survey_allowed_at&order=starts_at.desc&limit=50` }),
        db('clinic_tasks', { query: `?clinic_id=eq.${q(clinicId)}&done_at=is.null&select=id,title,done_at,appointment_id,created_at&order=created_at.desc&limit=100` }),
        db('clinic_tasks', { query: `?clinic_id=eq.${q(clinicId)}&done_at=not.is.null&select=id,title,done_at,appointment_id,created_at&order=created_at.desc&limit=30` }),
        db('clinic_messages', { query: `?clinic_id=eq.${q(clinicId)}&select=id,appointment_id,kind,status,last_error,sent_at,created_at&order=created_at.desc&limit=100` }),
        db('clinic_cal_connections', { query: `?clinic_id=eq.${q(clinicId)}&select=connected_at` }),
        db('clinic_payment_invites', { query: `?clinic_id=eq.${q(clinicId)}&select=id,patient_name,patient_email,requested_start,status,email_status,created_at&order=created_at.desc&limit=100` }),
      ]);
      return json(res, 200, { clinic, connected: !!connection.length, appointments: [...recent, ...upcoming], tasks: [...openTasks, ...completedTasks], messages, paymentInvites });
    }
    const input = readBody(req) || {};
    if (req.method === 'POST' && input.action === 'manual') {
      if (!validText(input.name, 120) || !validText(input.kind || 'Consulta', 100) || !validEmail(input.email || '') || (input.phone && !validPhone(input.phone)) || !Number.isFinite(Date.parse(input.start)) || !Number.isFinite(Date.parse(input.end)) || Date.parse(input.end) <= Date.parse(input.start)) return json(res, 400, { error: 'Revisa la reserva' });
      const rows = await db('clinic_appointments', { method: 'POST', body: { clinic_id: clinicId, patient_name: input.name.trim(), patient_email: input.email.trim().toLowerCase(), patient_phone: input.phone || '', kind: input.kind || 'Consulta', starts_at: input.start, ends_at: input.end, status: 'unregistered', source: 'whatsapp', ...surveyConsentRecord(input.surveyAllowed === true) } });
      await db('clinic_tasks', { method: 'POST', body: { clinic_id: clinicId, appointment_id: rows[0].id, title: 'Registrar en Cal.com la cita coordinada por WhatsApp' } });
      return json(res, 201, { appointment: rows[0] });
    }
    if (req.method === 'POST' && input.action === 'task') {
      if (!validText(input.title, 200)) return json(res, 400, { error: 'Pendiente inválido' });
      const rows = await db('clinic_tasks', { method: 'POST', body: { clinic_id: clinicId, title: input.title.trim() } });
      return json(res, 201, { task: rows[0] });
    }
    if (req.method === 'PATCH' && input.action === 'task') {
      if (!uuid(input.id)) return json(res, 400, { error: 'Pendiente inválido' });
      const rows = await db('clinic_tasks', { method: 'PATCH', query: `?id=eq.${q(input.id)}&clinic_id=eq.${q(clinicId)}`, body: { done_at: input.done ? new Date().toISOString() : null } });
      return json(res, rows.length ? 200 : 404, { ok: !!rows.length });
    }
    if (req.method === 'PATCH' && input.action === 'attend') {
      if (!uuid(input.id)) return json(res, 400, { error: 'Cita inválida' });
      if (clinic.survey_enabled && !process.env.SURVEY_TOKEN_SECRET) return json(res, 503, { error: 'Encuesta no configurada' });
      const before = (await db('clinic_appointments', { query:`?id=eq.${q(input.id)}&clinic_id=eq.${q(clinicId)}&select=*&limit=1` }))[0];
      if (!before) return json(res, 404, { error:'Cita no encontrada' });
      const rows = before.status === 'confirmed' ? await db('clinic_appointments', { method: 'PATCH', query: `?id=eq.${q(input.id)}&clinic_id=eq.${q(clinicId)}&status=eq.confirmed`, body: { status: 'attended', attended_at: new Date().toISOString(), survey_due:clinic.survey_enabled && before.survey_allowed } }) : [];
      const appointment = rows[0] || (await db('clinic_appointments', { query:`?id=eq.${q(input.id)}&clinic_id=eq.${q(clinicId)}&status=eq.attended&select=*&limit=1` }))[0];
      if (!appointment) return json(res, 409, { error: 'La cita ya cambió de estado' });
      if (appointment.survey_due) await ensureSurvey(clinic, appointment);
      return json(res, 200, { appointment });
    }
    if (req.method === 'PATCH' && input.action === 'survey-consent') {
      if (!uuid(input.id) || typeof input.allowed !== 'boolean') return json(res, 400, { error: 'Autorización inválida' });
      const rows = await db('clinic_appointments', { method: 'PATCH', query: `?id=eq.${q(input.id)}&clinic_id=eq.${q(clinicId)}&status=in.(unregistered,pending,confirmed)`, body: surveyConsentRecord(input.allowed) });
      return json(res, rows.length ? 200 : 404, { ok: !!rows.length });
    }
    return json(res, 400, { error: 'Acción inválida' });
  } catch (error) {
    console.error('Panel consultorio', error);
    return json(res, 503, { error: 'El panel no está disponible' });
  }
}
