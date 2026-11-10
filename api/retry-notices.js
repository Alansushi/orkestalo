import { timingSafeEqual } from 'node:crypto';
import { db, json, reconcile, sendInquiryNotice } from '../src/server/commerce.js';

function authorized(value, secret) {
  if (!secret || !value?.startsWith('Bearer ')) return false;
  const given = Buffer.from(value.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  if (!authorized(req.headers.authorization, process.env.CRON_SECRET)) return json(res, 401, { error: 'No autorizado' });
  let sent = 0;
  let failed = 0;
  try {
    const inquiries = await db('inquiries', { query: '?email_sent_at=is.null&select=*&order=created_at.asc&limit=100' });
    for (const inquiry of inquiries) {
      try { if (await sendInquiryNotice(inquiry)) sent++; } catch (error) { failed++; console.error('No se pudo reintentar el aviso de consulta', error); }
    }
    const orders = await db('orders', { query: '?status=eq.approved&email_sent_at=is.null&select=mp_order_id&limit=50' });
    for (const order of orders) {
      try { if ((await reconcile(order.mp_order_id)).noticeFailed) failed++; else sent++; } catch (error) { failed++; console.error('No se pudo reintentar el aviso de pedido', error); }
    }
    return json(res, failed ? 503 : 200, { sent, failed });
  } catch (error) {
    console.error('No se pudieron buscar avisos pendientes', error);
    return json(res, 503, { error: 'No se pudieron procesar avisos pendientes' });
  }
}
