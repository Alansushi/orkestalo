import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { validateMeasurement, exactOrigin } from '../src/server/measurement.js';

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

test('campaign attribution accepts only coarse sources and hashed campaign codes', () => {
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], utm_source: 'Ana Pérez' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], utm_medium: 'dolor dental' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], utm_campaign: 'ana-perez' }] }), null);
  assert.equal(validateMeasurement({ ...batch, events: [{ ...batch.events[0], utm_campaign: 'cmp_' + 'a'.repeat(16) }] })?.events[0].utm_campaign, 'cmp_' + 'a'.repeat(16));
});

test('site origin is exact and HTTPS', () => {
  assert.equal(exactOrigin('https://draanamora.com.mx', ['https://draanamora.com.mx']), true);
  assert.equal(exactOrigin('https://evil.draanamora.com.mx', ['https://draanamora.com.mx']), false);
  assert.equal(exactOrigin('http://draanamora.com.mx', ['https://draanamora.com.mx']), false);
});

test('medical contact ingestion is disabled', () => {
  assert.equal(existsSync(new URL('../api/measurement-contact.js', import.meta.url)), false);
});

test('Orkesta page views accept a positive order only on public routes', () => {
  const page = { ...batch.events[0], name: 'page_view', path: '/proyectos/grafik/', channel: undefined, page_order: 2 };
  assert.equal(validateMeasurement({ site: 'orkesta', events: [page] })?.events[0].page_order, 2);
  assert.equal(validateMeasurement({ site: 'orkesta', events: [{ ...page, path: '/contacto/' }] })?.events[0].path, '/contacto/');
  for (const path of ['/pedido/', '/medicion/', '/buen-fin-2026/', '/proyectos/private/', '/contacto/?folio=123']) {
    assert.equal(validateMeasurement({ site: 'orkesta', events: [{ ...page, path }] }), null, path);
  }
  for (const page_order of [0, -1, 1.5, '2', 1000001]) {
    assert.equal(validateMeasurement({ site: 'orkesta', events: [{ ...page, page_order }] }), null);
  }
  assert.equal(validateMeasurement({ site: 'orkesta', events: [{ ...page, name: 'contact_click' }] }), null);
});

test('CAMI accepts only its public routes and predefined action labels', () => {
  const event = { id, session, name: 'product_interest', path: '/', label: 'engranes-rectos' };
  assert.equal(validateMeasurement({ site: 'engranes-cami', events: [event] })?.events[0].label, 'engranes-rectos');
  assert.equal(validateMeasurement({ site: 'engranes-cami', events: [{ ...event, name: 'quote_draft', path: '/cotizar', label: 'form' }] })?.events[0].name, 'quote_draft');
  assert.equal(validateMeasurement({ site: 'engranes-cami', events: [{ ...event, name: 'form_error', path: '/cotizar', label: 'email' }] })?.events[0].label, 'email');
  assert.equal(validateMeasurement({ site: 'engranes-cami', events: [{ ...event, name: 'contact_click', channel: 'map', label: 'footer' }] })?.events[0].channel, 'map');
  for (const bad of [{ path: '/cotizar?nombre=Ana' }, { path: '/otro' }, { label: 'Ana Pérez' }, { label: 'pieza-ABC123' }, { name: 'patient_note' }]) {
    assert.equal(validateMeasurement({ site: 'engranes-cami', events: [{ ...event, ...bad }] }), null);
  }
  assert.equal(validateMeasurement({ site: 'dra-ana-mora', events: [event] }), null);
});
