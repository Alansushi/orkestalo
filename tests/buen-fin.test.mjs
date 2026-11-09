import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import proxy, { CAMPAIGN_CLOSE, isCampaignClosed } from '../proxy.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('campaign page, metadata, terms and contact route are built without entering sitemap', async () => {
  const [home, page, sitemap] = await Promise.all([
    read('public/index.html'), read('public/buen-fin-2026/index.html'), read('public/sitemap.xml'),
  ]);
  assert.match(home, /data-campaign-link href="\/buen-fin-2026\/"/);
  assert.match(page, /<title>Buen Fin 2026: sitio web de una página por \$7,000 MXN \| Orkesta<\/title>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/www\.orkestalo\.com\/buen-fin-2026\/">/);
  assert.match(page, /name="robots" content="noindex,follow"/);
  assert.match(page, /property="og:url" content="https:\/\/www\.orkestalo\.com\/buen-fin-2026\/"/);
  assert.match(page, /property="og:description"/);
  assert.match(page, /13 al 17 de noviembre de 2026/);
  assert.match(page, /BFINMP/);
  assert.match(page, /hasta 30%/);
  assert.match(page, /mínimo de \$2,000 MXN/);
  assert.match(page, /no garantizan el cupón ni una bonificación/);
  assert.match(page, /ayuda\/57759/);
  assert.match(page, /ayuda\/57760/);
  assert.match(page, /href="\/contacto\/\?referencia=buen-fin-2026"/);
  assert.match(page, /data-checkout-form/);
  assert.match(page, /name="accepted" type="checkbox" required/);
  assert.match(page, /hasta cinco secciones/);
  assert.match(page, /href="\/terminos-buen-fin-2026\/"/);
  assert.match(await read('public/pedido/index.html'), /data-order-status/);
  assert.doesNotMatch(sitemap, /terminos-buen-fin-2026|\/pedido\//);
  assert.doesNotMatch(sitemap, /buen-fin-2026/);
  for (const name of ['desktop', 'mobile']) {
    assert.match(page, new RegExp(`/media/buen-fin-2026/mercado-pago-${name}\\.png`));
    const png = await readFile(new URL(`../public/media/buen-fin-2026/mercado-pago-${name}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), name === 'desktop' ? 1200 : 600);
    assert.equal(png.readUInt32BE(20), name === 'desktop' ? 700 : 600);
  }
});

test('campaign closes exactly at midnight in Mexico City with a 410', async () => {
  assert.equal(CAMPAIGN_CLOSE, Date.parse('2026-11-18T06:00:00Z'));
  assert.equal(isCampaignClosed(CAMPAIGN_CLOSE - 1), false);
  assert.equal(isCampaignClosed(CAMPAIGN_CLOSE), true);
  const original = Date.now;
  Date.now = () => CAMPAIGN_CLOSE;
  try {
    for (const path of ['/buen-fin-2026', '/buen-fin-2026/', '/buen-fin-2026/index.html']) {
      const response = proxy(new Request(`https://www.orkestalo.com${path}`));
      assert.equal(response.status, 410);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(await response.text(), /\$7,000|BFINMP/);
    }
  } finally {
    Date.now = original;
  }
});
