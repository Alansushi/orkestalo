import { json, reconcile, verifyMercadoSignature } from '../src/server/commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const url = new URL(req.url, 'https://www.orkestalo.com');
  const dataId = url.searchParams.get('data.id');
  if (url.searchParams.get('type') !== 'order' || !verifyMercadoSignature({ signature: req.headers['x-signature'], requestId: req.headers['x-request-id'], dataId, secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET })) return json(res, 401, { error: 'Notificación inválida' });
  try {
    const result = await reconcile(dataId);
    if (result.noticeFailed) return json(res, 503, { error: 'Intenta de nuevo.' });
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error('No se pudo procesar el webhook', error);
    return json(res, 503, { error: 'Intenta de nuevo.' });
  }
}
