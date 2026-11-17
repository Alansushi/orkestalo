import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import conversion from '../api/measurement-conversion.js';

function response() { return { statusCode: 0, body: null, setHeader() {}, end(value) { this.body = JSON.parse(value); } }; }
const input = { site: 'dra-ana-mora', reference: '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b', event: 'payment_approved', key: 'a'.repeat(64) };
test('forged signatures never query or write conversions; valid duplicates use one site key', async () => {
  const old = { fetch: global.fetch, url: process.env.SUPABASE_URL, db: process.env.SUPABASE_SECRET_KEY, secret: process.env.MEASUREMENT_ANA_SECRET };
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'db-secret';
  process.env.MEASUREMENT_ANA_SECRET = 'shared-secret';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('measurement_sites')) return new Response(JSON.stringify([{ id: 'site-ana', active: true }]), { status: 200 });
    if (String(url).includes('measurement_events')) return new Response(JSON.stringify([{ event_id: 'visit' }]), { status: 200 });
    return new Response(null, { status: 204 });
  };
  try {
    const raw = JSON.stringify(input);
    const timestamp = String(Date.now());
    const nonce = 'b'.repeat(32);
    const req = { method: 'POST', body: raw, headers: { 'x-measurement-timestamp': timestamp, 'x-measurement-nonce': nonce, 'x-measurement-signature': '0'.repeat(64) } };
    const denied = response();
    await conversion(req, denied);
    assert.equal(denied.statusCode, 401);
    assert.equal(calls.length, 0);
    req.headers['x-measurement-signature'] = createHmac('sha256', 'shared-secret').update(`${timestamp}.${nonce}.${raw}`).digest('hex');
    const accepted = response();
    await conversion(req, accepted);
    assert.equal(accepted.statusCode, 202);
    const insert = calls.find(x => x.url.includes('measurement_conversions'));
    assert.equal(JSON.parse(insert.options.body).key, input.key);
    assert.equal(JSON.parse(insert.options.body).site_id, 'site-ana');
    assert.match(insert.url, /on_conflict=site_id,event,key/);
  } finally {
    global.fetch = old.fetch;
    for (const [name, value] of [['SUPABASE_URL',old.url],['SUPABASE_SECRET_KEY',old.db],['MEASUREMENT_ANA_SECRET',old.secret]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
