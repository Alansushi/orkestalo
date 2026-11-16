import test from 'node:test';
import assert from 'node:assert/strict';
import dashboard from '../api/measurement-dashboard.js';

function response() {
  return { statusCode: 0, headers: {}, setHeader(k,v){ this.headers[k]=v; }, end(value){ this.body=JSON.parse(value); } };
}

test('private dashboard denies requests without the owner session before querying data', async () => {
  const original = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('unexpected fetch'); };
  try {
    const res = response();
    await dashboard({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(calls, 0);
  } finally { global.fetch = original; }
});

test('private dashboard rejects a token belonging to another email', async () => {
  const original = { fetch: global.fetch, owner: process.env.MEASUREMENT_OWNER_EMAIL, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
  process.env.MEASUREMENT_OWNER_EMAIL = 'owner@example.com';
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'server-secret';
  let requests = [];
  global.fetch = async url => { requests.push(String(url)); return new Response(JSON.stringify({ email: 'other@example.com', email_confirmed_at: '2026-11-15T00:00:00Z' }), { status: 200 }); };
  try {
    const res = response();
    await dashboard({ method: 'GET', headers: { cookie: 'orkesta_measurement_session=valid-token' } }, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(requests, ['https://db.example.test/auth/v1/user']);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_OWNER_EMAIL',original.owner],['SUPABASE_URL',original.url],['SUPABASE_SECRET_KEY',original.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('private dashboard rejects the owner email before confirmation', async () => {
  const original = { fetch: global.fetch, owner: process.env.MEASUREMENT_OWNER_EMAIL, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
  process.env.MEASUREMENT_OWNER_EMAIL = 'owner@example.com';
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'server-secret';
  global.fetch = async () => new Response(JSON.stringify({ email: 'owner@example.com', email_confirmed_at: null }), { status: 200 });
  try {
    const res = response();
    await dashboard({ method: 'GET', headers: { cookie: 'orkesta_measurement_session=valid-token' } }, res);
    assert.equal(res.statusCode, 401);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_OWNER_EMAIL',original.owner],['SUPABASE_URL',original.url],['SUPABASE_SECRET_KEY',original.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
