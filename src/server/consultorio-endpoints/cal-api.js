import { createHash, randomUUID } from 'node:crypto';
import { db, json, readBody, validEmail, validText } from '../commerce.js';
import { approvedTemplate, deliverPaymentInvite, queryValue, requireClinic, token } from '../consultorio.js';
import { prepareEmail } from '../clinic-email-content.js';
import { paidEventReady } from '../consultorio-onboarding.js';

const redirectUri = 'https://www.orkestalo.com/api/consultorio?action=callback';
const q = queryValue;
const hash = value => createHash('sha256').update(value).digest('hex');
const triggers = ['BOOKING_CREATED','BOOKING_RESCHEDULED','BOOKING_CANCELLED','BOOKING_REQUESTED','BOOKING_PAYMENT_INITIATED','BOOKING_PAID','BOOKING_REJECTED','BOOKING_NO_SHOW_UPDATED'];

async function oauthToken(body) {
  const response = await fetch('https://api.cal.com/v2/auth/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.CAL_OAUTH_CLIENT_ID, client_secret: process.env.CAL_OAUTH_CLIENT_SECRET, ...body }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Cal OAuth ${response.status}`);
  return response.json();
}

async function accessToken(clinicId) {
  const rows = await db('clinic_cal_connections', { query: `?clinic_id=eq.${q(clinicId)}&select=*` });
  const connection = rows[0];
  if (!connection) throw new Error('Cal no conectado');
  if (Date.parse(connection.expires_at) > Date.now() + 60_000) return connection.access_token;
  const refreshed = await oauthToken({ grant_type: 'refresh_token', refresh_token: connection.refresh_token });
  await db('clinic_cal_connections', { method: 'PATCH', query: `?clinic_id=eq.${q(clinicId)}`, body: { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token || connection.refresh_token, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() } });
  return refreshed.access_token;
}

async function cal(path, access, version, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`https://api.cal.com/v2/${path}`, { method, headers: { Authorization: `Bearer ${access}`, ...(version ? { 'cal-api-version':version } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
  const result = await response.json();
  if (!response.ok || result.status === 'error') throw new Error(`Cal API ${response.status}`);
  return result.data;
}

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://www.orkestalo.com');
  const action = url.searchParams.get('action');
  if (action === 'callback') {
    if (req.method !== 'GET' || !url.searchParams.get('state') || !url.searchParams.get('code')) return json(res, 400, { error: 'Autorización inválida' });
    try {
      const stateHash = hash(url.searchParams.get('state'));
      const rows = await db('clinic_oauth_states', { method: 'DELETE', query: `?state_hash=eq.${stateHash}&expires_at=gt.${q(new Date().toISOString())}` });
      if (!rows.length) return json(res, 401, { error: 'Autorización vencida' });
      const tokens = await oauthToken({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: redirectUri });
      if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) throw new Error('Cal no devolvió credenciales');
      await db('clinics', { method:'PATCH', query:`?id=eq.${q(rows[0].clinic_id)}`, body:{ cal_webhook_ready:false, cal_paid_webhook_ready:false, welcome_enabled:false, followup_enabled:false, survey_enabled:false, invite_enabled:false } });
      await db('clinic_cal_connections', { method: 'POST', query: '?on_conflict=clinic_id', body: { clinic_id: rows[0].clinic_id, access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString() }, prefer: 'resolution=merge-duplicates,return=representation' });
      res.statusCode = 302;
      res.setHeader('Location', '/consultorio/?connected=1');
      return res.end();
    } catch (error) { console.error('Cal OAuth', error); return json(res, 503, { error: 'No se pudo conectar Cal.com' }); }
  }
  const clinicId = url.searchParams.get('clinic');
  let access;
  try { access = await requireClinic(req, clinicId); } catch { return json(res, 503, { error: 'Acceso no disponible' }); }
  if (!access) return json(res, 401, { error: 'Acceso restringido' });
  if (!process.env.CAL_OAUTH_CLIENT_ID || !process.env.CAL_OAUTH_CLIENT_SECRET) return json(res, 503, { error: 'Cal no configurado' });
  try {
    if (action === 'connect' && req.method === 'POST') {
      const state = token();
      await db('clinic_oauth_states', { method: 'POST', body: { state_hash: hash(state), clinic_id: clinicId, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() } });
      const target = new URL('https://app.cal.com/auth/oauth2/authorize');
      for (const [key, value] of Object.entries({ client_id: process.env.CAL_OAUTH_CLIENT_ID, redirect_uri: redirectUri, state, scope: 'BOOKING_READ BOOKING_WRITE EVENT_TYPE_READ WEBHOOK_READ WEBHOOK_WRITE' })) target.searchParams.set(key, value);
      return json(res, 200, { url: target.toString() });
    }
    if (action === 'event-types' && req.method === 'GET') {
      const events = await cal('event-types', await accessToken(clinicId), '2026-06-12');
      return json(res, 200, { events:(Array.isArray(events) ? events : []).map(event => ({ id:event.id, title:event.title, bookingUrl:event.bookingUrl, price:event.price, paidReady:paidEventReady(event) })) });
    }
    if (action === 'select-event' && req.method === 'POST') {
      const input = readBody(req) || {};
      if (!Number.isSafeInteger(input.eventTypeId) || input.eventTypeId < 1 || typeof input.paid !== 'boolean') return json(res, 400, { error:'Tipo de cita inválido' });
      const access = await accessToken(clinicId);
      const events = await cal('event-types', access, '2026-06-12');
      const selected = (Array.isArray(events) ? events : []).find(event => event.id === input.eventTypeId);
      if (!selected) return json(res, 404, { error:'Ese tipo de cita no pertenece a la cuenta conectada' });
      if (input.paid && !paidEventReady(selected)) return json(res, 409, { error:'Configura el anticipo y el campo oculto orkesta_invite en Cal.com antes de elegir este tipo' });
      const [clinic] = await db('clinics', { query:`?id=eq.${q(clinicId)}&select=id,cal_webhook_secret,cal_event_type_id,cal_paid_event_type_id` });
      if (!clinic?.cal_webhook_secret) return json(res, 503, { error:'Falta la firma del consultorio' });
      if (input.paid && clinic.cal_event_type_id === selected.id || !input.paid && clinic.cal_paid_event_type_id === selected.id) return json(res, 409, { error:'Elige tipos de cita distintos' });
      const subscriberUrl = `https://www.orkestalo.com/api/consultorio-misc?route=cal&clinic=${clinicId}`;
      const path = `event-types/${selected.id}/webhooks`;
      const hooks = await cal(path, access);
      const found = (Array.isArray(hooks) ? hooks : []).find(hook => hook.subscriberUrl === subscriberUrl);
      const spec = { active:true, subscriberUrl, triggers, secret:clinic.cal_webhook_secret, version:'2021-10-20' };
      let hook = found;
      if (!found) hook = await cal(path, access, undefined, spec);
      else hook = await cal(`${path}/${found.id}`, access, undefined, spec, 'PATCH');
      const verified = await cal(path, access);
      if (!(Array.isArray(verified) ? verified : []).some(row => row.id === hook.id && row.active && row.subscriberUrl === subscriberUrl && triggers.every(trigger => row.triggers?.includes(trigger)))) throw new Error('Webhook no verificado');
      await db('clinic_cal_webhooks', { method:'POST', query:'?on_conflict=clinic_id,event_type_id', body:{ clinic_id:clinicId, event_type_id:selected.id, webhook_id:hook.id, verified_at:new Date().toISOString() }, prefer:'resolution=merge-duplicates,return=representation' });
      const changes = input.paid ? { cal_paid_event_type_id:selected.id, cal_booking_url:selected.bookingUrl, cal_paid_event_ready:true, cal_paid_webhook_ready:true, invite_enabled:false } : { cal_event_type_id:selected.id, cal_webhook_ready:true, welcome_enabled:false, followup_enabled:false, survey_enabled:false };
      await db('clinics', { method:'PATCH', query:`?id=eq.${q(clinicId)}`, body:changes });
      return json(res, 200, { event:{ id:selected.id, title:selected.title, paid:input.paid }, webhookReady:true });
    }
    const clinics = await db('clinics', { query: `?id=eq.${q(clinicId)}&select=id,doctor_name,sender_name,sender_local_part,reply_to,brand_color,invite_enabled,cal_event_type_id,cal_paid_event_type_id,cal_booking_url` });
    const clinic = clinics[0];
    if (!clinic?.cal_event_type_id) return json(res, 409, { error: 'Tipo de cita no configurado' });
    if (action === 'slots' && req.method === 'GET') {
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) - Date.parse(start) > 31 * 86400000) return json(res, 400, { error: 'Fechas inválidas' });
      const slots = await cal(`slots?eventTypeId=${clinic.cal_event_type_id}&start=${q(start)}&end=${q(end)}&timeZone=America%2FMexico_City`, await accessToken(clinicId), '2024-09-04');
      return json(res, 200, { slots });
    }
    if (action === 'booking' && req.method === 'POST') {
      const input = readBody(req) || {};
      if (!validText(input.name, 120) || !validEmail(input.email) || !Number.isFinite(Date.parse(input.start))) return json(res, 400, { error: 'Datos inválidos' });
      if (input.payment === true) {
        if (!clinic.invite_enabled) return json(res, 409, { error:'Invitaciones aún no activadas' });
        const template = await approvedTemplate(clinicId, 'invite');
        if (!template) return json(res, 409, { error:'Invitación aún no aprobada' });
        let bookingUrl;
        try { bookingUrl = new URL(clinic.cal_booking_url); } catch { return json(res, 409, { error:'Enlace de pago no configurado' }); }
        if (bookingUrl.protocol !== 'https:' || !['cal.com','app.cal.com'].includes(bookingUrl.hostname) || !clinic.cal_paid_event_type_id) return json(res, 409, { error:'Enlace de pago inválido' });
        const id = randomUUID(), patientEmail = input.email.trim().toLowerCase(), patientName = input.name.trim();
        bookingUrl.searchParams.set('orkesta_invite', id);
        bookingUrl.searchParams.set('name', patientName);
        bookingUrl.searchParams.set('email', patientEmail);
        const snapshot = prepareEmail(clinic, template, { patient:patientName, doctor:clinic.doctor_name, booking_url:bookingUrl.toString(), survey_url:'', location:'' }, patientEmail);
        const [invite] = await db('clinic_payment_invites', { method:'POST', body:{ id, clinic_id:clinicId, patient_name:patientName, patient_email:patientEmail, requested_start:input.start, email_snapshot:snapshot } });
        const emailSent = await deliverPaymentInvite(clinic, invite);
        return json(res, 201, { invitePending:true, emailSent });
      }
      const booking = await cal('bookings', await accessToken(clinicId), '2024-08-13', { eventTypeId: clinic.cal_event_type_id, start: input.start, attendee: { name: input.name.trim(), email: input.email.trim().toLowerCase(), timeZone: 'America/Mexico_City' } });
      return json(res, 201, { booking });
    }
    return json(res, 405, { error: 'Método no permitido' });
  } catch (error) { console.error('Cal API', error); return json(res, 503, { error: 'Cal.com no está disponible' }); }
}
