import { createHmac, timingSafeEqual } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS = new Set(['booking_created', 'payment_approved', 'appointment_confirmed']);
const KEYS = new Set(['site','reference','booking_key','event','key']);

export function validateConversion(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !KEYS.has(k))) return null;
  if (!/^[a-z0-9-]{3,60}$/.test(input.site || '') || !EVENTS.has(input.event) || !/^[a-f0-9]{64}$/i.test(input.key || '')) return null;
  if (input.event === 'booking_created' ? !UUID.test(input.reference || '') || input.booking_key != null : !/^[a-f0-9]{64}$/i.test(input.booking_key || '') || input.reference != null) return null;
  return input;
}

export function verifyConversionSignature(raw, { timestamp, nonce, signature }, secret) {
  if (typeof raw !== 'string' || !secret || !/^\d{13}$/.test(timestamp || '') || Math.abs(Date.now() - Number(timestamp)) > 300000 || !/^[a-f0-9]{32}$/i.test(nonce || '') || !/^[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${nonce}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
