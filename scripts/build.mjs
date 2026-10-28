import { build } from 'esbuild';
import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderRootHome, renderRoutePages } from '../src/rebrand/render.mjs';

const assets = new URL('../assets/', import.meta.url);
await mkdir(assets, { recursive: true });
await renderRootHome();

await build({
  entryPoints: [fileURLToPath(new URL('../src/site.js', import.meta.url))],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: fileURLToPath(new URL('../assets/site.js', import.meta.url)),
});

await build({
  entryPoints: [fileURLToPath(new URL('../src/rebrand/site.js', import.meta.url))],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: fileURLToPath(new URL('../assets/rebrand.js', import.meta.url)),
});

await build({
  entryPoints: [fileURLToPath(new URL('../rebrand.css', import.meta.url))],
  minify: true,
  outfile: fileURLToPath(new URL('../assets/rebrand.css', import.meta.url)),
});

const publicDir = new URL('../public/', import.meta.url);
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

const publicFiles = [
  'index.html', 'favicon-orkesta-2.svg', 'logo-orkesta.svg', 'logo-orkesta-inverse.svg',
  'robots.txt', 'sitemap.xml', 'llms.txt',
];
for (const file of publicFiles) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(`../public/${file}`, import.meta.url));
}
await mkdir(new URL('../public/assets/', import.meta.url), { recursive: true });
for (const file of ['site.js', 'rebrand.js', 'rebrand.css']) {
  await cp(new URL(`../assets/${file}`, import.meta.url), new URL(`../public/assets/${file}`, import.meta.url));
}
const mediaDir = new URL('../media/', import.meta.url);
try { await access(mediaDir); await cp(mediaDir, new URL('../public/media/', import.meta.url), { recursive: true }); } catch {}
const newRoutes = await renderRoutePages(publicDir);
const sitemapPath = new URL('../public/sitemap.xml', import.meta.url);
let sitemap = await readFile(sitemapPath, 'utf8');
const newEntries = newRoutes.map((path) => {
  const absolute = `https://www.orkestalo.com${path}`;
  return `  <url><loc>${absolute}</loc></url>`;
}).join('\n');
sitemap = sitemap.replace('</urlset>', `${newEntries}\n</urlset>`);
await writeFile(sitemapPath, sitemap);
