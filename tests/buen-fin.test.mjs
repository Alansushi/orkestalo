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
  assert.match(home, /logo-mipymes-vertical\.png"[^>]+alt="El Buen Fin 2026, MIPYMES"/);
  assert.match(page, /<title>Buen Fin 2026: sitio web de una página por \$7,000 MXN \| Orkesta<\/title>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/www\.orkestalo\.com\/buen-fin-2026\/">/);
  assert.match(page, /name="robots" content="noindex,follow"/);
  assert.match(page, /property="og:url" content="https:\/\/www\.orkestalo\.com\/buen-fin-2026\/"/);
  assert.match(page, /property="og:description"/);
  assert.match(page, /13 al 17 de noviembre de 2026/);
  assert.match(page, /BFINMP/);
  assert.match(page, /hasta 30%/);
  assert.match(page, /15% de descuento con tarjetas de crédito de Afirme, American Express, Mifel y Openbank/);
  assert.match(page, /10% con los demás medios participantes/);
  assert.match(page, /compra mínima de \$2,000 MXN/);
  assert.match(page, /límite de \$1,000 MXN por participante/);
  assert.match(page, /Checkout Pro <strong>no garantizan<\/strong>/);
  assert.match(page, /ayuda\/57759/);
  assert.match(page, /ayuda\/57760/);
  assert.match(page, /href="\/contacto\/\?referencia=buen-fin-2026"/);
  assert.match(page, /data-checkout-form/);
  assert.match(page, /name="accepted" type="checkbox" required/);
  assert.match(page, /hasta cinco secciones/);
  assert.match(page, /href="\/terminos-buen-fin-2026\/"/);
  assert.match(page, /logo-mipymes-horizontal\.png/);
  assert.match(page, /mercado-pago-mobile\.png/);
  assert.match(page, /mercado-pago-desktop\.png/);
  assert.match(page, /registro-orkesta-qr\.png/);
  assert.match(page, /alt="Código QR del registro de Orkesta/);
  assert.match(await read('public/pedido/index.html'), /data-order-status/);
  assert.doesNotMatch(sitemap, /terminos-buen-fin-2026|\/pedido\//);
  assert.doesNotMatch(sitemap, /buen-fin-2026/);
  assert.match(page, /data-checkout-unavailable/);
  assert.match(page, /data-checkout-form novalidate hidden/);
  assert.match(page, /Me interesa la promoción · Escríbenos por WhatsApp/);
  assert.match(page, /Escribirnos no reserva el paquete ni genera un cobro/);
  assert.doesNotMatch(page, /pendiente de aprobación/);
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
