import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.BUEN_FIN_BASE_URL || 'http://127.0.0.1:3001';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });

try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.clock.install({ time: new Date('2026-11-18T05:59:00Z') });
    await page.goto(base, { waitUntil: 'networkidle' });
    const link = page.locator('[data-campaign-link]');
    assert.equal(await link.isVisible(), true, `${width}: hero link before close`);
    await page.clock.fastForward(60_000);
    assert.equal(await link.isVisible(), false, `${width}: hero link at close`);
    await page.clock.setFixedTime(new Date('2026-11-18T05:59:00Z'));
    await page.goto(`${base}/buen-fin-2026/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('picture source[media="(max-width: 600px)"]').getAttribute('srcset'), '/media/buen-fin-2026/mercado-pago-mobile.png');
    assert.ok((await page.locator('.bf-art img').evaluate((img) => img.naturalWidth)) > 0);
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, `${width}: horizontal overflow`);
    await page.screenshot({ path: `/private/tmp/orkesta-buen-fin-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Ir al formulario de contacto ↗' }).click();
    await page.waitForURL('**/contacto/?referencia=buen-fin-2026');
    assert.equal(await page.locator('select[name="type"]').inputValue(), 'sitio-web');
    assert.equal(await page.locator('input[name="reference"]').inputValue(), 'buen-fin-2026');
    await page.close();
    const openCampaign = await browser.newPage({ viewport: { width, height } });
    await openCampaign.clock.install({ time: new Date('2026-11-18T05:59:00Z') });
    await openCampaign.goto(`${base}/buen-fin-2026/`, { waitUntil: 'networkidle' });
    await openCampaign.clock.fastForward(60_000);
    await openCampaign.waitForURL(base + '/');
    assert.equal(await openCampaign.locator('[data-campaign-link]').isVisible(), false);
    await openCampaign.close();
  }
  process.stdout.write('Buen Fin browser QA passed (desktop, mobile, close boundary, contact).\n');
} finally {
  await browser.close();
}
