import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('portfolio separates published projects from projects in construction', async () => {
  const { projects } = await import('../src/rebrand/data.mjs');
  assert.equal(new Set(projects.map((project) => project.slug)).size, projects.length);
  assert.deepEqual(projects.filter(({ status }) => status === 'in-construction').map(({ slug }) => slug), ['dra-fernanda-suaste', 'engranes-cami']);
  assert.equal(projects.filter(({ status }) => status === 'published').length, 5);
  assert.equal(projects.find(({ slug }) => slug === 'engranes-cami').url, 'https://www.engranescami.com/');
  assert.equal(projects.find(({ slug }) => slug === 'dra-fernanda-suaste').name.en, 'Dra. Fernanda Suaste');
  for (const project of projects) {
    assert.ok(['published', 'in-construction'].includes(project.status));
    assert.match(project.url, /^https:\/\//);
    assert.ok(project.name.es && project.name.en && project.summary.es && project.summary.en);
    assert.ok(project.image && project.mobileImage && project.detail.es && project.detail.en);
    assert.notEqual(project.slug, 'sello');
  }
});

test('home and portfolio show construction cards after the published grid, outside its filters', async () => {
  for (const path of ['public/index.html', 'public/proyectos/index.html']) {
    const html = await read(path);
    const published = html.match(/<section id="proyectos"[\s\S]*?<\/section>/)?.[0]
      ?? html.match(/<section class="studio-section studio-section--dark"[\s\S]*?<\/section>/)?.[0];
    const construction = html.match(/<section id="proximamente"[\s\S]*?<\/section>/)?.[0];
    assert.ok(published, `${path}: published section`);
    assert.ok(construction, `${path}: construction section`);
    assert.ok(html.indexOf(published) < html.indexOf(construction), `${path}: section order`);
    assert.equal((published.match(/class="project-card"/g) || []).length, 5);
    assert.doesNotMatch(published, /dra-fernanda-suaste|engranes-cami/);
    for (const slug of ['dra-fernanda-suaste', 'engranes-cami']) assert.match(construction, new RegExp(`href="/proyectos/${slug}/"`));
    assert.equal((construction.match(/class="project-card"/g) || []).length, 2);
    assert.equal((construction.match(/En construcción/g) || []).length >= 2, true);
    assert.match(construction, /Under construction/);
    assert.match(construction, /algunas partes de estos sitios aún pueden no funcionar/i);
    assert.match(construction, /some parts of these sites may not work yet/i);
    assert.doesNotMatch(construction, /data-project-category/);
  }
});

test('construction case pages warn before visiting and advertise their status in search metadata', async () => {
  for (const slug of ['dra-fernanda-suaste', 'engranes-cami']) {
    const html = await read(`public/proyectos/${slug}/index.html`);
    assert.match(html, /<title>[^<]*En construcción/);
    assert.match(html, /<meta name="description" content="[^"]*en construcción/);
    assert.match(html, /En construcción/);
    assert.match(html, /Under construction/);
    assert.match(html, /algunas partes de este sitio aún pueden no funcionar/);
    assert.match(html, /some parts of this site may not work yet/);
    assert.ok(html.indexOf('algunas partes de este sitio aún pueden no funcionar') < html.indexOf('Visitar sitio público'));
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  }
});

