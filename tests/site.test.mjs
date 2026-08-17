import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const productionPages = [
  'index.html',
  'automatizacion-n8n.html',
  'agentes-ia-claude.html',
  'casos-de-uso.html',
  'automatizacion-whatsapp-negocios.html',
  'integraciones-mercado-pago.html',
  'orquestacion-agentes.html',
  'por-que-orkesta.html',
  'preguntas-frecuentes.html',
  'procesamiento-documentos-ia.html',
  'sobre-orkesta.html',
  'automatizacion-ia-para-empresas.html',
];

test('the guided WhatsApp URL preserves source, situation, name and process', async () => {
  const { makeWhatsAppUrl } = await import('../src/contact.js');
  const url = makeWhatsAppUrl({
    source: '/automatizacion-n8n.html',
    situation: 'Quiero dejar de capturar datos a mano',
    name: 'María José',
    process: 'Recibir facturas\n y registrarlas en el ERP',
  });

  assert.equal(
    decodeURIComponent(url),
    'https://wa.me/525549713262?text=Página de origen: /automatizacion-n8n.html\nSituación: Quiero dejar de capturar datos a mano\nNombre: María José\nProceso: Recibir facturas y registrarlas en el ERP',
  );
});

test('all production pages use deferred local bundles and no browser Babel', async () => {
  for (const file of productionPages) {
    const html = await read(file);
    assert.doesNotMatch(html, /babel-standalone|text\/babel/i, file);
    assert.match(html, /<script\s+defer\s+src="\/assets\/[^"]+\.js"><\/script>/, file);
  }
});

test('commercial pages expose the promised buyer-facing content in Spanish and English', async () => {
  const expectations = {
    'index.html': ['Automatización de procesos con IA para que tu equipo avance', 'AI process automation that keeps your team moving', 'Orkesta Flowboard'],
    'automatizacion-n8n.html': ['Consultoría n8n para automatizar procesos', 'n8n consulting to automate processes', 'n8n vs. Make, Zapier y código a medida'],
    'agentes-ia-claude.html': ['Agentes de IA para empresas y equipos', 'AI agents for businesses and teams', 'Chatbot de reglas'],
    'casos-de-uso.html': ['Problema', 'Proceso', 'Resultado operativo', 'Descriptive use cases'],
    'automatizacion-whatsapp-negocios.html': ['Automatización de WhatsApp para negocios', 'WhatsApp automation for businesses', 'FAQPage'],
  };

  for (const [file, phrases] of Object.entries(expectations)) {
    const html = await read(file);
    for (const phrase of phrases) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${file}: ${phrase}`);
    assert.match(html, /Demostración recreada con datos ficticios|Recreated demonstration using fictional data/);
  }
});

test('buyer-facing content is geographically neutral in both languages', async () => {
  const productionNames = new Set(productionPages.map((file) => file.replace(/\.html$/, '')));
  const generatedFiles = (await readdir(new URL('../src/generated/', import.meta.url)))
    .filter((file) => file.endsWith('.jsx') && productionNames.has(file.replace(/\.jsx$/, '')))
    .map((file) => `src/generated/${file}`);
  const files = [...productionPages, ...generatedFiles, 'llms.txt', 'llms-full.txt', 'og-image.svg'];

  for (const file of files) {
    const content = await read(file);
    assert.doesNotMatch(content, /\b(?:México|Mexico|LATAM|Latinoamérica|Latin America|CDMX)\b/i, file);
    if (!/preguntas-frecuentes/.test(file)) {
      assert.doesNotMatch(content, /\b(?:CFDI|RFC)\b/i, file);
    }
  }
});

test('the neutral automation guide replaces the regional URL', async () => {
  const guide = await read('automatizacion-ia-para-empresas.html');
  const sitemap = await read('sitemap.xml');

  assert.match(guide, /Automatización con IA para empresas/);
  assert.match(guide, /\$8 USD\/hora/);
  assert.match(guide, /El diagnóstico gratuito de Orkesta \(30 minutos\)/);
  assert.match(guide, /https:\/\/orkestalo\.com\/automatizacion-ia-para-empresas\.html/);
  assert.match(sitemap, /automatizacion-ia-para-empresas\.html/);
  assert.doesNotMatch(sitemap, /automatizacion-ia-pymes-latam\.html/);
});

test('Vercel permanently redirects the former regional guide URL', async () => {
  const config = JSON.parse(await read('vercel.json'));
  assert.deepEqual(config.redirects, [{
    source: '/automatizacion-ia-pymes-latam.html',
    destination: '/automatizacion-ia-para-empresas.html',
    permanent: true,
  }]);
});

test('updated SSR fallbacks expose the current content date', async () => {
  const legacyPages = [
    'automatizacion-ia-para-empresas.html',
    'integraciones-mercado-pago.html',
    'orquestacion-agentes.html',
    'por-que-orkesta.html',
    'preguntas-frecuentes.html',
    'procesamiento-documentos-ia.html',
    'sobre-orkesta.html',
  ];

  for (const file of legacyPages) {
    const html = await read(file);
    assert.match(html, /Última actualización: agosto 2026/, file);
    assert.doesNotMatch(html, /Última actualización: junio 2026/, file);
  }
});

test('JSON-LD is valid and the WhatsApp landing is indexed', async () => {
  for (const file of productionPages) {
    const html = await read(file);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const [, json] of blocks) assert.doesNotThrow(() => JSON.parse(json), file);
  }

  const sitemap = await read('sitemap.xml');
  const llms = await read('llms.txt');
  assert.match(sitemap, /automatizacion-whatsapp-negocios\.html/);
  assert.match(llms, /automatización de WhatsApp/i);
  assert.doesNotMatch(llms, /\+15 horas|menos de 2 semanas/i);
});

test('every guided contact CTA uses one stable label and the floating CTA is accessible', async () => {
  for (const file of ['index.html', 'automatizacion-n8n.html', 'agentes-ia-claude.html', 'casos-de-uso.html', 'automatizacion-whatsapp-negocios.html']) {
    const html = await read(file);
    assert.match(html, /Cuéntanos tu proceso por WhatsApp/);
    assert.match(html, /Tell us about your process on WhatsApp/);
    assert.match(html, /class="[^"]*floating-wa[^"]*"[^>]*aria-label=/);
  }
});

test('the build assembles the public output expected by Vercel', async () => {
  const publicIndex = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const publicBundle = await readFile(new URL('../public/assets/site.js', import.meta.url), 'utf8');
  assert.match(publicIndex, /<title>Automatización de procesos con IA/);
  assert.match(publicIndex, /<script defer src="\/assets\/site\.js"><\/script>/);
  assert.ok(publicBundle.length > 100);
  await assert.rejects(access(new URL('../public/design-system.html', import.meta.url)));
  await assert.rejects(access(new URL('../public/index-hero-bg.html', import.meta.url)));
});
