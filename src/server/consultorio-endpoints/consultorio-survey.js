import { createHash } from 'node:crypto';
import { db, json, readBody } from '../commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const input = readBody(req) || {};
  if (!/^[a-f\d]{64}$/i.test(input.token || '') || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5 || typeof input.comment !== 'string' || input.comment.length > 1000) return json(res, 400, { error: 'Respuesta inválida' });
  try {
    const hash = createHash('sha256').update(input.token).digest('hex');
    const rows = await db('clinic_surveys', { method: 'PATCH', query: `?token_hash=eq.${hash}&responded_at=is.null`, body: { rating: input.rating, comment: input.comment.trim(), responded_at: new Date().toISOString() } });
    return json(res, rows.length ? 200 : 404, { ok: !!rows.length });
  } catch (error) { console.error('Encuesta', error); return json(res, 503, { error: 'Encuesta no disponible' }); }
}
