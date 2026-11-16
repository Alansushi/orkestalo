import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('email code opens the measurement dashboard', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = [];
    let authenticated = false;
    page.on('pageerror', error => errors.push(error.message));
    const html = await readFile(new URL('../src/measurement/dashboard.html', import.meta.url), 'utf8');
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/medicion/') return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      if (url.pathname === '/api/measurement-dashboard') return route.fulfill({ status: authenticated ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ sites: [], daily: [], sources: [], connections: [], external: [], contacts: [] }) });
      if (url.pathname === '/api/measurement-session') {
        if (route.request().method() === 'PUT') authenticated = true;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, type: 'signup' }) });
      }
      return route.fulfill({ status: 404 });
    });
    await page.goto('http://measurement.test/medicion/');
    await page.locator('input[name="email"]').fill('owner@example.com');
    await page.getByRole('button', { name: 'Enviar código' }).click();
    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForTimeout(100);
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('#results').isVisible(), true);
    assert.equal(await page.locator('#verify').isVisible(), false);
  } finally {
    await browser.close();
  }
});
