import { json, readBody } from '../src/server/commerce.js';
import { ownerFromToken } from '../src/server/measurement.js';
import { setSession } from '../src/server/measurement-auth.js';

const recentRequests = new Map();

function ownerEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    value.trim().toLowerCase() === process.env.MEASUREMENT_OWNER_EMAIL?.toLowerCase();
}

function configured() {
  return ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'MEASUREMENT_OWNER_EMAIL', 'RESEND_API_KEY', 'ORKESTA_EMAIL_FROM']
    .every(key => Boolean(process.env[key]));
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    setSession(res, '', 0);
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST' && req.method !== 'PUT') return json(res, 405, { error: 'Método no permitido' });
  if (!configured()) return json(res, 503, { error: 'Panel no configurado' });
  const { email, code } = readBody(req) || {};
  if (!ownerEmail(email)) return json(res, 403, { error: 'Sin acceso al panel' });
  const normalizedEmail = process.env.MEASUREMENT_OWNER_EMAIL;

  if (req.method === 'POST') {
    const now = Date.now();
    if (now - (recentRequests.get(normalizedEmail) || 0) < 60_000) return json(res, 429, { error: 'Espera un minuto antes de pedir otro código' });
    recentRequests.set(normalizedEmail, now);
    try {
      const generated = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'magiclink', email: normalizedEmail }),
        signal: AbortSignal.timeout(8000),
      });
      if (!generated.ok) throw new Error(`Supabase Auth ${generated.status}`);
      const { email_otp, verification_type } = await generated.json();
      if (!/^\d{6,8}$/.test(email_otp) || verification_type !== 'magiclink') throw new Error('Supabase Auth no devolvió un código válido');
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
      return json(res, 200, { ok: true });
    } catch (error) {
      recentRequests.delete(normalizedEmail);
      console.error('Fallo de envío de código de medición', error);
      return json(res, 503, { error: 'No se pudo enviar el código' });
    }
  }

  if (typeof code !== 'string' || !/^\d{6,8}$/.test(code)) return json(res, 400, { error: 'Código inválido' });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'magiclink', email: normalizedEmail, token: code }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json(res, 401, { error: 'Código inválido o vencido' });
    const data = await response.json();
    if (!await ownerFromToken(data.access_token)) return json(res, 403, { error: 'Sin acceso al panel' });
    setSession(res, data.access_token, Math.min(data.expires_in || 3600, 3600));
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Fallo de acceso al panel', error);
    return json(res, 503, { error: 'Acceso no disponible' });
  }
}
