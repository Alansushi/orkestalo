import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMeasurement, exactOrigin } from '../src/server/measurement.js';
import contact from '../api/measurement-contact.js';

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

test('public route categories and anonymous attribution are accepted, private routes are rejected', () => {
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], path: '/servicios', attribution_ref: session }] })?.events[0].path, '/servicios');
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], path: '/paciente/privado' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], path: '/servicios?email=a@b.com' }] }), null);
});

test('agenda clicks stay distinct from contact and verified conversions', () => {
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], name: 'agenda_click', channel: undefined, label: 'booking' }] })?.events[0].name, 'agenda_click');
});

test('site origin is exact and HTTPS', () => {
  assert.equal(exactOrigin('https://draanamora.com.mx', ['https://draanamora.com.mx']), true);
  assert.equal(exactOrigin('https://evil.draanamora.com.mx', ['https://draanamora.com.mx']), false);
  assert.equal(exactOrigin('http://draanamora.com.mx', ['https://draanamora.com.mx']), false);
});

test('medical contact ingestion is disabled', () => {
  const res = { statusCode: 0, end() {}, setHeader() {} };
  contact({}, res);
  assert.equal(res.statusCode, 410);
});
