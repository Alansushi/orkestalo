import { db, json, reconcile } from '../src/server/commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  const reference = new URL(req.url, 'https://www.orkestalo.com').searchParams.get('folio');
  if (!/^ORK26-[A-F0-9]{18}$/.test(reference || '')) return json(res, 400, { error: 'Folio inválido' });
  try {
    const rows = await db('orders', { query: `?folio=eq.${encodeURIComponent(reference)}&select=folio,status,mp_order_id` });
    const order = rows[0];
    if (!order) return json(res, 404, { error: 'Folio no encontrado' });
    if (!order.mp_order_id) return json(res, 200, { folio: reference, status: order.status === 'checkout_error' ? 'checkout_error' : 'pending' });
    const result = await reconcile(order.mp_order_id);
    return json(res, 200, { folio: result.folio, status: result.status });
  } catch (error) {
    console.error('No se pudo consultar el pedido', error);
    return json(res, 503, { error: 'No pudimos verificar el pago todavía.' });
  }
}
