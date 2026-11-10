import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const AMOUNT_MXN = 7000;
export const TERMS_VERSION = 'buen-fin-2026-v1';
export const MARKETING_CONSENT_VERSION = 'propuestas-otros-proyectos-2026-11-09-v1';
export const CAMPAIGN_START = Date.parse('2026-11-13T06:00:00Z');
export const CAMPAIGN_END = Date.parse('2026-11-18T06:00:00Z');
const SITE = 'https://www.orkestalo.com';

function checkoutSite() {
  const host = process.env.VERCEL_URL || '';
  if (process.env.VERCEL_ENV === 'preview' && /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/i.test(host)) return `https://${host}`;
  return SITE;
}

export function folio() {
  return `ORK26-${randomBytes(9).toString('hex').toUpperCase()}`;
}

export function campaignOpen(now = Date.now()) {
  return now >= CAMPAIGN_START && now < CAMPAIGN_END;
}

export function validText(value, max, min = 1) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

export function validEmail(value) {
  return validText(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validPhone(value) {
  return typeof value === 'string' && /^[+\d\s().-]{10,30}$/.test(value.trim()) && /^\d{10,15}$/.test(value.replace(/\D/g, ''));
}

export function normalizeContact(input) {
  if (!input || !validText(input.name, 120) || !validText(input.type, 60) || !validText(input.description, 4000, 15)) return null;
  if (input.marketingConsent != null && typeof input.marketingConsent !== 'boolean') return null;
  const optional = ['email', 'phone', 'budget', 'date', 'reference'];
  for (const key of optional) if (input[key] != null && typeof input[key] !== 'string') return null;
  if (input.email && !validEmail(input.email)) return null;
  if (input.phone && !validPhone(input.phone)) return null;
  if (input.marketingConsent === true && !input.email?.trim() && !input.phone?.trim()) return null;
  if (!validText(input.budget ?? '', 100, 0) || !validText(input.date ?? '', 100, 0) || !validText(input.reference ?? '', 120, 0)) return null;
  return { ...Object.fromEntries(['name', 'email', 'phone', 'type', 'description', 'budget', 'date', 'reference'].map((key) => [key, (input[key] || '').trim()])), marketingConsent: input.marketingConsent === true };
}

export function normalizeBuyer(input) {
  if (!input || !validText(input.name, 120) || !validEmail(input.email) || !validPhone(input.whatsapp) || !validText(input.business, 160) || input.accepted !== true) return null;
  if (input.marketingConsent != null && typeof input.marketingConsent !== 'boolean') return null;
  return { ...Object.fromEntries(['name', 'email', 'whatsapp', 'business'].map((key) => [key, input[key].trim()])), marketingConsent: input.marketingConsent === true };
}

export function marketingConsentRecord(accepted) {
  return { marketing_consent: accepted, marketing_consented_at: accepted ? new Date().toISOString() : null, marketing_consent_version: accepted ? MARKETING_CONSENT_VERSION : null };
}

function settings() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase no configurado');
  const url = new URL(SUPABASE_URL);
  if (url.protocol !== 'https:') throw new Error('URL de Supabase inválida');
  return { url: url.origin, key: SUPABASE_SECRET_KEY };
}

export async function db(table, { method = 'GET', query = '', body } = {}) {
  const { url, key } = settings();
  const response = await fetch(`${url}/rest/v1/${table}${query}`, {
    method,
    headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  const data = await response.json();
  return data;
}

export async function sendNotice({ subject, text, key }) {
  const token = process.env.RESEND_API_KEY;
  const from = process.env.ORKESTA_EMAIL_FROM;
  if (!token || !from) throw new Error('Correo no configurado');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ from, to: ['info@orkestalo.com'], subject, text }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Correo ${response.status}`);
}

export async function sendInquiryNotice(row) {
  const stale = new Date(Date.now() - 2 * 60_000).toISOString();
  const claim = await db('inquiries', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(row.folio)}&email_sent_at=is.null&or=(email_claimed_at.is.null,email_claimed_at.lt.${encodeURIComponent(stale)})`, body: { email_claimed_at: new Date().toISOString() } });
  if (!claim.length) return false;
  try {
    await sendNotice({ key: `inquiry-${row.folio}`, subject: `Nueva consulta ${row.folio}`, text: `Folio: ${row.folio}\nNombre: ${row.name}\nCorreo: ${row.email}\nTeléfono: ${row.phone}\nTipo: ${row.type}\nIdea: ${row.description}\nPresupuesto: ${row.budget}\nFecha: ${row.date}\nReferencia: ${row.reference}` });
    await db('inquiries', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(row.folio)}`, body: { email_sent_at: new Date().toISOString() } });
    return true;
  } catch (error) {
    await db('inquiries', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(row.folio)}`, body: { email_claimed_at: null } });
    throw error;
  }
}

