import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('portfolio only contains unique published projects with live HTTPS references', async () => {
  const { projects } = await import('../src/rebrand/data.mjs');
  assert.equal(new Set(projects.map((project) => project.slug)).size, projects.length);
  assert.equal(projects.length, 6);
  for (const project of projects) {
    assert.match(project.url, /^https:\/\//);
    assert.ok(project.name.es && project.name.en && project.summary.es && project.summary.en);
    assert.ok(project.image && project.mobileImage && project.detail.es && project.detail.en);
    assert.notEqual(project.slug, 'sello');
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
