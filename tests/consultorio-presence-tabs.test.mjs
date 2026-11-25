import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('brand, presence, requests and activity live in the planned clinic tabs', async () => {
  const html = await readFile(new URL('../src/consultorio/index.html', import.meta.url), 'utf8');
  const start = name => html.indexOf(`id="tab-${name}" role="tabpanel"`);
  const within = (id, tab, next) => {
    const index = html.indexOf(`id="${id}"`);
    assert.ok(index > start(tab), `${id} follows ${tab}`);
    assert.ok(index < start(next), `${id} precedes ${next}`);
  };
  for (const id of ['measurement-summary','results-section']) within(id,'inicio','datos');
  for (const id of ['brand-section','presence-section']) within(id,'datos','agenda');
  for (const id of ['requests-section','activity-section','pilot-section']) {
    assert.ok(html.indexOf(`id="${id}"`) > start('operacion'), `${id} belongs to Operación`);
  }
  assert.match(html, /<details id="results-section"[^>]*><summary>Tablas, fuentes y evolución<\/summary>/);
});