export function mercadoOrderPayload(order) {
  const resultUrl = `${checkoutSite()}/pedido/?folio=${encodeURIComponent(order.folio)}`;
  return {
    type: 'online', processing_mode: 'manual', capture_mode: 'automatic_async',
    total_amount: `${AMOUNT_MXN}.00`, external_reference: order.folio,
    description: 'Sitio web Orkesta Buen Fin 2026',
    payer: { email: order.email },
    items: [{ title: 'Sitio web de una página, hasta cinco secciones', quantity: 1, unit_price: `${AMOUNT_MXN}.00` }],
    config: { online: { success_url: resultUrl, failure_url: resultUrl, pending_url: resultUrl, auto_return: 'all' } },
  };
}

export function validCheckoutUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['mercadopago.com', 'mercadopago.com.mx'].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

export function paymentIdempotencyKey() { return randomUUID(); }

export async function mercado(path, { method = 'GET', body, idempotencyKey } = {}) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('Mercado Pago no configurado');
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Mercado Pago ${response.status}`);
  return response.json();
}

export function verifyMercadoSignature({ signature, requestId, dataId, secret }) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const ts = signature.match(/(?:^|,)ts=(\d+)/)?.[1];
  const digest = signature.match(/(?:^|,)v1=([a-f\d]{64})(?:,|$)/i)?.[1];
  if (!ts || !digest) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(expected, Buffer.from(digest, 'hex'));
}

export function paymentState(mp) {
  if (mp.status === 'processed' && mp.status_detail === 'accredited') return 'approved';
  if (['failed', 'cancelled', 'canceled', 'expired'].includes(mp.status)) return 'rejected';
  return 'pending';
}

export async function reconcile(mpId) {
  if (!/^ORD[A-Z0-9_-]{8,80}$/i.test(mpId)) throw new Error('ID de orden inválido');
  const mp = await mercado(`/v1/orders/${encodeURIComponent(mpId)}`);
  const rows = await db('orders', { query: `?mp_order_id=eq.${encodeURIComponent(mpId)}&select=*` });
  const order = rows[0];
  if (!order || mp.id !== mpId || mp.external_reference !== order.folio || Number(mp.total_amount) !== AMOUNT_MXN || mp.currency !== 'MXN') throw new Error('Orden de Mercado Pago no coincide');
  const status = paymentState(mp);
  let noticeFailed = false;
  if (order.status !== 'approved' && order.status !== status) {
    await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(order.folio)}`, body: { status, mp_status_detail: String(mp.status_detail || '').slice(0, 100) } });
  }
  if (status === 'approved' && !order.email_sent_at) {
    const stale = new Date(Date.now() - 2 * 60_000).toISOString();
    const claim = await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(order.folio)}&email_sent_at=is.null&or=(email_claimed_at.is.null,email_claimed_at.lt.${encodeURIComponent(stale)})`, body: { email_claimed_at: new Date().toISOString() } });
    if (claim.length) {
      try {
        await sendNotice({ key: `order-approved-${order.folio}`, subject: `Pago aprobado ${order.folio}`, text: `Folio: ${order.folio}\nImporte: $${AMOUNT_MXN} MXN\nNombre: ${order.name}\nCorreo: ${order.email}\nWhatsApp: ${order.whatsapp}\nNegocio: ${order.business}` });
        await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(order.folio)}`, body: { email_sent_at: new Date().toISOString() } });
      } catch (error) {
        await db('orders', { method: 'PATCH', query: `?folio=eq.${encodeURIComponent(order.folio)}`, body: { email_claimed_at: null } });
        console.error('Pago aprobado; falló el aviso por correo', error);
        noticeFailed = true;
      }
    }
  }
  return { folio: order.folio, status: order.status === 'approved' ? 'approved' : status, noticeFailed };
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function readBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string' && req.body.length < 12000) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}
