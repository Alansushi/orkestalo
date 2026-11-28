import { db, json, readBody } from '../src/server/commerce.js';
import { readSession } from '../src/server/measurement-auth.js';
import { measurementAccessFromToken } from '../src/server/measurement.js';
import { loadMeasurementDashboard } from '../src/server/measurement-dashboard-data.js';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Método no permitido' });
  try {
    const access = await measurementAccessFromToken(readSession(req));
    if (!access) return json(res, 401, { error: 'Acceso requerido' });
    if (req.method === 'GET') {
      const dataset = await loadMeasurementDashboard({ siteId: access.siteId });
      const viewers = access.role === 'owner' ? await db('measurement_viewers', { query: '?select=email,site_id,invited_at&order=invited_at.desc&limit=1000' }) : undefined;
      return json(res, 200, { ...dataset, role: access.role, ...(viewers ? { viewers } : {}) });
    }
    if (access.role !== 'owner') return json(res, 403, { error: 'Sin permiso para administrar accesos' });
    if (req.headers.origin && req.headers.origin !== 'https://www.orkestalo.com') return json(res, 403, { error: 'Origen no permitido' });
    const body = readBody(req);
    const email = body?.email?.trim().toLowerCase();
    if (!body || Object.keys(body).some(key => !['email', 'siteId'].includes(key)) || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || email === process.env.MEASUREMENT_OWNER_EMAIL?.toLowerCase()) return json(res, 400, { error: 'Correo inválido' });
    if (req.method === 'DELETE') {
      await db('measurement_viewers', { method: 'DELETE', query: `?email=eq.${encodeURIComponent(email)}`, prefer: 'return=minimal' });
      return json(res, 200, { ok: true });
    }
    if (typeof body.siteId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.siteId)) return json(res, 400, { error: 'Sitio inválido' });
    const [site] = await db('measurement_sites', { query: `?id=eq.${encodeURIComponent(body.siteId)}&slug=eq.engranes-cami&select=id,name,active,privacy_notice_url&limit=1` });
    if (!site) return json(res, 400, { error: 'Sitio inválido' });
    if (!site.active || !site.privacy_notice_url) return json(res, 409, { error: 'La medición de CAMI aún no está activada' });
    const created = await db('measurement_viewers', { method: 'POST', query: '?on_conflict=email', body: { site_id: site.id, email }, prefer: 'resolution=ignore-duplicates,return=representation' });
    if (!created.length) return json(res, 409, { error: 'El correo ya tiene una invitación' });
    try {
      const mailed = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.ORKESTA_EMAIL_FROM, to: [email], subject: `Invitación al panel de ${site.name}`,
          text: `Te invitaron a consultar el panel privado de ${site.name}. Entra a https://www.orkestalo.com/medicion/ y solicita tu código de acceso. También necesitarás una aplicación de autenticación.` }),
        signal: AbortSignal.timeout(8000) });
      if (!mailed.ok) throw new Error(`Correo ${mailed.status}`);
    } catch (error) {
      await db('measurement_viewers', { method: 'DELETE', query: `?email=eq.${encodeURIComponent(email)}`, prefer: 'return=minimal' });
      throw error;
    }
    return json(res, 201, { ok: true });
  } catch (error) {
    console.error('Fallo del panel de medición', error);
    return json(res, 503, { error: 'Panel no disponible' });
  }
}
