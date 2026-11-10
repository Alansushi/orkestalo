import { AMOUNT_MXN, TERMS_VERSION, campaignOpen, db, folio, json, marketingConsentRecord, mercado, mercadoOrderPayload, normalizeBuyer, paymentIdempotencyKey, readBody, validCheckoutUrl } from '../src/server/commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!campaignOpen()) return json(res, 403, { error: 'La compra está disponible del 13 al 17 de noviembre de 2026.' });
  const buyer = normalizeBuyer(readBody(req));
  if (!buyer) return json(res, 400, { error: 'Revisa tus datos, acepta los términos y autoriza la comunicación de datos del pedido.' });
  if (process.env.ORKESTA_CHECKOUT_ENABLED !== '1' || !process.env.MERCADO_PAGO_ACCESS_TOKEN || !process.env.MERCADO_PAGO_WEBHOOK_SECRET || !process.env.RESEND_API_KEY || !process.env.ORKESTA_EMAIL_FROM) return json(res, 503, { error: 'La compra no está disponible en este momento.' });
  const reference = folio();
  try {
    const { marketingConsent, ...order } = buyer;
    const saved = await db('orders', { method: 'POST', body: { folio: reference, ...order, ...marketingConsentRecord(marketingConsent), amount_mxn: AMOUNT_MXN, terms_version: TERMS_VERSION, accepted_terms_at: new Date().toISOString(), status: 'created' } });
    if (saved.length !== 1) throw new Error('El pedido no se confirmó');
  } catch (error) {
    console.error('No se pudo registrar el pedido', error);
    return json(res, 503, { error: 'No pudimos registrar el pedido. No se inició ningún pago.' });
  }
  try {
    const mp = await mercado('/v1/orders', { method: 'POST', idempotencyKey: paymentIdempotencyKey(), body: mercadoOrderPayload({ folio: reference, email: buyer.email }) });
    if (!/^ORD[A-Z0-9_-]{8,80}$/i.test(mp.id || '') || !validCheckoutUrl(mp.checkout_url) || mp.external_reference !== reference || Number(mp.total_amount) !== AMOUNT_MXN || mp.currency !== 'MXN') throw new Error('Respuesta de Checkout Pro inválida');
    const updated = await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(reference)}`, body: { mp_order_id: mp.id, status: 'pending' } });
    if (updated.length !== 1) throw new Error('No se confirmó el folio de pago');
    return json(res, 201, { folio: reference, checkoutUrl: mp.checkout_url });
  } catch (error) {
    console.error('No se pudo iniciar Checkout Pro', error);
    try { await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(reference)}`, body: { status: 'checkout_error' } }); } catch (updateError) { console.error('No se pudo actualizar el pedido', updateError); }
    return json(res, 503, { folio: reference, error: 'No pudimos iniciar el pago. Escríbenos con tu folio.' });
  }
}
