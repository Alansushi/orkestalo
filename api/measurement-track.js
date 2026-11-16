import { db, json } from '../src/server/commerce.js';
import { siteForCapture, validateMeasurement } from '../src/server/measurement.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const length = Number(req.headers['content-length'] || 0);
  if (length > 12000) return json(res, 413, { error: 'Lote demasiado grande' });
  let raw = req.body;
  if (typeof raw === 'string' && raw.length <= 12000) {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const input = validateMeasurement(raw);
  if (!input) return json(res, 400, { error: 'Evento inválido' });
  try {
    const site = await siteForCapture(input.site, req.headers.origin);
    if (!site) return json(res, 403, { error: 'Sitio no autorizado' });
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    // Upsert by (site_id,event_id) makes beacon retries count once.
    await db('measurement_events', {
      method: 'POST', query: '?on_conflict=site_id,event_id',
      body: input.events.map(event => ({ ...event, site_id: site.id })),
      prefer: 'resolution=ignore-duplicates,return=minimal',
    });
    return json(res, 202, { accepted: input.events.length });
  } catch (error) {
    console.error('Fallo al registrar medición', error);
    return json(res, 503, { error: 'Medición no disponible' });
  }
}
