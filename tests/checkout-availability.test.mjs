import assert from 'node:assert/strict';
import test from 'node:test';
import availability from '../api/checkout-availability.js';

function response() {
  return { setHeader() {}, end(raw) { this.body = JSON.parse(raw); } };
}

test('availability follows the Mexico City purchase window and configuration', async () => {
  const oldNow = Date.now;
  const oldFlag = process.env.ORKESTA_CHECKOUT_ENABLED;
  const oldToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const oldDb = process.env.SUPABASE_SECRET_KEY;
  const oldUrl = process.env.SUPABASE_URL;
  const oldWebhook = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const oldResend = process.env.RESEND_API_KEY;
  const oldFrom = process.env.ORKESTA_EMAIL_FROM;
  Object.assign(process.env, { ORKESTA_CHECKOUT_ENABLED: '1', MERCADO_PAGO_ACCESS_TOKEN: 'test', SUPABASE_SECRET_KEY: 'test', SUPABASE_URL: 'https://db.example.com', MERCADO_PAGO_WEBHOOK_SECRET: 'test', RESEND_API_KEY: 'test', ORKESTA_EMAIL_FROM: 'test@example.com' });
  try {
    for (const [date, expected] of [['2026-11-13T05:59:59Z', false], ['2026-11-13T06:00:00Z', true], ['2026-11-18T05:59:59Z', true], ['2026-11-18T06:00:00Z', false]]) {
      Date.now = () => Date.parse(date);
      const res = response();
      await availability({ method: 'GET' }, res);
      assert.equal(res.body.available, expected, date);
    }
    Date.now = () => Date.parse('2026-11-13T06:00:00Z');
    process.env.ORKESTA_CHECKOUT_ENABLED = '0';
    const paused = response();
    await availability({ method: 'GET' }, paused);
    assert.equal(paused.body.available, false);
  } finally {
    Date.now = oldNow;
    for (const [key, value] of Object.entries({ ORKESTA_CHECKOUT_ENABLED: oldFlag, MERCADO_PAGO_ACCESS_TOKEN: oldToken, SUPABASE_SECRET_KEY: oldDb, SUPABASE_URL: oldUrl, MERCADO_PAGO_WEBHOOK_SECRET: oldWebhook, RESEND_API_KEY: oldResend, ORKESTA_EMAIL_FROM: oldFrom })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
