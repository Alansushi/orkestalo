import { timingSafeEqual } from 'node:crypto';
import { db, json } from '../commerce.js';
import { deliverMessage, deliverPaymentInvite, ensureSurvey, surveyToken } from '../consultorio.js';

function authorized(value, secret) {
  if (!value || !secret) return false;
  const a = Buffer.from(value), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  if (!authorized(req.headers?.authorization, process.env.CRON_SECRET)) return json(res, 401, { error: 'Acceso restringido' });
  if (!process.env.SUPABASE_PUBLISHABLE_KEY) return json(res, 200, { skipped:'Piloto no configurado' });
  try {
    const stale = encodeURIComponent(new Date(Date.now()-10*60_000).toISOString());
    const messages = [
      ...await db('clinic_messages', { query: '?status=in.(queued,failed)&select=*&order=created_at.asc&limit=30' }),
      ...await db('clinic_messages', { query: `?status=eq.sending&claimed_at=lt.${stale}&select=*&order=created_at.asc&limit=30` }),
    ];
    let sent = 0;
    for (const message of messages) {
      const [clinic] = await db('clinics', { query: `?id=eq.${message.clinic_id}&select=*` });
      const [appointment] = await db('clinic_appointments', { query: `?id=eq.${message.appointment_id}&clinic_id=eq.${message.clinic_id}&select=*` });
      if (!clinic || !appointment || (message.kind !== 'survey' && !['confirmed','attended'].includes(appointment.status)) || (message.kind === 'survey' && (!clinic.survey_enabled || !appointment.survey_due || appointment.status !== 'attended' || !process.env.SURVEY_TOKEN_SECRET)) || (message.kind === 'welcome' && !clinic.welcome_enabled) || (message.kind === 'followup' && !clinic.followup_enabled)) continue;
      const surveyUrl = message.kind === 'survey' ? `https://www.orkestalo.com/encuesta/?token=${surveyToken(appointment.id, process.env.SURVEY_TOKEN_SECRET)}` : undefined;
      if (await deliverMessage(clinic, appointment, message, surveyUrl)) sent++;
    }
    const invites = [
      ...await db('clinic_payment_invites', { query:'?email_status=in.(queued,failed)&select=*&order=created_at.asc&limit=30' }),
      ...await db('clinic_payment_invites', { query:`?email_status=eq.sending&claimed_at=lt.${stale}&select=*&order=created_at.asc&limit=30` }),
    ];
    for (const invite of invites) {
      const [clinic] = await db('clinics', { query:`?id=eq.${invite.clinic_id}&select=*` });
      if (clinic?.invite_enabled && invite.status === 'pending' && await deliverPaymentInvite(clinic, invite)) sent++;
    }
    if (process.env.SURVEY_TOKEN_SECRET) {
      const attended = await db('clinic_appointments', { query:'?status=eq.attended&survey_due=eq.true&select=*&order=attended_at.desc&limit=100' });
      for (const appointment of attended) {
        const [clinic] = await db('clinics', { query:`?id=eq.${appointment.clinic_id}&select=*` });
        if (clinic?.survey_enabled && await ensureSurvey(clinic, appointment)) sent++;
      }
    }
    return json(res, 200, { sent });
  } catch (error) { console.error('Reintento consultorio', error); return json(res, 503, { error: 'Reintento no disponible' }); }
}
