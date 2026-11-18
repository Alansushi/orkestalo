import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validateConversion, verifyConversionSignature } from '../src/server/measurement-conversion.js';

const ref = '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b';
const payload = { site: 'dra-ana-mora', reference: ref, event: 'payment_approved', key: 'a'.repeat(64) };
test('conversion accepts only anonymous approved milestones', () => {
  assert.equal(validateConversion({ ...payload, event: 'booking_created' })?.event, 'booking_created');
  assert.equal(validateConversion({ site: payload.site, event: 'payment_approved', booking_key: 'b'.repeat(64), key: payload.key })?.event, 'payment_approved');
  assert.equal(validateConversion(payload), null);
  assert.equal(validateConversion({ ...payload, patient: 'Ana' }), null);
  assert.equal(validateConversion({ ...payload, key: 'cal-123' }), null);
  assert.equal(validateConversion({ ...payload, event: 'payment_pending' }), null);
});
test('conversion signature checks site, body, freshness and replay token', () => {
  const raw = JSON.stringify({ ...payload, event: 'booking_created' });
  const timestamp = String(Date.now());
  const nonce = '2'.repeat(32);
  const signature = createHmac('sha256', 'secret').update(`${timestamp}.${nonce}.${raw}`).digest('hex');
  assert.equal(verifyConversionSignature(raw, { timestamp, nonce, signature }, 'secret'), true);
  assert.equal(verifyConversionSignature(raw + ' ', { timestamp, nonce, signature }, 'secret'), false);
  assert.equal(verifyConversionSignature(raw, { timestamp: String(Date.now()-600000), nonce, signature }, 'secret'), false);
});
