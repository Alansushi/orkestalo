import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMeasurementDashboard, loadClinicMeasurement } from '../src/server/measurement-dashboard-data.js';

test('dashboard pages every dataset beyond 1000 rows and scopes clinic queries', async () => {
  const calls = [];
  const db = async (table, { query }) => {
    calls.push({ table, query });
    const params = new URLSearchParams(query.slice(1));
    if (table === 'measurement_sites') return [{ id: 'site-a', name: 'A', active: false }];
    if (table === 'measurement_event_daily') {
      const offset = Number(params.get('offset'));
      return Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({ site_id: 'site-a', day: `day-${offset + i}`, visits: 1, contact_clicks: 0, form_submits: 0 }));
    }
    return [];
  };
  const result = await loadMeasurementDashboard({ siteId: 'site-a', db, now: new Date('2026-11-19T12:00:00Z') });
  assert.equal(result.daily.length, 1001);
  assert.equal(result.sites[0].active, false);
  assert.equal(result.since, '2026-10-21');
  assert.ok(result.updatedAt);
  assert.ok(calls.filter(x => x.table === 'measurement_event_daily').some(x => x.query.includes('offset=1000')));
  assert.ok(calls.filter(x => x.table !== 'measurement_sites').every(x => x.query.includes('site_id=eq.site-a')));
});

test('dashboard thirty-day window uses Mexico City date near UTC midnight', async () => {
  const db = async () => [];
  const data = await loadMeasurementDashboard({ db, now: new Date('2026-11-27T01:00:00Z') });
  assert.equal(data.since, '2026-10-28');
});

test('clinic measurement accepts inactive linked history but rejects mismatched domains', async () => {
  const calls = [];
  const db = async (table, { query }) => {
    calls.push(table);
    if (table === 'clinic_measurement_links') return [{ site_id: 'site-a', verified_at: '2026-11-19T00:00:00Z' }];
    if (table === 'measurement_sites') return [{ id: 'site-a', name: 'A', active: false, allowed_origins: ['https://ana.example.com'] }];
    return [];
  };
  const clinic = { website_url: 'https://ana.example.com/path' };
  const result = await loadClinicMeasurement(clinic, 'clinic-a', { db });
  assert.equal(result.status, 'verificado');
  assert.equal(result.dataset.sites[0].active, false);
  assert.deepEqual(result.dataset.daily, []);
  const before = calls.length;
  assert.equal((await loadClinicMeasurement({ website_url: 'https://foreign.example.com' }, 'clinic-a', { db })).status, 'sin datos verificados');
  assert.equal(calls.length, before + 2);
});

test('clinic without a verified link never reads a measurement site', async () => {
  const calls = [];
  const db = async table => { calls.push(table); return []; };
  assert.equal((await loadClinicMeasurement({ website_url:'https://ana.example.com' }, 'clinic-a', { db })).status, 'sin datos verificados');
  assert.deepEqual(calls, ['clinic_measurement_links']);
});

test('dashboard returns scoped page and transition aggregates for the last 30 days', async () => {
  const calls = [];
  const db = async (table, { query }) => {
    calls.push({ table, query });
    if (table === 'measurement_sites') return [{ id: 'orkesta', name: 'Orkesta', active: true }];
    if (table === 'measurement_page_30d') return [{ site_id: 'orkesta', path: '/contacto/', page_views: 3, visits: 2 }];
    if (table === 'measurement_transition_30d') return [{ site_id: 'orkesta', from_path: '/proyectos/', to_path: '/contacto/', transitions: 2 }];
    return [];
  };
  const result = await loadMeasurementDashboard({ siteId: 'orkesta', db, now: new Date('2026-11-26T12:00:00Z') });
  assert.equal(result.pages[0].visits, 2);
  assert.equal(result.transitions[0].transitions, 2);
  for (const table of ['measurement_page_30d', 'measurement_transition_30d']) {
    assert.ok(calls.some(call => call.table === table && call.query.includes('site_id=eq.orkesta') && !call.query.includes('day=gte.')));
  }
});

test('existing dashboard remains available before navigation views are migrated', async () => {
  const db = async table => {
    if (table === 'measurement_sites') return [{ id: 'ana', name: 'Ana', active: true }];
    if (table === 'measurement_event_daily') return [{ site_id: 'ana', day: '2026-11-26', visits: 4 }];
    if (table === 'measurement_page_30d' || table === 'measurement_transition_30d') throw new Error('Supabase 404');
    return [];
  };
  const data = await loadMeasurementDashboard({ db });
  assert.equal(data.daily[0].visits, 4);
  assert.deepEqual(data.pages, []);
  assert.deepEqual(data.transitions, []);
  assert.equal(data.navigationPending, true);
});
