import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import contact from '../api/contact.js';
import checkout from '../api/checkout.js';
import webhook from '../api/mercado-pago-webhook.js';
import orderStatus from '../api/order-status.js';
import retryNotices from '../api/retry-notices.js';
import { CAMPAIGN_END, CAMPAIGN_START, campaignOpen, db, normalizeBuyer, validCheckoutUrl, verifyMercadoSignature } from '../src/server/commerce.js';

function response() {
  return { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = JSON.parse(value); } };
}

function fakeServices({ failDb = false, failEmail = false, mpStatus = 'created', mpDetail = 'created' } = {}) {
  const inquiries = new Map();
  const orders = new Map();
  const emails = [];
  const mpPosts = [];
  const mpId = 'ORDTEST123456';
  const fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.hostname === 'db.example.supabase.co') {
      if (failDb) return Response.json({ message: 'unavailable' }, { status: 503 });
      const table = parsed.pathname.split('/').at(-1);
      const map = table === 'orders' ? orders : inquiries;
      if (options.method === 'POST') {
        const row = JSON.parse(options.body);
        map.set(row.folio, row);
        return Response.json([row]);
      }
      if (options.method === 'PATCH') {
        const reference = parsed.searchParams.get('folio').slice(3);
        const row = map.get(reference);
        if (!row || (parsed.searchParams.has('email_sent_at') && row.email_sent_at) || (parsed.searchParams.has('or') && row.email_claimed_at)) return Response.json([]);
        Object.assign(row, JSON.parse(options.body));
        return Response.json([row]);
      }
      if (parsed.searchParams.has('email_sent_at')) return Response.json([...map.values()].filter((row) => !row.email_sent_at && (!parsed.searchParams.has('status') || row.status === parsed.searchParams.get('status').slice(3))));
      const field = parsed.searchParams.has('mp_order_id') ? 'mp_order_id' : 'folio';
      const value = parsed.searchParams.get(field).slice(3);
      return Response.json([...map.values()].filter((row) => row[field] === value));
    }
    if (parsed.hostname === 'api.mercadopago.com') {
      if (options.method === 'POST') {
        const payload = JSON.parse(options.body);
        mpPosts.push(payload);
        return Response.json({ id: mpId, external_reference: payload.external_reference, total_amount: payload.total_amount, currency: 'MXN', checkout_url: `https://www.mercadopago.com.mx/checkout/v1/redirect?order_id=${mpId}` });
      }
      const order = [...orders.values()].find((row) => row.mp_order_id === mpId);
      return Response.json({ id: mpId, external_reference: order.folio, total_amount: '7000.00', currency: 'MXN', status: mpStatus, status_detail: mpDetail });
    }
    if (parsed.hostname === 'api.resend.com') {
      if (failEmail) return Response.json({}, { status: 503 });
      emails.push(JSON.parse(options.body));
      return Response.json({ id: 'email-1' });
    }
    throw new Error(`Unexpected request ${url}`);
  };
  return { fetch, inquiries, orders, emails, mpPosts, mpId, setPayment(status, detail) { mpStatus = status; mpDetail = detail; }, setEmailFailure(value) { failEmail = value; } };
}

