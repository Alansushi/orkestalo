import test from 'node:test';
import assert from 'node:assert/strict';
import * as measurement from '../src/server/measurement.js';

const token = (aal = 'aal2') => `x.${Buffer.from(JSON.stringify({ aal, sub: 'user-1' })).toString('base64url')}.x`;

test('invited users have one site, require aal2, and lose access after revocation', async () => {
  const before = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY, owner: process.env.MEASUREMENT_OWNER_EMAIL, fetch: global.fetch };
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'secret';
  process.env.MEASUREMENT_OWNER_EMAIL = 'owner@example.test';
  global.fetch = async () => new Response(JSON.stringify({ id: 'user-1', email: 'guest@example.test', email_confirmed_at: '2026-11-27', factors: [] }), { status: 200 });
  let invited = true;
  const db = async (table, { query }) => {
    assert.equal(table, 'measurement_viewers');
    assert.match(query, /guest%40example\.test/);
    return invited ? [{ site_id: 'cami-site' }] : [];
  };
  try {
    assert.equal(typeof measurement.measurementAccessFromToken, 'function');
    assert.deepEqual(await measurement.measurementAccessFromToken(token(), { db }), { role: 'viewer', siteId: 'cami-site' });
    assert.equal(await measurement.measurementAccessFromToken(token('aal1'), { db }), null);
    invited = false;
    assert.equal(await measurement.measurementAccessFromToken(token(), { db }), null);
  } finally {
    global.fetch = before.fetch;
    for (const [key, value] of [['SUPABASE_URL', before.url], ['SUPABASE_SECRET_KEY', before.key], ['MEASUREMENT_OWNER_EMAIL', before.owner]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
