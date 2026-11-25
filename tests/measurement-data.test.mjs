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
  assert.equal(result.since, '2026-10-20');
  assert.ok(result.updatedAt);
  assert.ok(calls.filter(x => x.table === 'measurement_event_daily').some(x => x.query.includes('offset=1000')));
  assert.ok(calls.filter(x => x.table !== 'measurement_sites').every(x => x.query.includes('site_id=eq.site-a')));
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
