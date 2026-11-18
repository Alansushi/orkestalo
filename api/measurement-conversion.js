import { db, json } from '../src/server/commerce.js';
import { validateConversion, verifyConversionSignature } from '../src/server/measurement-conversion.js';

const SECRETS = { 'dra-ana-mora': 'MEASUREMENT_ANA_SECRET', 'dra-fernanda-suaste': 'MEASUREMENT_FERNANDA_SECRET' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (raw.length > 1000) return json(res, 413, { error: 'Solicitud demasiado grande' });
  let input;
  try { input = validateConversion(JSON.parse(raw)); } catch { input = null; }
  if (!input) return json(res, 400, { error: 'Conversión inválida' });
  const secret = process.env[SECRETS[input.site]];
  const headers = { timestamp: req.headers['x-measurement-timestamp'], nonce: req.headers['x-measurement-nonce'], signature: req.headers['x-measurement-signature'] };
  if (!verifyConversionSignature(raw, headers, secret)) return json(res, 401, { error: 'Firma inválida' });
  try {
    const sites = await db('measurement_sites', { query: `?slug=eq.${input.site}&select=id,active&limit=1` });
    if (!sites[0]?.active) return json(res, 403, { error: 'Sitio inactivo' });
    let reference = input.reference;
    if (input.event !== 'booking_created') {
      const booking = await db('measurement_conversions', { query: `?site_id=eq.${sites[0].id}&event=eq.booking_created&key=eq.${input.booking_key}&select=attribution_ref&limit=1` });
      reference = booking[0]?.attribution_ref;
      if (!reference) return json(res, 202, { accepted: false });
    }
    await db('measurement_conversions', { method: 'POST', query: '?on_conflict=site_id,event,key', body: { site_id: sites[0].id, attribution_ref: reference, event: input.event, key: input.key, nonce: headers.nonce }, prefer: 'resolution=ignore-duplicates,return=minimal' });
    // The dashboard joins only to a consented page view. Recording first avoids
    // losing a real conversion when the browser beacon arrives after this call.
    return json(res, 202, { accepted: true });
  } catch (error) {
    console.error('Fallo de conversión', error);
    return json(res, 503, { error: 'Medición no disponible' });
  }
}
