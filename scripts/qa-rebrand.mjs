import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output = new URL('../docs/orkesta-rebrand/screenshots/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
const sizes = [[1440, 900], [1920, 1080], [768, 1024], [390, 844], [375, 812]];
const findings = [];

for (const [width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => findings.push(`${width}x${height}: ${error.message}`));
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; }); });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  const brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.naturalWidth).map((image) => image.currentSrc));
  if (brokenImages.length) findings.push(`${width}x${height}: broken images ${brokenImages.join(', ')}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 1) findings.push(`${width}x${height}: horizontal overflow ${overflow}px`);
  await page.screenshot({ path: fileURLToPath(new URL(`home-${width}x${height}.png`, output)), fullPage: true });
  if (width === 390) {
    await page.keyboard.press('Tab');
    if (!await page.getByRole('link', { name: 'Saltar al contenido' }).evaluate((link) => link === document.activeElement)) findings.push('skip link is not first in keyboard order');
    await page.getByRole('button', { name: 'Menú' }).focus();
    await page.keyboard.press('Enter');
    if (!await page.getByRole('navigation', { name: 'Navegación principal' }).isVisible()) findings.push('mobile menu did not open');
    await page.screenshot({ path: fileURLToPath(new URL('mobile-menu.png', output)) });
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    if (!await page.getByRole('heading', { level: 1, name: /Extraordinary ideas/ }).isVisible()) findings.push('English language switch failed');
    await page.getByRole('button', { name: 'ES', exact: true }).click();
    await page.getByRole('button', { name: 'Experiencias' }).click();
    if (await page.locator('.project-card:visible').count() !== 2) findings.push('portfolio experience filter failed');
    await page.getByRole('button', { name: 'Sitios web' }).click();
    if (await page.locator('.project-card:visible').count() !== 4) findings.push('portfolio website filter failed');
    await page.getByRole('button', { name: 'Automatización' }).click();
    if (!await page.locator('[data-portfolio-empty]').isVisible()) findings.push('portfolio empty state failed');
    await page.locator('.faq-list summary').first().focus();
    await page.keyboard.press('Enter');
    if (!await page.locator('.faq-list details').first().evaluate((details) => details.open)) findings.push('FAQ did not open from keyboard');
  }
  await page.close();
}

const contact = await browser.newPage({ viewport: { width: 390, height: 844 } });
const consoleErrors = [];
contact.on('pageerror', (error) => consoleErrors.push(error.message));
await contact.route('**/api/contact', async (route) => {
  if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: false }) });
  return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
});
await contact.goto('http://localhost:8080/contacto/?referencia=experiencias-digitales', { waitUntil: 'networkidle' });
if (await contact.locator('select[name=type]').inputValue() !== 'experiencia-digital') findings.push('contact reference preselection failed');
if (!await contact.locator('.studio-form__fallback').isVisible()) findings.push('contact unavailable fallback hidden');
if (!await contact.locator('[data-contact-form] button[type=submit]').isDisabled()) findings.push('unavailable form can still be submitted');
await contact.screenshot({ path: fileURLToPath(new URL('contact-mobile.png', output)), fullPage: true });
if (consoleErrors.length) findings.push(`contact page errors: ${consoleErrors.join('; ')}`);
await contact.close();

const submission = await browser.newPage({ viewport: { width: 768, height: 1024 } });
let deliveryOk = true;
await submission.route('**/api/contact', async (route) => {
  if (route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) });
  return route.fulfill({ status: deliveryOk ? 200 : 502, contentType: 'application/json', body: JSON.stringify({ ok: deliveryOk }) });
});
await submission.goto('http://localhost:8080/contacto/', { waitUntil: 'networkidle' });
const fillForm = async () => {
  await submission.locator('input[name=name]').fill('Persona de prueba');
  await submission.locator('input[name=email]').fill('prueba@example.com');
  await submission.locator('select[name=type]').selectOption('sitio-web');
  await submission.locator('textarea[name=description]').fill('Esta es una solicitud de prueba local para el diseño web.');
};
await fillForm();
await submission.locator('[data-contact-form] button[type=submit]').click();
await submission.locator('[data-contact-status]').getByText('Mensaje enviado.').waitFor();
deliveryOk = false;
await fillForm();
await submission.locator('[data-contact-form] button[type=submit]').click();
await submission.locator('.studio-form__fallback:visible').waitFor();
if (!/No pudimos enviar/.test(await submission.locator('[data-contact-status]').textContent())) findings.push('contact error response reported success');
await submission.close();
await browser.close();
await writeFile(new URL('../docs/orkesta-rebrand/qa-results.json', import.meta.url), JSON.stringify({ sizes, findings }, null, 2));
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`QA passed: ${sizes.length} viewports, images, console, keyboard, mobile menu, language, filters, contact fallback, preselection, simulated success and error`);
