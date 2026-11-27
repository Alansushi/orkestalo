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

test('CAMI guest dashboard filters every dataset on the server and revocation denies access', async () => {
  const original = { fetch: global.fetch, owner: process.env.MEASUREMENT_OWNER_EMAIL, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
  process.env.MEASUREMENT_OWNER_EMAIL = 'owner@example.test';
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'server-secret';
  const token = `x.${Buffer.from(JSON.stringify({ aal: 'aal2', sub: 'guest-id' })).toString('base64url')}.x`;
  let invited = true;
  const requests = [];
  global.fetch = async url => {
    const path = new URL(url).pathname;
    requests.push(String(url));
    if (path === '/auth/v1/user') return new Response(JSON.stringify({ id: 'guest-id', email: 'guest@example.test', email_confirmed_at: '2026-11-27' }));
    if (path === '/rest/v1/measurement_viewers') return Response.json(invited ? [{ site_id: 'cami-id' }] : []);
    if (path === '/rest/v1/measurement_sites') return Response.json([{ id: 'cami-id', slug: 'engranes-cami', name: 'Engranes CAMI', active: false }]);
    return Response.json([]);
  };
  try {
    const res = response();
    await dashboard({ method: 'GET', headers: { cookie: `orkesta_measurement_session=${token}` } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.role, 'viewer');
    assert.deepEqual(res.body.sites.map(site => site.slug), ['engranes-cami']);
    assert.ok(requests.filter(url => url.includes('/rest/v1/measurement_') && !url.includes('/measurement_viewers')).every(url => url.includes('site_id=eq.cami-id') || url.includes('id=eq.cami-id')));
    invited = false;
    const denied = response();
    await dashboard({ method: 'GET', headers: { cookie: `orkesta_measurement_session=${token}` } }, denied);
    assert.equal(denied.statusCode, 401);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_OWNER_EMAIL',original.owner],['SUPABASE_URL',original.url],['SUPABASE_SECRET_KEY',original.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('owner cannot invite CAMI before the notice and capture are activated', async () => {
  const original = { fetch: global.fetch, owner: process.env.MEASUREMENT_OWNER_EMAIL, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
  process.env.MEASUREMENT_OWNER_EMAIL = 'owner@example.test';
  process.env.SUPABASE_URL = 'https://db.example.test';
  process.env.SUPABASE_SECRET_KEY = 'server-secret';
  const token = `x.${Buffer.from(JSON.stringify({ aal: 'aal2', sub: 'owner-id' })).toString('base64url')}.x`;
  const siteId = '11111111-1111-4111-8111-111111111111';
  const requests = [];
  global.fetch = async url => {
    const path = new URL(url).pathname;
    requests.push(path);
    if (path === '/auth/v1/user') return Response.json({ id: 'owner-id', email: 'owner@example.test', email_confirmed_at: '2026-11-27' });
    if (path === '/rest/v1/measurement_sites') return Response.json([{ id: siteId, name: 'Engranes CAMI', active: false, privacy_notice_url: null }]);
    return Response.json([{ email: 'guest@example.test' }]);
  };
  try {
    const res = response();
    await dashboard({ method: 'POST', headers: { cookie: `orkesta_measurement_session=${token}`, origin: 'https://www.orkestalo.com' }, body: { email: 'guest@example.test', siteId } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(requests.includes('/rest/v1/measurement_viewers'), false);
    assert.equal(requests.includes('/emails'), false);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_OWNER_EMAIL',original.owner],['SUPABASE_URL',original.url],['SUPABASE_SECRET_KEY',original.key]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('owner invitation grants CAMI-only access and revocation removes it on the next request', async () => {
  const original = { fetch: global.fetch, owner: process.env.MEASUREMENT_OWNER_EMAIL, url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY, resend: process.env.RESEND_API_KEY, from: process.env.ORKESTA_EMAIL_FROM };
  Object.assign(process.env, { MEASUREMENT_OWNER_EMAIL: 'owner@example.test', SUPABASE_URL: 'https://db.example.test', SUPABASE_SECRET_KEY: 'server-secret', RESEND_API_KEY: 'mail-secret', ORKESTA_EMAIL_FROM: 'Orkesta <info@example.test>' });
  const jwt = (sub) => `x.${Buffer.from(JSON.stringify({ aal: 'aal2', sub })).toString('base64url')}.x`;
  const siteId = '11111111-1111-4111-8111-111111111111';
  let invited = false;
  const mail = [];
  global.fetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path === '/auth/v1/user') return Response.json({ id: options.headers.Authorization.includes(jwt('owner-id')) ? 'owner-id' : 'guest-id', email: options.headers.Authorization.includes(jwt('owner-id')) ? 'owner@example.test' : 'guest@example.test', email_confirmed_at: '2026-11-27' });
    if (path === '/rest/v1/measurement_sites') return Response.json([{ id: siteId, slug: 'engranes-cami', name: 'Engranes CAMI', active: true, privacy_notice_url: 'https://www.engranescami.com/aviso-de-privacidad' }]);
    if (path === '/rest/v1/measurement_viewers') {
      if (options.method === 'POST') { invited = true; return Response.json([{ email: 'guest@example.test' }]); }
      if (options.method === 'DELETE') { invited = false; return new Response(null, { status: 204 }); }
      return Response.json(invited ? [{ site_id: siteId }] : []);
    }
    if (path === '/emails') { mail.push(JSON.parse(options.body)); return Response.json({ id: 'mail-id' }); }
    return Response.json([]);
  };
  const req = (method, sub, body) => ({ method, headers: { cookie: `orkesta_measurement_session=${jwt(sub)}`, origin: 'https://www.orkestalo.com' }, body });
  try {
    const added = response();
    await dashboard(req('POST', 'owner-id', { email: 'Guest@Example.test', siteId }), added);
    assert.equal(added.statusCode, 201);
    assert.deepEqual(mail[0].to, ['guest@example.test']);
    const guest = response();
    await dashboard(req('GET', 'guest-id'), guest);
    assert.equal(guest.statusCode, 200);
    assert.deepEqual(guest.body.sites.map(site => site.slug), ['engranes-cami']);
    const revoked = response();
    await dashboard(req('DELETE', 'owner-id', { email: 'guest@example.test' }), revoked);
    assert.equal(revoked.statusCode, 200);
    const denied = response();
    await dashboard(req('GET', 'guest-id'), denied);
    assert.equal(denied.statusCode, 401);
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_OWNER_EMAIL',original.owner],['SUPABASE_URL',original.url],['SUPABASE_SECRET_KEY',original.key],['RESEND_API_KEY',original.resend],['ORKESTA_EMAIL_FROM',original.from]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
