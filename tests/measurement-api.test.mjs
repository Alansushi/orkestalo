import test from 'node:test';
import assert from 'node:assert/strict';
import track from '../api/measurement-track.js';

const event = { id: 'a9e6537d-6a58-49d5-a845-eecad58957d5', session: '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b', name: 'contact_click', path: '/', channel: 'whatsapp', utm_source: 'google' };
function response() {
  return {
    headers: {}, statusCode: 0, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = JSON.parse(value); },
  };
}

test('capture resolves the site from the trusted origin and uses site-scoped deduplication', async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY, fetch: global.fetch };
  const calls = [];
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'server-secret';
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('measurement_sites')) return new Response(JSON.stringify([{ id: 'site-ana', active: true, allowed_origins: ['https://www.draanamora.com.mx'] }]), { status: 200 });
    return new Response(null, { status: 204 });
  };
  try {
    const res = response();
    await track({ method: 'POST', headers: { origin: 'https://www.draanamora.com.mx' }, body: JSON.stringify({ site: 'dra-ana-mora', events: [event] }) }, res);
    assert.equal(res.statusCode, 202);
    assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://www.draanamora.com.mx');
    const insert = calls.find(x => x.options.method === 'POST');
    assert.equal(JSON.parse(insert.options.body)[0].site_id, 'site-ana');
    assert.match(insert.url, /on_conflict=site_id,event_id/);
    assert.match(insert.options.headers.Prefer, /ignore-duplicates/);
    assert.equal(calls.every(x => x.options.headers.apikey === 'server-secret'), true);

    calls.length = 0;
    const denied = response();
    await track({ method: 'POST', headers: { origin: 'https://otro.example' }, body: JSON.stringify({ site: 'dra-ana-mora', events: [event] }) }, denied);
    assert.equal(denied.statusCode, 403);
    assert.equal(calls.some(x => x.options.method === 'POST'), false);
  } finally {
    global.fetch = previous.fetch;
    if (previous.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = previous.key;
  }
});
