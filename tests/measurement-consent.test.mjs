import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/measurement/consent.js', import.meta.url), 'utf8').catch(() => '');

function browser(initial = null, privacy = {}, shared = {}) {
  const values = shared.values || new Map(initial ? [['orkesta-measurement-consent-v1', initial]] : []);
  const session = shared.session || new Map();
  const requests = [];
  const scripts = [];
  const events = [];
  const nodes = Object.fromEntries(['consent','settings','accept','reject'].map(key => [key, {
    hidden: key === 'consent', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; },
    click() { this.handlers.click?.(); }, setAttribute() {},
  }]));
  const selectors = { '[data-measure-consent]': nodes.consent, '[data-measure-settings]': nodes.settings, '[data-measure-accept]': nodes.accept, '[data-measure-reject]': nodes.reject };
  runInNewContext(source, {
    document: { querySelector: key => selectors[key], createElement: () => ({ dataset: {} }), head: { append: node => scripts.push(node) } },
    localStorage: { getItem: key => values.get(key) || null, setItem: (key,value) => { shared.onSet?.(key, value); values.set(key,value); } },
    sessionStorage: { getItem: key => session.get(key) || null, setItem: (key,value) => session.set(key,value), removeItem: key => session.delete(key) },
    fetch: (url, options) => { requests.push({ url, options }); return shared.fetch?.(url, options) || Promise.resolve({ ok: true }); },
    navigator: privacy,
    window: { dispatchEvent: event => events.push(event.type), addEventListener() {} },
    Event,
  });
  return { values, session, scripts, events, nodes, requests };
}

test('consent choice gates loading and remains reversible from settings', () => {
  const app = browser();
  assert.equal(app.nodes.consent.hidden, false);
  assert.equal(app.scripts.length, 0);
  app.nodes.reject.click();
  assert.equal(app.values.get('orkesta-measurement-consent-v1'), 'rejected');
  assert.equal(app.scripts.length, 0);
  app.nodes.settings.click();
  app.nodes.accept.click();
  assert.equal(app.values.get('orkesta-measurement-consent-v1'), 'accepted');
  assert.equal(app.scripts.length, 1);
  assert.equal(app.scripts[0].dataset.site, 'orkesta');
  app.nodes.settings.click();
  app.nodes.reject.click();
  assert.equal(app.values.get('orkesta-measurement-consent-v1'), 'rejected');
  assert.ok(app.events.includes('site-consent-changed'));
  assert.equal(browser('rejected').scripts.length, 0);
});

test('privacy signals prevent the measurement script even with stored acceptance', () => {
  assert.equal(browser('accepted', { doNotTrack: '1' }).scripts.length, 0);
  assert.equal(browser('accepted', { globalPrivacyControl: true }).scripts.length, 0);
  assert.equal(browser('accepted').scripts.length, 1);
});

test('withdrawal queues an anonymous revocation before a tracker loads and retries after an outage', async () => {
  const values = new Map([['orkesta-measurement-consent-v1', 'accepted']]);
  const session = new Map([['orkesta_measure_orkesta:ref', '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b']]);
  const offline = browser(null, {}, { values, session, fetch: () => Promise.reject(new Error('offline')) });
  offline.nodes.reject.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(values.get('orkesta-measurement-consent-v1'), 'rejected');
  assert.equal(session.has('orkesta_measure_orkesta:ref'), false);
  assert.match(offline.requests[0].options.body, /90c3be77-45f2-4c9b-a8cb-4b12c6c9655b/);
  assert.match(values.get('orkesta-measurement-revocations-v1'), /90c3be77-45f2-4c9b-a8cb-4b12c6c9655b/);
  const online = browser(null, {}, { values, session });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(online.requests.length, 1);
  assert.equal(values.get('orkesta-measurement-revocations-v1'), '[]');
  assert.equal(online.scripts.length, 0);
});

test('withdrawal clears tab identifiers even when the revocation queue cannot be persisted', () => {
  const session = new Map([['orkesta_measure_orkesta:ref', '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b']]);
  const app = browser('accepted', {}, { session, onSet: key => { if (key === 'orkesta-measurement-revocations-v1') throw new Error('storage full'); } });
  app.nodes.reject.click();
  assert.equal(session.has('orkesta_measure_orkesta:ref'), false);
  assert.equal(app.values.get('orkesta-measurement-consent-v1'), 'rejected');
});
