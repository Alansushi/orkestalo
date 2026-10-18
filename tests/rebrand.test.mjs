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

test('contact validation limits fields and rejects malformed input', async () => {
  const { validateContact } = await import('../api/contact.js');
  const valid = { name: 'Ana', email: 'ana@example.com', type: 'sitio-web', description: 'Quiero renovar el sitio de mi estudio.' };
  assert.equal(validateContact(valid).ok, true);
  assert.equal(validateContact({ ...valid, email: 'x' }).ok, false);
  assert.equal(validateContact({ ...valid, description: 'x'.repeat(4001) }).ok, false);
  assert.equal(validateContact({ ...valid, website: 'bot' }).spam, true);
});

test('contact API never reports delivery when email is unconfigured or fails', async () => {
  const { submitContact } = await import('../api/contact.js');
  const input = { name: 'Ana', email: 'ana@example.com', type: 'sitio-web', description: 'Quiero renovar el sitio de mi estudio.' };
  const missing = await submitContact(input, { env: {}, fetcher: async () => { throw Error('unexpected'); } });
  assert.equal(missing.status, 503);
  const failed = await submitContact(input, { env: { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'hola@orkestalo.com' }, fetcher: async () => ({ ok: false }) });
  assert.equal(failed.status, 502);
});

test('contact API sends a valid inquiry only to the Orkesta mailbox', async () => {
  const { submitContact } = await import('../api/contact.js');
  let request;
  const result = await submitContact({ name: 'Ana', email: 'ana@example.com', type: 'sitio-web', description: 'Quiero renovar el sitio de mi estudio.', reference: 'grafik' }, {
    env: { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'hola@orkestalo.com' },
    fetcher: async (url, options) => { request = { url, options }; return { ok: true }; },
  });
  assert.equal(result.status, 200);
  assert.equal(request.url, 'https://api.resend.com/emails');
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.to, ['info@orkestalo.com']);
  assert.equal(body.reply_to, 'ana@example.com');
  assert.match(body.text, /Referencia: grafik/);
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
