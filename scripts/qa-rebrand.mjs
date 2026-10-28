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
  let brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.naturalWidth).map((image) => image.currentSrc));
  if (brokenImages.length) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; document.querySelectorAll('img').forEach((image) => { image.loading = 'eager'; }); });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete));
    brokenImages = await page.locator('img').evaluateAll((images) => images.filter((image) => !image.naturalWidth).map((image) => image.currentSrc));
  }
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
const apiRequests = [];
contact.on('pageerror', (error) => consoleErrors.push(error.message));
contact.on('request', (request) => { if (request.url().includes('/api/contact')) apiRequests.push(request.url()); });
await contact.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp test target</title>' }));
await contact.goto('http://localhost:8080/contacto/?referencia=experiencias-digitales', { waitUntil: 'networkidle' });
if (await contact.locator('select[name=type]').inputValue() !== 'experiencia-digital') findings.push('contact reference preselection failed');
if (await contact.locator('input[name=reference]').inputValue() !== 'experiencias-digitales') findings.push('contact reference missing');
if (await contact.locator('input[name=name]').getAttribute('autocomplete') !== 'name' || await contact.locator('input[name=email]').getAttribute('autocomplete') !== 'email' || await contact.locator('input[name=phone]').getAttribute('autocomplete') !== 'tel') findings.push('native autofill tokens missing');
await contact.locator('[data-contact-form] button[type=submit]').click();
if (await contact.locator('input[name=name]').evaluate((input) => input.validity.valid)) findings.push('empty name accepted');
await contact.locator('input[name=name]').fill('Ana López');
await contact.locator('[data-contact-form] button[type=submit]').click();
if (await contact.locator('textarea[name=description]').evaluate((input) => input.validity.valid)) findings.push('empty description accepted');
await contact.locator('textarea[name=description]').fill('Quiero crear una experiencia para mi equipo.');
await contact.locator('input[name=email]').fill('correo-invalido');
await contact.locator('[data-contact-form] button[type=submit]').click();
if (await contact.locator('input[name=email]').evaluate((input) => input.validity.valid)) findings.push('malformed optional email accepted');
await contact.locator('input[name=email]').fill('');
await contact.locator('input[name=phone]').fill('+52 55 1234 5678');
const popupPromise = contact.waitForEvent('popup');
await contact.locator('[data-contact-form] button[type=submit]').click();
const popup = await popupPromise;
const message = new URL(popup.url()).searchParams.get('text');
if (!message?.includes('Hola, soy Ana López.') || !message.includes('una experiencia digital') || !message.includes('Teléfono: +52 55 1234 5678') || !message.includes('Referencia: experiencias-digitales') || message.includes('Correo:')) findings.push('Spanish WhatsApp message incomplete');
await popup.close();
if (await contact.evaluate(() => Object.keys(localStorage).some((key) => /name|email|phone|contact/i.test(key)))) findings.push('contact data persisted in localStorage');
await contact.evaluate(() => scrollTo(0, 0));
await contact.screenshot({ path: fileURLToPath(new URL('contact-mobile.png', output)), fullPage: true });
if (consoleErrors.length) findings.push(`contact page errors: ${consoleErrors.join('; ')}`);
await contact.close();

const english = await browser.newPage({ viewport: { width: 1440, height: 900 } });
english.on('request', (request) => { if (request.url().includes('/api/contact')) apiRequests.push(request.url()); });
await english.context().route('https://wa.me/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp test target</title>' }));
await english.goto('http://localhost:8080/contacto/?referencia=invalid&lang=en', { waitUntil: 'networkidle' });
if (await english.locator('input[name=reference]').inputValue() || await english.locator('select[name=type]').inputValue()) findings.push('invalid reference accepted');
if (await english.locator('select[name=type] option[value="sitio-web"]').textContent() !== 'Web design and development') findings.push('English project option untranslated');
if (await english.locator('textarea[name=description]').getAttribute('placeholder') !== 'What would you like to create or improve?') findings.push('English description placeholder untranslated');
await english.locator('input[name=name]').fill('Alex');
await english.locator('textarea[name=description]').fill('I need a new website for my studio.');
await english.locator('[data-contact-form] button[type=submit]').click();
if (await english.locator('select[name=type]').evaluate((select) => select.validity.valid)) findings.push('empty project type accepted');
await english.locator('select[name=type]').selectOption('sitio-web');
await english.locator('input[name=email]').fill('alex@example.com');
await english.locator('input[name=budget]').fill('USD 5,000');
await english.locator('input[name=date]').fill('June 2027');
await english.evaluate(() => scrollTo(0, 0));
await english.screenshot({ path: fileURLToPath(new URL('contact-desktop.png', output)), fullPage: true });
const englishPopupPromise = english.waitForEvent('popup');
await english.locator('[data-contact-form] button[type=submit]').click();
const englishPopup = await englishPopupPromise;
const englishMessage = new URL(englishPopup.url()).searchParams.get('text');
if (!englishMessage?.includes("Hi, I'm Alex.") || !englishMessage.includes('a website') || !englishMessage.includes('Email: alex@example.com') || !englishMessage.includes('Approximate budget: USD 5,000') || !englishMessage.includes('Preferred date: June 2027') || englishMessage.includes('Reference:') || englishMessage.includes('Phone:')) findings.push('English WhatsApp message incomplete');
await englishPopup.close();
await english.close();
const project = await browser.newPage();
await project.goto('http://localhost:8080/contacto/?referencia=diego-y-giselle', { waitUntil: 'networkidle' });
if (await project.locator('select[name=type]').inputValue() !== 'experiencia-digital' || await project.locator('input[name=reference]').inputValue() !== 'diego-y-giselle') findings.push('project reference preselection failed');
await project.close();
const preserved = await browser.newPage();
await preserved.addInitScript(() => {
  const observer = new MutationObserver(() => {
    const select = document.querySelector('select[name=type]');
    if (select?.querySelector('option[value=otro]')) { select.value = 'otro'; observer.disconnect(); }
  });
  observer.observe(document, { childList: true, subtree: true });
});
await preserved.goto('http://localhost:8080/contacto/?referencia=experiencias-digitales', { waitUntil: 'networkidle' });
if (await preserved.locator('select[name=type]').inputValue() !== 'otro') findings.push('reference overwrote an existing project type');
await preserved.close();
if (apiRequests.length) findings.push(`contact called API: ${apiRequests.join(', ')}`);
await browser.close();
await writeFile(new URL('../docs/orkesta-rebrand/qa-results.json', import.meta.url), JSON.stringify({ sizes, findings }, null, 2));
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`QA passed: ${sizes.length} home viewports, contact mobile and desktop, validation, autofill attributes, references, Spanish and English WhatsApp messages, no contact API request`);
