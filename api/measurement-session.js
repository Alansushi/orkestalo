import { db, json, readBody } from '../src/server/commerce.js';
import { ownerFromToken, ownerUserFromToken } from '../src/server/measurement.js';
import { readPending, setPending } from '../src/server/measurement-auth.js';

function ownerEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    value.trim().toLowerCase() === process.env.MEASUREMENT_OWNER_EMAIL?.toLowerCase();
}

function configured() {
  return ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'MEASUREMENT_OWNER_EMAIL', 'RESEND_API_KEY', 'ORKESTA_EMAIL_FROM']
    .every(key => Boolean(process.env[key]));
}

async function authRequest(path, token, body) {
  return fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', [
      'orkesta_measurement_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-dashboard; Max-Age=0',
      'orkesta_measurement_pending=; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-session; Max-Age=0',
    ]);
    return json(res, 200, { ok: true });
  }
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Método no permitido' });
  if (!configured()) return json(res, 503, { error: 'Panel no configurado' });
  const { email, code, type, action, factorId } = readBody(req) || {};
  if (action === 'enroll' || req.method === 'PATCH') {
    const token = readPending(req);
    const user = await ownerUserFromToken(token, false);
    if (!user) return json(res, 401, { error: 'Vuelve a introducir el código del correo' });
    const verified = user.factors?.find(f => f.factor_type === 'totp' && f.status === 'verified');
    if (action === 'enroll' && req.method === 'POST') {
      if (verified) return json(res, 409, { error: 'El autenticador ya está configurado' });
      const enrolled = await authRequest('factors', token, { factor_type: 'totp', friendly_name: 'Panel Orkesta' });
      if (!enrolled.ok) return json(res, 503, { error: 'No se pudo configurar el autenticador' });
      const factor = await enrolled.json();
      return json(res, 200, { factorId: factor.id, qr: factor.totp?.qr_code, secret: factor.totp?.secret });
    }
    if (req.method !== 'PATCH' || !/^\d{6}$/.test(code) || typeof factorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(factorId) || (verified && verified.id !== factorId)) return json(res, 400, { error: 'Código de autenticador inválido' });
    const challenge = await authRequest(`factors/${encodeURIComponent(factorId)}/challenge`, token, {});
    if (!challenge.ok) return json(res, 401, { error: 'No se pudo iniciar la verificación' });
    const { id: challengeId } = await challenge.json();
    const verifiedResponse = await authRequest(`factors/${encodeURIComponent(factorId)}/verify`, token, { challenge_id: challengeId, code });
    if (!verifiedResponse.ok) return json(res, 422, { error: 'Código de autenticador inválido o vencido' });
    const session = await verifiedResponse.json();
    if (!await ownerFromToken(session.access_token)) return json(res, 403, { error: 'Acceso sin segundo factor confirmado' });
    res.setHeader('Set-Cookie', [
      `orkesta_measurement_session=${encodeURIComponent(session.access_token)}; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-dashboard; Max-Age=${Math.min(session.expires_in || 3600, 3600)}`,
      'orkesta_measurement_pending=; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-session; Max-Age=0',
    ]);
    return json(res, 200, { ok: true });
  }
  if (!ownerEmail(email)) return json(res, 403, { error: 'Sin acceso al panel' });
  const normalizedEmail = process.env.MEASUREMENT_OWNER_EMAIL;

  if (req.method === 'POST') {
    try {
      const allowed = await db('rpc/measurement_claim_code_request', { method: 'POST', body: { p_owner_email: normalizedEmail } });
      if (!allowed) return json(res, 429, { error: 'Espera un minuto antes de pedir otro código' });
      const generated = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'magiclink', email: normalizedEmail }),
        signal: AbortSignal.timeout(8000),
      });
      if (!generated.ok) throw new Error(`Supabase Auth ${generated.status}`);
      const { email_otp, verification_type } = await generated.json();
      if (!/^\d{6,8}$/.test(email_otp) || !['signup', 'magiclink'].includes(verification_type)) throw new Error('Supabase Auth no devolvió un código válido');
      const mailed = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.ORKESTA_EMAIL_FROM,
          to: [normalizedEmail],
          subject: 'Código de acceso al panel de Orkéstalo',
          text: `Tu código de acceso es ${email_otp}. Úsalo en el panel de medición; no lo compartas.`,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!mailed.ok) throw new Error(`Correo ${mailed.status}`);
      return json(res, 200, { ok: true, type: verification_type });
    } catch (error) {
      console.error('Fallo de envío de código de medición', error);
      return json(res, 503, { error: 'No se pudo enviar el código' });
    }
  }

  if (typeof code !== 'string' || !/^\d{6,8}$/.test(code) || !['signup', 'magiclink'].includes(type)) return json(res, 400, { error: 'Código inválido' });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email: normalizedEmail, token: code }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json(res, 401, { error: 'Código inválido o vencido' });
    const data = await response.json();
    const user = await ownerUserFromToken(data.access_token, false);
    if (!user) return json(res, 403, { error: 'Sin acceso al panel' });
    setPending(res, data.access_token);
    const factor = user.factors?.find(f => f.factor_type === 'totp' && f.status === 'verified');
    return json(res, 200, { ok: true, mfa: factor ? 'verify' : 'enroll', factorId: factor?.id });
  } catch (error) {
    console.error('Fallo de acceso al panel', error);
    return json(res, 503, { error: 'Acceso no disponible' });
  }
}
