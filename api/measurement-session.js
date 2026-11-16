import { json } from '../src/server/commerce.js';
import { ownerFromToken } from '../src/server/measurement.js';
import { setSession } from '../src/server/measurement-auth.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    setSession(res, '', 0);
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 200 || !email || !password) return json(res, 400, { error: 'Credenciales inválidas' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY || !process.env.MEASUREMENT_OWNER_USER_ID) return json(res, 503, { error: 'Panel no configurado' });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json(res, 401, { error: 'Credenciales inválidas' });
    const data = await response.json();
    if (!await ownerFromToken(data.access_token)) return json(res, 403, { error: 'Sin acceso al panel' });
    setSession(res, data.access_token, Math.min(data.expires_in || 3600, 3600));
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('Fallo de acceso al panel', error);
    return json(res, 503, { error: 'Acceso no disponible' });
  }
}
