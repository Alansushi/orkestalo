import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/measurement/client.js', import.meta.url), 'utf8');
function browser({ consent = 'accepted', beacon = () => true } = {}) {
  const values = new Map([['dental-cookie-consent-v2', consent]]);
  const handlers = {};
  const payloads = [];
  let serial = 0;
  const context = {
    URL, URLSearchParams, Blob,
    crypto: { randomUUID: () => `00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}` },
    navigator: { sendBeacon: (url, blob) => { payloads.push(blob.text()); return beacon(url, blob); } },
    location: { search: '?utm_source=google&utm_campaign=noviembre&patient=dolor', pathname: '/paciente/privado' },
    localStorage: { getItem: key => values.get(key) },
    sessionStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) },
    document: {
      currentScript: { src: 'https://www.orkestalo.com/assets/measurement.js', dataset: { site: 'dra-ana-mora', consentKey: 'dental-cookie-consent-v2' } },
      referrer: '',
      addEventListener: (name, fn) => { handlers[name] = fn; },
      querySelectorAll: () => [],
    },
    window: {},
  };
  runInNewContext(source, context);
  return { context, handlers, payloads, values };
}

test('collector sends campaign source without patient URL or clinical fields and deduplicates contact clicks', async () => {
  const { handlers, payloads } = browser();
  const link = { getAttribute: () => 'https://wa.me/521234567890', dataset: {} };
  handlers.click({ target: { closest: () => link } });
  handlers.click({ target: { closest: () => link } });
  const events = (await Promise.all(payloads)).map(x => JSON.parse(x).events[0]);
  assert.equal(events.length, 3);
  assert.deepEqual(events.map(x => x.name), ['page_view','contact_click','contact_click']);
  assert.equal(events[1].id, events[2].id);
  assert.equal(events[0].utm_source, 'google');
  assert.equal(events[0].utm_campaign, 'noviembre');
  assert.equal(events.every(x => x.path === '/' && !JSON.stringify(x).includes('dolor')), true);
});

test('collector does not start without consent or when network fails', () => {
  const denied = browser({ consent: 'rejected' });
  assert.equal(denied.payloads.length, 0);
  assert.equal(denied.handlers.click, undefined);
  const failure = browser({ beacon: () => { throw new Error('offline'); } });
  assert.doesNotThrow(() => failure.handlers.click({ target: { closest: () => ({ getAttribute: () => 'tel:5512345678', dataset: {} }) } }));
});
