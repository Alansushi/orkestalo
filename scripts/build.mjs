import { build } from 'esbuild';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const assets = new URL('../assets/', import.meta.url);
const generated = new URL('../src/generated/', import.meta.url);
await mkdir(assets, { recursive: true });
await mkdir(generated, { recursive: true });

await build({
  entryPoints: [fileURLToPath(new URL('../src/site.js', import.meta.url))],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: fileURLToPath(new URL('../assets/site.js', import.meta.url)),
});

for (const file of (await readdir(root)).filter((name) => name.endsWith('.html'))) {
  const path = new URL(`../${file}`, import.meta.url);
  let html = await readFile(path, 'utf8');
  const match = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
  const name = basename(file, '.html');
  const sourcePath = new URL(`../src/generated/${name}.jsx`, import.meta.url);
  if (match) {
    const source = `import * as React from 'react';\nimport * as ReactDOM from 'react-dom/client';\n${match[1]}`;
    await writeFile(sourcePath, source);
  } else {
    try { await access(sourcePath); } catch { continue; }
  }
  await build({
    entryPoints: [fileURLToPath(sourcePath)],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020'],
    outfile: fileURLToPath(new URL(`../assets/${name}.js`, import.meta.url)),
    loader: { '.jsx': 'jsx' },
  });

  if (match) {
    html = html
      .replace(/\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react\/[^>]+><\/script>/g, '')
      .replace(/\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react-dom\/[^>]+><\/script>/g, '')
      .replace(/\s*<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/babel-standalone\/[^>]+><\/script>/g, '')
      .replace(match[0], `<script defer src="/assets/${name}.js"></script>`);
    await writeFile(path, html);
  }
}
