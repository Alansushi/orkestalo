import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { projects, services } from '../src/rebrand/data.mjs';

const origin = 'https://www.orkestalo.com';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const routePaths = ['/', '/proyectos/', '/contacto/', '/aviso-de-privacidad/',
  ...projects.map(({ slug }) => `/proyectos/${slug}/`),
  ...services.map(({ slug }) => `/servicios/${slug}/`)];
const legacyPaths = (await readdir(new URL('../', import.meta.url)))
  .filter((name) => name.endsWith('.html') && !['index.html', 'design-system.html', 'index-hero-bg.html'].includes(name))
  .map((name) => `/${name}`);
const htmlPath = (route) => route === '/' ? 'public/index.html' : route.endsWith('.html') ? `public${route}` : `public${route}index.html`;

test('every public page has a direct self canonical and parseable, date-free JSON-LD', async () => {
  for (const route of [...routePaths, ...legacyPaths]) {
    const html = await read(htmlPath(route));
    const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    assert.equal(canonical.length, 1, route);
    assert.equal(canonical[0][1], `${origin}${route}`, route);
    assert.doesNotMatch(html, /hreflang=/, route);
    assert.doesNotMatch(html, /https:\/\/orkestalo\.com(?:\/|["#?])/, route);
    const nodes = [];
    for (const [, block] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const schema = JSON.parse(block);
      assert.doesNotMatch(block, /"date(?:Published|Modified)"/, route);
      for (const node of schema['@graph'] ?? [schema]) {
        nodes.push(node);
        if (node['@type'] === 'Service') assert.deepEqual(node.provider, { '@id': `${origin}/#org` }, route);
      }
    }
    if (nodes.some((node) => node.provider?.['@id'] === `${origin}/#org` || node.publisher?.['@id'] === `${origin}/#org`)) {
      assert.ok(nodes.some((node) => node['@type'] === 'Organization' && node['@id'] === `${origin}/#org`), route);
    }
  }
});

test('sitemap lists only the indexable self-canonical pages without alternates or dates', async () => {
  const sitemap = await read('public/sitemap.xml');
  assert.doesNotMatch(sitemap, /lastmod|hreflang|changefreq|priority|https:\/\/orkestalo\.com\//);
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(new Set(urls), new Set([...routePaths.filter((route) => route !== '/aviso-de-privacidad/'), ...legacyPaths].map((route) => `${origin}${route}`)));
  for (const url of urls) assert.equal((await read(htmlPath(new URL(url).pathname))).includes(`<link rel="canonical" href="${url}"`), true, url);
  assert.match(await read('public/robots.txt'), /Sitemap: https:\/\/www\.orkestalo\.com\/sitemap\.xml/);
});

test('service detail and FAQ schema match Spanish content present without JavaScript', async () => {
  for (const service of services) {
    const html = await read(`public/servicios/${service.slug}/index.html`);
    for (const phrase of [service.name.es, service.scope.es, service.conditions.es, ...service.deliverables.es]) assert.ok(html.includes(phrase), `${service.slug}: ${phrase}`);
    assert.ok(html.includes(`data-en="${service.scope.en}`), service.slug);
  }
  const whatsapp = await read('public/automatizacion-whatsapp-negocios.html');
  const schema = JSON.parse([...whatsapp.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)][0][1]);
  const faq = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
  for (const question of faq.mainEntity) {
    assert.ok(whatsapp.includes(`<summary data-es="${question.name}"`), question.name);
    assert.ok(whatsapp.includes(`>${question.acceptedAnswer.text}</p>`), question.name);
  }
});
