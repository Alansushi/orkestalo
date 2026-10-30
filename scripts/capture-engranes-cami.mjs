import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/rebrand/data.mjs';

const project = projects.find(({ slug }) => slug === 'engranes-cami');
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--no-sandbox'] });
try {
  for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: device === 'mobile', hasTouch: device === 'mobile', locale: 'es-MX', reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const response = await page.goto(project.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status()}`);
      await page.waitForTimeout(2500);
      const target = new URL(`../media/projects/engranes-cami-${device}.jpg`, import.meta.url);
      await page.screenshot({ path: fileURLToPath(target), type: 'jpeg', quality: 82, animations: 'disabled' });
      console.log(`${device}: ${response.status()} ${page.url()} ${await page.title()}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
