import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sites = {
  grafik: 'https://www.grafik.mx/',
  'dra-ana-mora': 'https://www.draanamora.com.mx/',
  'diego-y-giselle': 'https://www.diegoygiselle.com/',
  'dra-fernanda-suaste': 'https://sitio-dra-fernanda-suaste.vercel.app/',
  'expression-grafica': 'https://expresiongrafica.vercel.app/',
  'aranza-y-mateo': 'https://aranza-mateo.vercel.app/',
};
const directory = new URL('../media/projects/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
for (const [slug, url] of Object.entries(sites)) {
  for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: device === 'mobile', hasTouch: device === 'mobile', locale: 'es-MX', reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status()}`);
      await page.waitForTimeout(2200);
      const output = fileURLToPath(new URL(`${slug}-${device}.png`, directory));
      await page.screenshot({ path: output, animations: 'disabled' });
      console.log(`${slug} ${device}: ${response.status()} ${output}`);
    } catch (error) {
      console.error(`${slug} ${device}: ${error.message.slice(0, 140)}`);
      process.exitCode = 1;
    } finally { await context.close(); }
  }
}
await browser.close();
