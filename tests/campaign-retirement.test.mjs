import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import proxy from '../proxy.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const absent = (path) => assert.rejects(access(new URL(`../${path}`, import.meta.url)));

test('retired campaign and terms URLs return 410 without advertising the offer', async () => {
  const config = JSON.parse(await read('vercel.json'));
  for (const route of ['/buen-fin-2026', '/terminos-buen-fin-2026']) {
    assert.ok(config.proxy.matcher.includes(route));
    assert.ok(config.proxy.matcher.includes(`${route}/:path*`));
  }
  for (const path of ['/buen-fin-2026', '/buen-fin-2026/', '/terminos-buen-fin-2026', '/terminos-buen-fin-2026/']) {
    const response = proxy(new Request(`https://www.orkestalo.com${path}`));
    assert.equal(response.status, 410, path);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    assert.doesNotMatch(await response.text(), /Buen Fin|BFINMP|7,000/i);
  }
});

test('build omits the offer, exclusive images and purchase endpoints', async () => {
  const home = await read('public/index.html');
  const sitemap = await read('public/sitemap.xml');
  assert.doesNotMatch(home, /Buen Fin|BFINMP|data-campaign-link/i);
  assert.doesNotMatch(sitemap, /buen-fin-2026|terminos-buen-fin-2026/);
  for (const path of [
    'public/buen-fin-2026/index.html', 'public/terminos-buen-fin-2026/index.html',
    'api/checkout.js', 'api/checkout-availability.js',
    ...['logo-mipymes-horizontal.png', 'logo-mipymes-vertical.png', 'mercado-pago-desktop.png', 'mercado-pago-mobile.png', 'registro-orkesta-qr.png'].map((name) => `public/media/buen-fin-2026/${name}`),
  ]) await absent(path);
  assert.match(await read('public/pedido/index.html'), /data-order-status/);
  assert.match(await read('src/server/measurement.js'), /\/buen-fin-mercado-pago/);
  assert.match(await read('docs/archivo/terminos-buen-fin-2026.html'), /Términos del paquete Buen Fin 2026/);
});
