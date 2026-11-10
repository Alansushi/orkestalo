import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BUEN_FIN_BASE_URL || 'http://127.0.0.1:3001';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
const message = 'Hola, me interesa el sitio web de una página de Buen Fin 2026 por $7,000 MXN. Quisiera conocer el alcance y cómo contratarlo del 13 al 17 de noviembre';

try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    let available = false;
    await page.route('**/api/checkout-availability', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available }) }));
    await page.goto(base + '/buen-fin-2026/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-checkout-form]').isVisible(), false);
    assert.equal(await page.locator('[data-campaign-whatsapp]').isVisible(), true);
    assert.equal(new URL(await page.locator('[data-campaign-whatsapp]').getAttribute('href')).searchParams.get('text'), message);
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, width + ': overflow');
    assert.equal(await page.locator('.bf-art__panel').isVisible(), true);
    await page.screenshot({ path: `/private/tmp/orkesta-buen-fin-${width}.png`, fullPage: true });
    available = true;
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-checkout-form]').isVisible(), true);
    assert.equal(await page.locator('[data-checkout-unavailable]').isVisible(), false);
    assert.equal(await page.locator('[data-campaign-hero-cta]').getAttribute('href'), '#comprar');
    available = false;
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-checkout-form]').isVisible(), false);
    await page.close();
  }
  process.stdout.write('Buen Fin browser QA passed (desktop, mobile, WhatsApp, available, paused).\\n');
} finally { await browser.close(); }
