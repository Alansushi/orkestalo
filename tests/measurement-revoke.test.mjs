import test from 'node:test';
import assert from 'node:assert/strict';
import revoke from '../api/measurement-revoke.js';

function response() { return { statusCode: 0, headers: {}, body: null, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = JSON.parse(value); } }; }

test('withdrawal revokes and deletes only the matching anonymous site reference', async () => {
  const old = { fetch: global.fetch, url: process.env.SUPABASE_URL, db: process.env.SUPABASE_SECRET_KEY };
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'db-secret';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('measurement_sites')) return new Response(JSON.stringify([{ id: 'site-ana', slug: 'dra-ana-mora', active: false, allowed_origins: ['https://www.draanamora.com.mx'] }]), { status: 200 });
    return new Response(null, { status: 204 });
  };
  try {
    const body = JSON.stringify({ site: 'dra-ana-mora', reference: '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b' });
    const denied = response();
    await revoke({ method: 'POST', body, headers: { origin: 'https://evil.example' } }, denied);
    assert.equal(denied.statusCode, 403);
    assert.equal(calls.filter(x => x.options.method !== 'GET').length, 0);
    const accepted = response();
    await revoke({ method: 'POST', body, headers: { origin: 'https://www.draanamora.com.mx' } }, accepted);
    assert.equal(accepted.statusCode, 202);
    assert.equal(accepted.headers['Access-Control-Allow-Origin'], 'https://www.draanamora.com.mx');
    assert.deepEqual(calls.filter(x => x.options.method !== 'GET').map(x => x.options.method).sort(), ['DELETE', 'DELETE', 'POST']);
    assert.ok(calls.filter(x => x.options.method === 'DELETE').every(x => x.url.includes('attribution_ref=eq.90c3be77-45f2-4c9b-a8cb-4b12c6c9655b')));
  } finally {
    global.fetch = old.fetch;
    for (const [key, value] of [['SUPABASE_URL', old.url], ['SUPABASE_SECRET_KEY', old.db]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
