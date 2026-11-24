import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialTab, progressByTab, tabForStep } from '../src/consultorio/tabs.js';

const steps = (pending = []) => ['identity','calendar','content','welcome','followup','invite','survey','privacy','activate']
  .map(id => ({ id, done: !pending.includes(id) }));

test('first pending setup step selects its tab and complete setup opens Inicio', () => {
  assert.equal(initialTab(steps(['calendar','welcome'])), 'agenda');
  assert.equal(initialTab(steps(['welcome'])), 'mensajes');
  assert.equal(initialTab(steps(['content'])), 'datos');
  assert.equal(initialTab(steps()), 'inicio');
});

test('tab state reflects the nine existing setup checks without blocking navigation', () => {
  assert.deepEqual(progressByTab(steps(['content','invite'])), {
    datos: { done: 1, total: 2 }, agenda: { done: 1, total: 1 },
    mensajes: { done: 5, total: 6 }, operacion: { done: 0, total: 0 },
  });
  assert.equal(tabForStep('privacy'), 'mensajes');
  assert.equal(tabForStep('calendar'), 'agenda');
});

test('panel groups each existing control in the agreed tab', async () => {
  const html = await readFile(new URL('../src/consultorio/index.html', import.meta.url), 'utf8');
  const start = name => html.indexOf(`id="tab-${name}" role="tabpanel"`);
  const order = ['inicio','datos','agenda','mensajes','operacion'];
  assert.ok(order.every(name => start(name) >= 0));
  assert.ok(order.every((name, i) => i === 0 || start(order[i - 1]) < start(name)));
  const inTab = (id, tab) => {
    const i = html.indexOf(`id="${id}"`);
    assert.ok(i > start(tab), `${id} must be in ${tab}`);
    const next = order[order.indexOf(tab) + 1];
    if (next) assert.ok(i < start(next), `${id} must not be after ${tab}`);
  };
  for (const id of ['onboarding','upcoming-count','pending-count','failed-count']) inTab(id,'inicio');
  for (const id of ['identity-settings','site-proposal','confirm-identity','confirm-content']) inTab(id,'datos');
  for (const id of ['cal-setup','appointments','slot-form','manual-form']) inTab(id,'agenda');
  for (const id of ['privacy-settings','template-editors','messages']) inTab(id,'mensajes');
  for (const id of ['tasks','admin-panel']) inTab(id,'operacion');
});
