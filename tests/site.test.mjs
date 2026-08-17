import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

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
  const files = (await readdir(root)).filter((file) => file.endsWith('.html'));
  assert.ok(files.length >= 12);
  for (const file of files) {
    const html = await read(file);
    assert.doesNotMatch(html, /babel-standalone|text\/babel/i, file);
    assert.match(html, /<script\s+defer\s+src="\/assets\/[^"]+\.js"><\/script>/, file);
  }
});

test('commercial pages expose the promised buyer-facing content in Spanish and English', async () => {
  const expectations = {
    'index.html': ['Automatización de procesos con IA para PyMEs en México y LATAM', 'AI process automation for SMBs in Mexico and Latin America', 'Orkesta Flowboard'],
    'automatizacion-n8n.html': ['Consultoría n8n en México para automatizar procesos', 'n8n consulting in Mexico to automate processes', 'n8n vs. Make, Zapier y código a medida'],
    'agentes-ia-claude.html': ['Agentes de IA para PyMEs', 'AI agents for SMBs', 'Chatbot de reglas'],
    'casos-de-uso.html': ['Problema', 'Proceso', 'Resultado operativo', 'Descriptive use cases'],
    'automatizacion-whatsapp-negocios.html': ['Automatización de WhatsApp para negocios', 'WhatsApp automation for businesses', 'FAQPage'],
  };

  for (const [file, phrases] of Object.entries(expectations)) {
    const html = await read(file);
    for (const phrase of phrases) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${file}: ${phrase}`);
    assert.match(html, /Demostración recreada con datos ficticios|Recreated demonstration using fictional data/);
  }
});

test('JSON-LD is valid and the WhatsApp landing is indexed', async () => {
  const files = (await readdir(root)).filter((file) => file.endsWith('.html'));
  for (const file of files) {
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
