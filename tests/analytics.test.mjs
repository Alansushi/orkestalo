import test from 'node:test';
import assert from 'node:assert/strict';
import { redactAnalyticsEvent } from '../src/rebrand/analytics.mjs';

test('analytics keeps the page but strips a private order folio and all query data', () => {
  const event = { type: 'pageview', url: 'https://www.orkestalo.com/pedido/?folio=ORK26-0123456789ABCDEF01&utm_source=email#estado' };
  assert.deepEqual(redactAnalyticsEvent(event), { type: 'pageview', url: 'https://www.orkestalo.com/pedido/' });
});

test('analytics drops events with an invalid URL', () => {
  assert.equal(redactAnalyticsEvent({ type: 'pageview', url: 'not a URL' }), null);
});
