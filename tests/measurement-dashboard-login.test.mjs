import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { setSession } from '../src/server/measurement-auth.js';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('email code needs TOTP before opening the measurement dashboard', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const html = await readFile(new URL('../src/measurement/dashboard.html', import.meta.url), 'utf8');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/medicion/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (url.pathname === '/api/measurement-dashboard') {
        const authenticated = route.request().headers().cookie?.includes('orkesta_measurement_session=owner-token');
        return route.fulfill({ status: authenticated ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ sites: [], daily: [], sources: [], connections: [], external: [], contacts: [] }) });
      }
      if (url.pathname === '/api/measurement-session') {
        const headers = {};
        if (route.request().method() === 'PATCH') setSession({ setHeader: (key, value) => { headers[key] = value; } }, 'owner-token', 3600);
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify({ ok: true, type: 'signup', mfa: 'verify', factorId: 'factor-id' }) });
      }
      return route.fulfill({ status: 404 });
    });
    await page.goto('https://measurement.test/medicion/');
    await page.locator('input[name="email"]').fill('owner@example.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.locator('#mfa').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#results').isVisible(), false);
    await page.locator('input[name="totp"]').fill('123456');
    await page.getByRole('button', { name: 'Verificar autenticador' }).click();
    await page.locator('#results').waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('#results').isVisible(), true);
    assert.equal(await page.locator('#verify').isVisible(), false);
  } finally {
    await browser.close();
  }
});

test('first login shows authenticator setup before opening the dashboard', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const html = await readFile(new URL('../src/measurement/dashboard.html', import.meta.url), 'utf8');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/medicion/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (url.pathname === '/api/measurement-dashboard') {
        const authorized = route.request().headers().cookie?.includes('orkesta_measurement_session=owner-token');
        return route.fulfill({ status: authorized ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ sites: [], daily: [], sources: [], connections: [], external: [], contacts: [] }) });
      }
      if (url.pathname === '/api/measurement-session') {
        const method = route.request().method();
        const body = route.request().postDataJSON();
        if (method === 'POST' && body.action === 'enroll') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ factorId: 'factor-id', secret: 'SETUPSECRET', qr: '' }) });
        if (method === 'PUT') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mfa: 'enroll' }) });
        if (method === 'PATCH') {
          const headers = {};
          setSession({ setHeader: (key, value) => { headers[key] = value; } }, 'owner-token', 3600);
          return route.fulfill({ status: 200, headers, contentType: 'application/json', body: '{}' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'signup' }) });
      }
      return route.fulfill({ status: 404 });
    });
    await page.goto('https://measurement.test/medicion/');
    await page.locator('input[name="email"]').fill('owner@example.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.locator('#mfa-setup').waitFor({ state: 'visible' });
    assert.match(await page.locator('#mfa-setup').innerText(), /SETUPSECRET/);
    assert.equal(await page.locator('#results').isVisible(), false);
    await page.locator('input[name="totp"]').fill('654321');
    await page.getByRole('button', { name: 'Verificar autenticador' }).click();
    await page.locator('#results').waitFor({ state: 'visible' });
  } finally { await browser.close(); }
});

test('expired email verification lets the owner restart login', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const html = await readFile(new URL('../src/measurement/dashboard.html', import.meta.url), 'utf8');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/medicion/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (url.pathname === '/api/measurement-dashboard') return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      if (url.pathname === '/api/measurement-session') {
        if (route.request().method() === 'PUT') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ mfa: 'verify', factorId: 'factor-id' }) });
        if (route.request().method() === 'PATCH') return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'signup' }) });
      }
      return route.fulfill({ status: 404 });
    });
    await page.goto('https://measurement.test/medicion/');
    await page.locator('input[name="email"]').fill('owner@example.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.locator('#mfa').waitFor({ state: 'visible' });
    await page.locator('input[name="totp"]').fill('123456');
    await page.getByRole('button', { name: 'Verificar autenticador' }).click();
    assert.equal(await page.getByRole('button', { name: 'Solicitar otro código por correo' }).isVisible(), true);
    await page.getByRole('button', { name: 'Solicitar otro código por correo' }).click();
    await page.locator('#login').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#login').isVisible(), true);
    assert.equal(await page.locator('#mfa').isVisible(), false);
  } finally { await browser.close(); }
});

test('presentation isolates one site and empty sites never show invented zeroes', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const html = await readFile(new URL('../src/measurement/dashboard.html', import.meta.url), 'utf8');
    const data = {
      sites: [{ id: 'ana', name: 'Dra. Ana Mora', active: true }, { id: 'fernanda', name: 'Dra. Fernanda Suaste', active: false }],
      daily: [{ site_id: 'ana', day: '2026-11-15', visits: 12, contact_clicks: 3, form_submits: 1 }],
      sources: [{ site_id: 'ana', source: 'google', medium: 'organic', campaign: null, visits: 12, contact_clicks: 3 }],
      contacts: [],
      external: [{ site_id: 'ana', day: '2026-11-15', provider: 'search_console', campaign_ref: null, metric: 'clicks', value: 7 }],
      connections: [{ site_id: 'ana', provider: 'search_console', last_synced_at: '2026-11-15T12:00:00Z', last_error: null }],
    };
    let loggedIn = true;
    await page.context().addCookies([{ name: 'orkesta_measurement_session', value: 'owner-token', domain: 'measurement.test', path: '/' }]);
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/medicion/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (url.pathname === '/api/measurement-dashboard') return route.fulfill({ status: loggedIn ? 200 : 401, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/measurement-session') { if (route.request().method() === 'DELETE') loggedIn = false; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
      return route.fulfill({ status: 404 });
    });
    await page.goto('https://measurement.test/medicion/');
    await page.locator('#site').selectOption('ana');
    assert.match(await page.locator('#summary').innerText(), /12/);
    assert.match(await page.locator('#summary').innerText(), /Contactos guardados\s+0/);
    assert.match(await page.locator('#external').innerText(), /Google Search Console/);
    await page.getByRole('button', { name: 'Presentar este sitio' }).click();
    assert.equal(await page.locator('#site').isVisible(), false);
    assert.doesNotMatch(await page.locator('body').innerText(), /Fernanda Suaste/);
    assert.match(await page.locator('body').innerText(), /Dra\. Ana Mora/);
    await page.getByRole('button', { name: 'Salir de presentación' }).click();
    assert.equal(await page.locator('#site').isVisible(), true);
    await page.locator('#site').selectOption('fernanda');
    assert.match(await page.locator('#summary').innerText(), /Aún sin datos/);
    assert.doesNotMatch(await page.locator('#summary').innerText(), /\b0\b/);
    assert.match(await page.locator('#results').innerText(), /inactiva/i);
    assert.doesNotMatch(await page.locator('#site-state').innerText(), /aún no mide/i);
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#site').focus();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'site');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.locator('#results').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#results').isVisible(), false);
    assert.equal(await page.locator('#login').isVisible(), true);
  } finally {
    await browser.close();
  }
});
