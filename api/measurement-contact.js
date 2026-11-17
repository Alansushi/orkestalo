import { db, json } from '../src/server/commerce.js';
import { siteForCapture } from '../src/server/measurement.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEYS = new Set(['site','submissionId','name','email','phone','channel','consent','consentVersion']);

export function validateContact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !KEYS.has(k))) return null;
  if (!/^[a-z0-9-]{3,60}$/.test(input.site || '') || !UUID.test(input.submissionId || '') || input.consent !== true) return null;
  if (typeof input.name !== 'string' || !/^[\p{L}\p{M} .'-]{1,120}$/u.test(input.name.trim())) return null;
  if (input.email && (typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254)) return null;
  if (input.phone && (typeof input.phone !== 'string' || !/^[+\d\s().-]{10,30}$/.test(input.phone))) return null;
  if (!input.email && !input.phone) return null;
  if (!['form','phone','email','whatsapp'].includes(input.channel) || typeof input.consentVersion !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(input.consentVersion)) return null;
  return { submission_id: input.submissionId, name: input.name.trim(), email: input.email?.trim() || null, phone: input.phone?.trim() || null, channel: input.channel, consent_version: input.consentVersion, consented_at: new Date().toISOString() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (Number(req.headers['content-length'] || 0) > 3000) return json(res, 413, { error: 'Solicitud demasiado grande' });
  let raw = req.body;
  if (typeof raw === 'string' && raw.length <= 3000) {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const contact = validateContact(raw);
  if (!contact) return json(res, 400, { error: 'Contacto inválido' });
  try {
    const site = await siteForCapture(raw.site, req.headers.origin);
    if (!site) return json(res, 403, { error: 'Sitio no autorizado' });
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    await db('measurement_contacts', { method: 'POST', query: '?on_conflict=site_id,submission_id', body: { site_id: site.id, ...contact }, prefer: 'resolution=ignore-duplicates,return=minimal' });
    return json(res, 202, { saved: true });
  } catch (error) {
    console.error('Fallo al guardar contacto de medición', error);
    return json(res, 503, { error: 'Contacto no disponible' });
  }
}
