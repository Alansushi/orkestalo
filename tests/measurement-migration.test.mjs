import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const sql = await readFile(new URL('../supabase/migrations/20261127021004_orkesta_measurement_navigation.sql', import.meta.url), 'utf8');

test('migration permits unordered contact and form events while restricting page order to page views', () => {
  const check = sql.match(/add column page_order integer check \(([\s\S]+?)\);/i)?.[1];
  assert.ok(check);
  const db = new DatabaseSync(':memory:');
  db.exec(`create table events (name text, page_order integer check (${check}))`);
  const insert = db.prepare('insert into events (name, page_order) values (?, ?)');
  assert.doesNotThrow(() => insert.run('contact_click', null));
  assert.doesNotThrow(() => insert.run('form_start', null));
  assert.doesNotThrow(() => insert.run('page_view', 1));
  assert.throws(() => insert.run('contact_click', 1));
  assert.throws(() => insert.run('page_view', 0));
});

test('transition view does not invent an edge across a missing page sequence', () => {
  const view = sql.match(/create view public\.measurement_transition_30d with \(security_invoker = true\) as\n([\s\S]+?);\nrevoke/i)?.[1];
  assert.ok(view);
  const query = view.replaceAll('public.measurement_events', 'events').replace("occurred_at >= now() - interval '30 days'", "occurred_at >= '2026-11-01'");
  const db = new DatabaseSync(':memory:');
  db.exec('create table events (site_id text, session_id text, occurred_at text, path text, page_order integer, event_id text, name text)');
  const insert = db.prepare('insert into events values (?, ?, ?, ?, ?, ?, ?)');
  insert.run('orkesta', 'tab-1', '2026-11-26T12:00:03Z', '/', 1, 'id-1', 'page_view');
  insert.run('orkesta', 'tab-1', '2026-11-26T12:00:01Z', '/proyectos/', 3, 'id-3', 'page_view');
  insert.run('orkesta', 'tab-1', '2026-11-26T12:00:02Z', '/contacto/', 4, 'id-4', 'page_view');
  const transitions = db.prepare(query).all().map(({ from_path, to_path, transitions }) => [from_path, to_path, transitions]);
  assert.deepEqual(transitions, [['/proyectos/', '/contacto/', 1]]);
});
