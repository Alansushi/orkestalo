import { db, json } from '../src/server/commerce.js';
import { siteForCapture } from '../src/server/measurement.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  let raw;
  try { raw = typeof req.body === 'string' && req.body.length < 500 ? JSON.parse(req.body) : req.body; } catch { raw = null; }
  if (!raw || Object.keys(raw).sort().join(',') !== 'reference,site' || !UUID.test(raw.reference || '') || !/^[a-z0-9-]{3,60}$/.test(raw.site || '')) return json(res, 400, { error: 'Referencia inválida' });
  try {
    const site = await siteForCapture(raw.site, req.headers.origin, false);
    if (!site) return json(res, 403, { error: 'Sitio no autorizado' });
    await db('measurement_revocations', { method: 'POST', query: '?on_conflict=site_id,attribution_ref', body: { site_id: site.id, attribution_ref: raw.reference }, prefer: 'resolution=ignore-duplicates,return=minimal' });
    await Promise.all([
      db('measurement_conversions', { method: 'DELETE', query: `?site_id=eq.${site.id}&attribution_ref=eq.${raw.reference}`, prefer: 'return=minimal' }),
      db('measurement_events', { method: 'DELETE', query: `?site_id=eq.${site.id}&attribution_ref=eq.${raw.reference}`, prefer: 'return=minimal' }),
    ]);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    return json(res, 202, { revoked: true });
  } catch (error) {
    console.error('Fallo de revocación de medición', error);
    return json(res, 503, { error: 'Medición no disponible' });
  }
}
