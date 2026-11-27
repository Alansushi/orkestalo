import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = await readFile(new URL('../src/measurement/client.js', import.meta.url), 'utf8');
async function browser({ consent = 'accepted', beacon = () => true, site = 'dra-ana-mora', pathname = '/', now = () => Date.now() } = {}) {
  const values = new Map([['dental-cookie-consent-v2', consent], ['orkesta-measurement-consent-v1', consent], ['cami-analytics-consent-v1', consent]]);
  const handlers = {};
  const windowHandlers = {};
  const payloads = [];
  const revocations = [];
  let serial = 0;
  const context = {
    URL, URLSearchParams, Blob, TextEncoder, Uint8Array,
    Date: class extends Date { static now() { return now(); } },
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`, subtle: webcrypto.subtle },
    navigator: { sendBeacon: (url, blob) => { (String(url).includes('action=revoke') ? revocations : payloads).push(blob.text()); return beacon(url, blob); } },
    location: { search: '?utm_source=google&utm_campaign=noviembre&patient=dolor', pathname },
    localStorage: { getItem: key => values.get(key) },
    sessionStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    document: {
      currentScript: { src: 'https://www.orkestalo.com/assets/measurement.js', dataset: { site, consentKey: site === 'orkesta' ? 'orkesta-measurement-consent-v1' : site === 'engranes-cami' ? 'cami-analytics-consent-v1' : 'dental-cookie-consent-v2' } },
      referrer: '',
      addEventListener: (name, fn) => { handlers[name] = fn; },
      querySelectorAll: () => [],
    },
    window: { addEventListener: (name, fn) => { windowHandlers[name] = fn; } },
  };
  await runInNewContext(source, context);
  return { context, handlers, windowHandlers, payloads, revocations, values };
}

test('collector sends campaign source without patient URL or clinical fields and deduplicates contact clicks', async () => {
  const { handlers, payloads } = await browser();
  const link = { getAttribute: () => 'https://wa.me/521234567890', dataset: {} };
  handlers.click({ target: { closest: () => link } });
  handlers.click({ target: { closest: () => link } });
  const events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.equal(events.length, 3);
  assert.deepEqual(events.map(x => x.name), ['page_view','contact_click','contact_click']);
  assert.equal(events[1].id, events[2].id);
  assert.equal(events[0].utm_source, 'google');
  assert.match(events[0].utm_campaign, /^cmp_[a-f0-9]{16}$/);
  assert.equal(events.every(x => x.path === '/' && !JSON.stringify(x).includes('dolor')), true);
  assert.match(events[0].attribution_ref, /^[0-9a-f-]{36}$/);
  assert.equal(events[0].attribution_ref, events[1].attribution_ref);
});

test('route navigation records only public categories and consent withdrawal removes attribution', async () => {
  const { context, payloads, revocations, values } = await browser();
  context.window.orkestaMeasurement.page('/servicios?patient=Ana');
  context.window.orkestaMeasurement.page('/paciente/privado');
  let events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.deepEqual(events.map(x => x.path), ['/', '/servicios']);
  values.set('dental-cookie-consent-v2', 'rejected');
  context.window.orkestaMeasurement.page('/');
  assert.equal(payloads.length, 2);
  assert.equal(values.has('orkesta_measure_dra-ana-mora:ref'), false);
  assert.equal(revocations.length, 1);
  assert.equal(JSON.parse(await revocations[0]).reference, events[0].attribution_ref);
});

test('collector does not start without consent or when network fails', async () => {
  const denied = await browser({ consent: 'rejected' });
  assert.equal(denied.payloads.length, 0);
  assert.equal(denied.handlers.click, undefined);
  const failure = await browser({ beacon: () => { throw new Error('offline'); } });
  assert.doesNotThrow(() => failure.handlers.click({ target: { closest: () => ({ getAttribute: () => 'tel:5512345678', dataset: {} }) } }));
});

test('consent withdrawal immediately sends revocation without another click', async () => {
  const { windowHandlers, values, revocations } = await browser();
  values.set('dental-cookie-consent-v2', 'rejected');
  windowHandlers['site-consent-changed']();
  assert.equal(revocations.length, 1);
});

test('Orkesta tracks current public pages with increasing order across navigation and reload', async () => {
  const { context, payloads } = await browser({ site: 'orkesta', pathname: '/proyectos/' });
  context.window.orkestaMeasurement.page('/proyectos/grafik/?folio=private#detail');
  context.window.orkestaMeasurement.page('/contacto/');
  context.window.orkestaMeasurement.page('/pedido/?folio=private');
  await runInNewContext(source, context);
  const events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.deepEqual(events.map(x => x.path), ['/proyectos/', '/proyectos/grafik/', '/contacto/', '/proyectos/']);
  assert.deepEqual(events.map(x => x.page_order), [1, 2, 3, 4]);
  assert.equal(events.every(x => !JSON.stringify(x).includes('private')), true);
});

test('a page restored from browser history records another ordered page view', async () => {
  const { context, windowHandlers, payloads } = await browser({ site: 'orkesta', pathname: '/proyectos/' });
  context.location.pathname = '/contacto/';
  windowHandlers.pageshow({ persisted: true });
  const events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.deepEqual(events.map(x => [x.path, x.page_order]), [['/proyectos/', 1], ['/contacto/', 2]]);
});

test('CAMI collector sends only predefined actions, paths and labels', async () => {
  let time = 100000;
  const { context, payloads } = await browser({ site: 'engranes-cami', pathname: '/cotizar', now: () => time });
  context.window.orkestaMeasurement.track('form_error', { label: 'email', path: '/cotizar?name=Ana' });
  context.window.orkestaMeasurement.track('quote_draft', { label: 'form' });
  context.window.orkestaMeasurement.track('quote_draft', { label: 'form' });
  time += 2001;
  context.window.orkestaMeasurement.track('quote_draft', { label: 'form' });
  context.window.orkestaMeasurement.track('product_interest', { label: 'engranes-rectos', path: '/' });
  context.window.orkestaMeasurement.track('product_interest', { label: 'pieza-Ana' });
  context.window.orkestaMeasurement.page('/nosotros?email=ana@example.com');
  context.window.orkestaMeasurement.page('/private/Ana');
  const events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.deepEqual(events.map(x => x.name), ['page_view','form_error','quote_draft','quote_draft','quote_draft','product_interest','page_view']);
  assert.equal(events[2].id, events[3].id);
  assert.notEqual(events[3].id, events[4].id);
  assert.deepEqual(events.filter(x => x.name === 'page_view').map(x => x.page_order), [1,2]);
  assert.equal(events.every(x => !JSON.stringify(x).includes('Ana') && !JSON.stringify(x).includes('example.com')), true);
});
