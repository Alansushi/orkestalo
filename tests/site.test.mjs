import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { projects, services } from '../src/rebrand/data.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const productionPages = [
  'index.html', 'proyectos/index.html', 'contacto/index.html', 'aviso-de-privacidad/index.html',
  ...projects.map(({ slug }) => `proyectos/${slug}/index.html`),
  ...services.map(({ slug }) => `servicios/${slug}/index.html`),
];

test('the guided WhatsApp URL preserves source, situation, name and process', async () => {
  const { makeWhatsAppUrl } = await import('../src/contact.js');
  const url = makeWhatsAppUrl({
    source: '/servicios/automatizacion-ia/',
    situation: 'Quiero dejar de capturar datos a mano',
    name: 'María José',
    process: 'Recibir facturas\n y registrarlas en el ERP',
  });

  assert.equal(
    decodeURIComponent(url),
    'https://wa.me/525549713262?text=Página de origen: /servicios/automatizacion-ia/\nSituación: Quiero dejar de capturar datos a mano\nNombre: María José\nProceso: Recibir facturas y registrarlas en el ERP',
  );
});

test('WhatsApp links omit missing details instead of inventing them', async () => {
  const { makeWhatsAppUrl } = await import('../src/contact.js');
  const message = new URL(makeWhatsAppUrl({ source: '/contacto/' })).searchParams.get('text');
  assert.equal(message, 'Página de origen: /contacto/');
  assert.equal(new URL(makeWhatsAppUrl({ source: '/', situation: '  ', name: '\n' })).searchParams.get('text'), 'Página de origen: /');
});

test('project inquiry includes only supplied details in Spanish and English', async () => {
  const { makeProjectWhatsAppUrl } = await import('../src/contact.js');
  const input = {
    name: ' Ana  López ', type: 'sitio-web', description: ' Un sitio para mi estudio. ',
    phone: '+52 55 1234 5678', reference: 'grafik', budget: ' $20,000 ',
  };
  const spanish = new URL(makeProjectWhatsAppUrl(input, 'es')).searchParams.get('text');
  assert.match(spanish, /Hola, soy Ana López\./);
  assert.match(spanish, /sitio web/);
  assert.match(spanish, /Un sitio para mi estudio\./);
  assert.match(spanish, /Teléfono: \+52 55 1234 5678/);
  assert.match(spanish, /Referencia: grafik/);
  assert.match(spanish, /Presupuesto: \$20,000/);
  assert.doesNotMatch(spanish, /Correo:|Fecha:|Por definir|Formulario no disponible/);
  const english = new URL(makeProjectWhatsAppUrl({ ...input, email: 'ana@example.com', date: 'June 2027' }, 'en')).searchParams.get('text');
  assert.match(english, /Hi, I'm Ana López\./);
  assert.match(english, /Email: ana@example\.com/);
  assert.match(english, /Phone: \+52 55 1234 5678/);
  assert.match(english, /Preferred date: June 2027/);
  assert.doesNotMatch(english, /Por definir|Formulario no disponible/);
});

test('all published pages load the new site bundle without browser Babel', async () => {
  for (const file of productionPages) {
    const html = await read(`public/${file}`);
    assert.doesNotMatch(html, /babel-standalone|text\/babel/i, file);
    assert.match(html, /<script defer src="\/assets\/rebrand\.js"><\/script>/, file);
    assert.doesNotMatch(html, /\.html(?:["?#])/, file);
  }
});

test('the build assembles only current root documents', async () => {
  const home = await read('public/index.html');
  const bundle = await read('public/assets/rebrand.js');
  const llms = await read('public/llms.txt');
  assert.match(home, /Ideas extraordinarias\. Experiencias digitales reales\./);
  assert.match(bundle, /\/_vercel\/insights\/script\.js/);
  assert.match(llms, /Proyectos/);
  assert.doesNotMatch(llms, /\.html(?:[\s)])/);
  for (const file of ['design-system.html', 'index-hero-bg.html', 'llms-full.txt', 'styles.css', 'og-image.png']) {
    await assert.rejects(access(new URL(`../public/${file}`, import.meta.url)), file);
  }
});
