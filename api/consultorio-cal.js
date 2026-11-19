import { createHash } from 'node:crypto';
import { db, json, readBody, validEmail, validText } from '../src/server/commerce.js';
import { deliverPaymentInvite, queryValue, requireClinic, token } from '../src/server/consultorio.js';

const redirectUri = 'https://www.orkestalo.com/api/consultorio-cal?action=callback';
const q = queryValue;
const hash = value => createHash('sha256').update(value).digest('hex');

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

async function cal(path, access, version, body) {
  const response = await fetch(`https://api.cal.com/v2/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${access}`, 'cal-api-version': version, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
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
      for (const [key, value] of Object.entries({ client_id: process.env.CAL_OAUTH_CLIENT_ID, redirect_uri: redirectUri, state, scope: 'BOOKING_READ BOOKING_WRITE' })) target.searchParams.set(key, value);
      return json(res, 200, { url: target.toString() });
    }
    const clinics = await db('clinics', { query: `?id=eq.${q(clinicId)}&select=id,doctor_name,sender_local_part,reply_to,cal_event_type_id,cal_paid_event_type_id,cal_booking_url` });
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
        let bookingUrl;
        try { bookingUrl = new URL(clinic.cal_booking_url); } catch { return json(res, 409, { error:'Enlace de pago no configurado' }); }
        if (bookingUrl.protocol !== 'https:' || !['cal.com','app.cal.com'].includes(bookingUrl.hostname) || !clinic.cal_paid_event_type_id) return json(res, 409, { error:'Enlace de pago inválido' });
        const [invite] = await db('clinic_payment_invites', { method:'POST', body:{ clinic_id:clinicId, patient_name:input.name.trim(), patient_email:input.email.trim().toLowerCase(), requested_start:input.start } });
        const emailSent = await deliverPaymentInvite(clinic, invite);
        return json(res, 201, { invitePending:true, emailSent });
      }
      const booking = await cal('bookings', await accessToken(clinicId), '2024-08-13', { eventTypeId: clinic.cal_event_type_id, start: input.start, attendee: { name: input.name.trim(), email: input.email.trim().toLowerCase(), timeZone: 'America/Mexico_City' } });
      return json(res, 201, { booking });
    }
    return json(res, 405, { error: 'Método no permitido' });
  } catch (error) { console.error('Cal API', error); return json(res, 503, { error: 'Cal.com no está disponible' }); }
}
