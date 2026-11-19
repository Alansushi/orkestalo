import { randomBytes } from 'node:crypto';
import { db, json, readBody, validEmail, validText } from '../commerce.js';
import { queryValue, userFromRequest } from '../consultorio.js';
import { siteUrlAllowed } from '../consultorio-onboarding.js';

const q = queryValue;
const redirectTo = 'https://www.orkestalo.com/consultorio/';
const allowedAdmin = user => !!user?.email_confirmed_at && [process.env.MEASUREMENT_OWNER_EMAIL, ...(process.env.CLINIC_ADMIN_EMAILS || '').split(',')].map(s => s?.trim().toLowerCase()).filter(Boolean).includes(user.email?.toLowerCase());

async function linkFor(email, existing) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Acceso no configurado');
  const call = type => fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method:'POST', headers:{ apikey:process.env.SUPABASE_SECRET_KEY, Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ type, email, redirect_to:redirectTo }), signal:AbortSignal.timeout(8000),
  });
  let response = await call(existing ? 'magiclink' : 'invite');
  if (!existing && response.status === 422) response = await call('magiclink');
  if (!response.ok) throw new Error(`Invitación ${response.status}`);
  const data = await response.json();
  if (!data.action_link || !data.id) throw new Error('Enlace inválido');
  return data;
}

async function sendInvite(email, name, link) {
  if (!process.env.RESEND_API_KEY) throw new Error('Correo no configurado');
  const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ from:process.env.ORKESTA_EMAIL_FROM || 'Orkéstalo <avisos@orkestalo.com>', to:[email], subject:'Tu acceso al consultorio en Orkéstalo', text:`Hola. Te invitamos a configurar ${name} en Orkéstalo. Abre este enlace para verificar tu correo y entrar al panel: ${link}\n\nSi no esperabas esta invitación, ignora este mensaje.` }), signal:AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Correo ${response.status}`);
}

export default async function admin(req, res, action) {
  const user = await userFromRequest(req);
  if (!user) return json(res, 401, { error:'Acceso restringido' });
  if (!allowedAdmin(user)) return json(res, 403, { error:'Administración restringida' });
  if (action === 'admin-list' && req.method === 'GET') {
    const invitations = await db('clinic_invitations', { query:'?select=email,clinic_id,invited_at,last_sent_at&order=invited_at.desc&limit=200' });
    return json(res, 200, { invitations });
  }
  if (action === 'admin-resend' && req.method === 'POST') {
    const email = readBody(req)?.email?.trim().toLowerCase();
    if (!validEmail(email)) return json(res, 400, { error:'Correo inválido' });
    const [invitation] = await db('clinic_invitations', { query:`?email=eq.${q(email)}&select=clinic_id,user_id&limit=1` });
    if (!invitation) return json(res, 404, { error:'Invitación no encontrada' });
    const [clinic] = await db('clinics', { query:`?id=eq.${q(invitation.clinic_id)}&select=name&limit=1` });
    if (!clinic) return json(res, 404, { error:'Consultorio no encontrado' });
    const link = await linkFor(email, true);
    if (link.id !== invitation.user_id) return json(res, 409, { error:'La cuenta del correo cambió; revisa el acceso' });
    await sendInvite(email, clinic.name, link.action_link);
    await db('clinic_invitations', { method:'PATCH', query:`?email=eq.${q(email)}`, body:{ last_sent_at:new Date().toISOString() } });
    return json(res, 200, { sent:true });
  }
  if (action !== 'admin-invite' || req.method !== 'POST') return json(res, 405, { error:'Método no permitido' });
  const input = readBody(req) || {};
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!validEmail(email) || !validText(input.name, 120) || !validText(input.doctor_name || input.name, 120) || /[<>\r\n]/.test(input.name) || /[<>\r\n]/.test(input.doctor_name || input.name) || input.website_url && !siteUrlAllowed(input.website_url)) return json(res, 400, { error:'Revisa el correo, nombre y sitio' });
  const existing = (await db('clinic_invitations', { query:`?email=eq.${q(email)}&select=*&limit=1` }))[0];
  const link = await linkFor(email, !!existing);
  let invitation = existing;
  if (!invitation) {
    const [provisioned] = await db('rpc/clinic_provision', { method:'POST', body:{ p_email:email, p_user_id:link.id, p_name:input.name.trim(), p_doctor_name:(input.doctor_name || input.name).trim(), p_sender_local_part:`consulta-${randomBytes(5).toString('hex')}`, p_cal_webhook_secret:randomBytes(32).toString('hex'), p_website_url:input.website_url ? siteUrlAllowed(input.website_url).toString() : null } });
    if (!provisioned || provisioned.user_id !== link.id) return json(res, 409, { error:'El correo ya pertenece a otra cuenta' });
    invitation = provisioned;
  }
  await sendInvite(email, input.name.trim(), link.action_link);
  await db('clinic_invitations', { method:'PATCH', query:`?email=eq.${q(email)}`, body:{ last_sent_at:new Date().toISOString() } });
  return json(res, 200, { invitation:{ email, clinic_id:invitation.clinic_id, resent:!!existing } });
}
