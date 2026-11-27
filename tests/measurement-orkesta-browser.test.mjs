import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('public navigation and successful contact are measured only after consent and stop on withdrawal', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const captured = [];
    const revoked = [];
    const referers = [];
    await page.route('https://measurement.test/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/measurement-track') {
        referers.push(route.request().headers().referer || '');
        const body = JSON.parse(route.request().postData());
        (url.searchParams.has('action') ? revoked : captured).push(body);
        return route.fulfill({ status: 202, contentType: 'application/json', body: '{}' });
      }
      if (url.pathname === '/api/contact') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ folio: 'ORK26-1234567890ABCDEF12' }) });
      const relative = url.pathname.startsWith('/assets/') ? `../public${url.pathname}` : `../public${url.pathname}index.html`;
      try {
        const body = await readFile(new URL(relative, import.meta.url));
        const contentType = url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html';
        return route.fulfill({ status: 200, contentType, body });
      } catch { return route.fulfill({ status: 404 }); }
    });
    await page.goto('https://measurement.test/');
    assert.equal(await page.locator('[data-measure-consent]').isVisible(), true);
    assert.equal(captured.length, 0);
    await page.locator('[data-measure-reject]').click();
    await page.goto('https://measurement.test/proyectos/');
    assert.equal(captured.length, 0);
    await page.locator('[data-measure-settings]').click();
    await page.locator('[data-measure-accept]').click();
    await page.waitForFunction(() => Boolean(window.orkestaMeasurement));
    await page.goto('https://measurement.test/proyectos/grafik/?referencia=secret');
    await page.goto('https://measurement.test/contacto/');
    await page.locator('[name="name"]').fill('Ana');
    await page.locator('[name="type"]').selectOption('sitio-web');
    await page.locator('textarea[name="description"]').fill('Necesito un sitio web para mi estudio.');
    await page.locator('[data-contact-form] [type="submit"]').click();
    await page.locator('[data-contact-success]').waitFor({ state: 'visible' });
    const events = captured.flatMap(batch => batch.events);
    assert.deepEqual(events.filter(x => x.name === 'page_view').map(x => [x.path, x.page_order]), [
      ['/proyectos/', 1], ['/proyectos/grafik/', 2], ['/contacto/', 3],
    ]);
    assert.ok(events.some(x => x.name === 'form_start' && x.path === '/contacto/'));
    assert.ok(events.some(x => x.name === 'form_submit' && x.path === '/contacto/'));
    assert.equal(JSON.stringify(events).includes('secret'), false);
    assert.equal(JSON.stringify(events).includes('Necesito un sitio'), false);
    assert.equal(referers.every(value => value === 'https://measurement.test/'), true, JSON.stringify(referers));
    await page.locator('[data-measure-settings]').click();
    await page.locator('[data-measure-reject]').click();
    await page.waitForFunction(() => !sessionStorage.getItem('orkesta_measure_orkesta:ref'));
    assert.equal(revoked.length, 1);
    const count = captured.length;
    await page.evaluate(() => window.orkestaMeasurement.page('/contacto/'));
    assert.equal(captured.length, count);
  } finally { await browser.close(); }
});
