import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMeasurement, exactOrigin } from '../src/server/measurement.js';
import { validateContact } from '../api/measurement-contact.js';

const id = 'a9e6537d-6a58-49d5-a845-eecad58957d5';
const session = '90c3be77-45f2-4c9b-a8cb-4b12c6c9655b';
const batch = { site: 'dra-ana-mora', events: [{ id, session, name: 'contact_click', path: '/', channel: 'whatsapp', utm_source: 'google' }] };

test('shared measurement accepts a common event and rejects clinical or arbitrary fields', () => {
  assert.equal(validateMeasurement(batch)?.events[0].name, 'contact_click');
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], symptoms: 'dolor' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], label: 'dolor' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], path: '/consulta/paciente@example.com' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], name: 'appointment_confirmed' }] }), null);
});

test('site origin is exact and HTTPS', () => {
  assert.equal(exactOrigin('https://draanamora.com.mx', ['https://draanamora.com.mx']), true);
  assert.equal(exactOrigin('https://evil.draanamora.com.mx', ['https://draanamora.com.mx']), false);
  assert.equal(exactOrigin('http://draanamora.com.mx', ['https://draanamora.com.mx']), false);
});

test('medical contacts contain only identity, channel and consent', () => {
  const contact = { site: 'dra-ana-mora', submissionId: id, name: 'Ana Pérez', email: 'ana@example.com', channel: 'form', consent: true, consentVersion: 'ana-2026-11' };
  assert.equal(validateContact(contact)?.name, 'Ana Pérez');
  assert.equal(validateContact({ ...contact, reason: 'dolor dental' }), null);
  assert.equal(validateContact({ ...contact, consent: false }), null);
});