test('contact page offers native autofill and one WhatsApp completion action', async () => {
  const home = await read('public/index.html');
  const contact = await read('public/contacto/index.html');
  const homeContact = home.match(/<section id="contacto"[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal((homeContact.match(/class="studio-button studio-button--light"/g) || []).length, 1);
  assert.match(homeContact, /href="\/contacto\/"/);
  assert.doesNotMatch(homeContact, /data-wa-link/);
  assert.match(contact, /name="name" autocomplete="name" required/);
  assert.match(contact, /name="email" type="email" autocomplete="email"/);
  assert.match(contact, /name="phone" type="tel" autocomplete="tel"/);
  assert.doesNotMatch(contact, /name="email"[^>]*required/);
  assert.match(contact, /name="type" required/);
  assert.match(contact, /name="description"[^>]*required/);
  assert.equal((contact.match(/<button class="studio-button" type="submit"/g) || []).length, 1);
  assert.match(contact, /Continuar en WhatsApp/);
  assert.doesNotMatch(contact, /studio-form__fallback|Prefiero escribir por WhatsApp|Formulario no disponible/);
});

test('the new site generates semantic landing and readable route files', async () => {
  const home = await read('public/index.html');
  assert.match(home, /Ideas extraordinarias\. Experiencias digitales reales\./);
  assert.match(home, /data-portfolio-filter/);
  assert.match(home, /Lo que hemos construido/);
  assert.match(home, /<main id="contenido">/);
  for (const route of ['proyectos', 'contacto', 'servicios/diseno-desarrollo-web', 'servicios/experiencias-digitales', 'servicios/automatizacion-ia']) {
    const html = await read(`public/${route}/index.html`);
    assert.match(html, /<main id="contenido">/);
    assert.doesNotMatch(html, /hreflang=/);
  }
  const { projects } = await import('../src/rebrand/data.mjs');
  for (const project of projects) assert.match(await read(`public/proyectos/${project.slug}/index.html`), new RegExp(project.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const sitemap = await read('public/sitemap.xml');
  for (const project of projects) assert.ok(sitemap.includes(`https://www.orkestalo.com/proyectos/${project.slug}/`));
  assert.ok(!sitemap.includes('https://www.orkestalo.com/aviso-de-privacidad/'));
  assert.match(await read('public/aviso-de-privacidad/index.html'), /name="robots" content="noindex,follow"/);
});

test('new pages only link to files and routes generated in public output', async () => {
  const { projects, services } = await import('../src/rebrand/data.mjs');
  const pages = ['index.html', 'proyectos/index.html', 'contacto/index.html', 'aviso-de-privacidad/index.html',
    ...projects.map(({ slug }) => `proyectos/${slug}/index.html`),
    ...services.map(({ slug }) => `servicios/${slug}/index.html`)];
  for (const page of pages) {
    const html = await read(`public/${page}`);
    for (const [, raw] of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
      const target = raw.endsWith('/') ? `public${raw}index.html` : `public${raw}`;
      await assert.doesNotReject(access(new URL(`../${target}`, import.meta.url)), `${page} → ${raw}`);
    }
  }
});

test('production serves only the new site and redirects retired pages', async () => {
  const retired = [
    'agentes-ia-claude.html', 'automatizacion-ia-para-empresas.html', 'automatizacion-n8n.html',
    'automatizacion-whatsapp-negocios.html', 'casos-de-uso.html', 'integraciones-mercado-pago.html',
    'orquestacion-agentes.html', 'por-que-orkesta.html', 'preguntas-frecuentes.html',
    'procesamiento-documentos-ia.html', 'sobre-orkesta.html',
  ];
  const rootHtml = (await readdir(new URL('../', import.meta.url)))
    .filter((name) => name.endsWith('.html') && !['index.html', 'design-system.html', 'index-hero-bg.html'].includes(name));
  assert.deepEqual(rootHtml, []);
  const publicHtml = (await readdir(new URL('../public/', import.meta.url))).filter((name) => name.endsWith('.html'));
  assert.deepEqual(publicHtml, ['index.html']);

  const assets = await readdir(new URL('../public/assets/', import.meta.url));
  assert.deepEqual(new Set(assets), new Set(['site.js', 'rebrand.js', 'rebrand.css']));
  const buildAssets = await readdir(new URL('../assets/', import.meta.url));
  assert.deepEqual(new Set(buildAssets), new Set(['site.js', 'rebrand.js', 'rebrand.css']));
  await assert.rejects(access(new URL('../src/generated/', import.meta.url)));

  const config = JSON.parse(await read('vercel.json'));
  const destinations = new Set(['/', '/proyectos/', '/servicios/automatizacion-ia/']);
  for (const name of [...retired, 'automatizacion-ia-pymes-latam.html']) {
    const redirect = config.redirects.find(({ source }) => source === `/${name}`);
    assert.ok(redirect, `missing redirect for ${name}`);
    assert.equal(redirect.permanent, true);
    assert.ok(destinations.has(redirect.destination), `${name} redirects outside the new site`);
  }

  const publishedText = `${await read('public/sitemap.xml')}\n${await read('public/llms.txt')}`;
  for (const name of retired) assert.ok(!publishedText.includes(name), `${name} is still advertised`);
  assert.ok(!publishedText.includes('llms-full.txt'));
  await assert.rejects(access(new URL('../public/llms-full.txt', import.meta.url)));
});