async function withServices(services, fn) {
  const previousFetch = globalThis.fetch;
  const previousNow = Date.now;
  const previousEnv = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET', 'RESEND_API_KEY', 'ORKESTA_EMAIL_FROM', 'ORKESTA_CHECKOUT_ENABLED', 'CRON_SECRET'].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { SUPABASE_URL: 'https://db.example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test', MERCADO_PAGO_ACCESS_TOKEN: 'mp-token', MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret', RESEND_API_KEY: 'mail-token', ORKESTA_EMAIL_FROM: 'Orkesta <avisos@orkestalo.com>', ORKESTA_CHECKOUT_ENABLED: '1', CRON_SECRET: 'cron-secret' });
  globalThis.fetch = services.fetch;
  Date.now = () => CAMPAIGN_START + 60_000;
  try { await fn(); } finally {
    globalThis.fetch = previousFetch;
    Date.now = previousNow;
    for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
}

const buyer = { name: 'Ana López', email: 'ana@example.com', whatsapp: '+52 55 1234 5678', business: 'Café Ana', accepted: true };

test('Supabase secret key is sent only as apikey for Data API requests', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  const previousLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://db.example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://db.example.supabase.co/rest/v1/inquiries?select=folio');
    assert.equal(options.headers.apikey, 'sb_secret_test');
    assert.equal(options.headers.Authorization, undefined);
    return Response.json([{ folio: 'ORK26-1234567890ABCDEF12' }]);
  };
  try {
    assert.deepEqual(await db('inquiries', { query: '?select=folio' }), [{ folio: 'ORK26-1234567890ABCDEF12' }]);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries({ SUPABASE_URL: previousUrl, SUPABASE_SECRET_KEY: previousSecret, SUPABASE_SERVICE_ROLE_KEY: previousLegacy })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('purchase window and buyer consent are enforced', () => {
  assert.equal(campaignOpen(CAMPAIGN_START - 1), false);
  assert.equal(campaignOpen(CAMPAIGN_START), true);
  assert.equal(campaignOpen(CAMPAIGN_END), false);
  assert.equal(normalizeBuyer({ ...buyer, accepted: false }), null);
  assert.equal(validCheckoutUrl('https://www.mercadopago.com.mx/checkout/test'), true);
  assert.equal(validCheckoutUrl('https://evilmercadopago.com.mx/checkout/test'), false);
});

test('contact is stored before email; email failure still leaves a folio', async () => {
  const services = fakeServices({ failEmail: true });
  await withServices(services, async () => {
    const res = response();
    await contact({ method: 'POST', body: { name: 'Ana', email: 'ana@example.com', type: 'sitio-web', description: 'Quiero un sitio para mi negocio.' } }, res);
    assert.equal(res.statusCode, 201);
    assert.match(res.body.folio, /^ORK26-[A-F0-9]{18}$/);
    assert.equal(res.body.emailSent, false);
    assert.equal(services.inquiries.get(res.body.folio).email, 'ana@example.com');
  });
});

test('database outage prevents Mercado Pago checkout', async () => {
  const services = fakeServices({ failDb: true });
  await withServices(services, async () => {
    const res = response();
    await checkout({ method: 'POST', body: buyer }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(services.mpPosts.length, 0);
  });
});

test('checkout stays disabled until legal and coupon checks are approved', async () => {
  const services = fakeServices();
  await withServices(services, async () => {
    process.env.ORKESTA_CHECKOUT_ENABLED = '0';
    const res = response();
    await checkout({ method: 'POST', body: buyer }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(services.orders.size, 0);
    assert.equal(services.mpPosts.length, 0);
  });
});

test('checkout uses saved folio; pending, approval, duplicate and rejection are reconciled', async () => {
  const services = fakeServices();
  await withServices(services, async () => {
    const created = response();
    await checkout({ method: 'POST', body: buyer }, created);
    assert.equal(created.statusCode, 201);
    const reference = created.body.folio;
    assert.equal(services.orders.get(reference).mp_order_id, services.mpId);
    assert.equal(services.orders.get(reference).terms_version, 'buen-fin-2026-v1');
    assert.equal(services.mpPosts[0].external_reference, reference);
    assert.equal(services.mpPosts[0].total_amount, '7000.00');
    assert.equal(services.mpPosts[0].config.online.success_url, `https://www.orkestalo.com/pedido/?folio=${reference}`);
    const status = response();
    await orderStatus({ method: 'GET', url: `/api/order-status?folio=${reference}` }, status);
    assert.equal(status.body.status, 'pending');
    services.setPayment('processed', 'accredited');
    const query = `?type=order&data.id=${services.mpId}`;
    const requestId = 'test-request';
    const ts = String(Date.now());
    const digest = createHmac('sha256', 'webhook-secret').update(`id:${services.mpId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');
    const req = { method: 'POST', url: `/api/mercado-pago-webhook${query}`, headers: { 'x-signature': `ts=${ts},v1=${digest}`, 'x-request-id': requestId } };
    const first = response();
    await webhook(req, first);
    assert.equal(first.statusCode, 200);
    assert.equal(services.orders.get(reference).status, 'approved');
    assert.equal(services.emails.length, 1);
    const repeat = response();
    await webhook(req, repeat);
    assert.equal(repeat.statusCode, 200);
    assert.equal(services.emails.length, 1);
    services.setPayment('failed', 'rejected');
    const after = response();
    await orderStatus({ method: 'GET', url: `/api/order-status?folio=${reference}` }, after);
    assert.equal(after.body.status, 'approved');
    assert.equal(services.orders.get(reference).status, 'approved');
  });
});

test('invalid webhook signatures are rejected before any lookup', async () => {
  const services = fakeServices();
  await withServices(services, async () => {
    const res = response();
    await webhook({ method: 'POST', url: '/api/mercado-pago-webhook?type=order&data.id=ORDTEST123456', headers: { 'x-signature': 'bad', 'x-request-id': 'x' } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(services.emails.length, 0);
  });
  assert.equal(verifyMercadoSignature({ signature: 'bad', requestId: 'x', dataId: 'ORDTEST123456', secret: 'secret' }), false);
});

test('rejected payment is recorded without approval notice', async () => {
  const services = fakeServices({ mpStatus: 'failed', mpDetail: 'rejected' });
  await withServices(services, async () => {
    const created = response();
    await checkout({ method: 'POST', body: buyer }, created);
    const checked = response();
    await orderStatus({ method: 'GET', url: `/api/order-status?folio=${created.body.folio}` }, checked);
    assert.equal(checked.body.status, 'rejected');
    assert.equal(services.orders.get(created.body.folio).status, 'rejected');
    assert.equal(services.emails.length, 0);
  });
});

test('a failed checkout is not shown as a pending payment', async () => {
  const services = fakeServices();
  await withServices(services, async () => {
    const reference = 'ORK26-1234567890ABCDEF12';
    services.orders.set(reference, { folio: reference, status: 'checkout_error' });
    const checked = response();
    await orderStatus({ method: 'GET', url: `/api/order-status?folio=${reference}` }, checked);
    assert.equal(checked.statusCode, 200);
    assert.equal(checked.body.status, 'checkout_error');
  });
});

test('approved payment remains visible if email fails and can retry later', async () => {
  const services = fakeServices({ failEmail: true, mpStatus: 'processed', mpDetail: 'accredited' });
  await withServices(services, async () => {
    const created = response();
    await checkout({ method: 'POST', body: buyer }, created);
    const checked = response();
    await orderStatus({ method: 'GET', url: `/api/order-status?folio=${created.body.folio}` }, checked);
    assert.equal(checked.statusCode, 200);
    assert.equal(checked.body.status, 'approved');
    assert.equal(services.orders.get(created.body.folio).email_claimed_at, null);
    assert.equal(services.orders.get(created.body.folio).email_sent_at, undefined);
  });
});

test('daily retry sends saved inquiry after an email outage and requires a secret', async () => {
  const services = fakeServices({ failEmail: true });
  await withServices(services, async () => {
    const created = response();
    await contact({ method: 'POST', body: { name: 'Ana', type: 'sitio-web', description: 'Quiero un sitio para mi negocio.' } }, created);
    assert.equal(created.body.emailSent, false);
    const denied = response();
    await retryNotices({ method: 'GET', headers: { authorization: 'Bearer wrong' } }, denied);
    assert.equal(denied.statusCode, 401);
    services.setEmailFailure(false);
    const retried = response();
    await retryNotices({ method: 'GET', headers: { authorization: 'Bearer cron-secret' } }, retried);
    assert.equal(retried.statusCode, 200);
    assert.equal(retried.body.sent, 1);
    assert.equal(services.inquiries.get(created.body.folio).email_sent_at !== undefined, true);
    assert.equal(services.emails.length, 1);
  });
});
