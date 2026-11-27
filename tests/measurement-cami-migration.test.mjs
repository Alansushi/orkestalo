import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20261127232325_cami_measurement.sql', import.meta.url), 'utf8');

test('CAMI is registered inactive with its exact origin and 90-day retention', () => {
  assert.match(sql, /'engranes-cami'.*'https:\/\/www\.engranescami\.com'.*90.*false/s);
  assert.match(sql, /measurement_viewers/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.measurement_viewers/);
});

test('measurement daily aggregates use Mexico City calendar days', () => {
  for (const name of ['measurement_event_daily', 'measurement_source_daily', 'measurement_action_daily', 'measurement_funnel']) {
    assert.match(sql, new RegExp(`create or replace view public\\.${name}[\\s\\S]*?America/Mexico_City`));
  }
});
