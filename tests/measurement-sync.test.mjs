import test from 'node:test';
import assert from 'node:assert/strict';
import { lighthouseMetrics, cruxMetrics } from '../src/server/measurement-sync.js';

test('PageSpeed lab metrics are stored separately from real CrUX p75 metrics', () => {
  assert.deepEqual(lighthouseMetrics({ lighthouseResult: { audits: {
    'largest-contentful-paint': { numericValue: 2310.4 },
    'cumulative-layout-shift': { numericValue: 0.12 },
  } } }), [{ metric: 'lcp_ms', value: 2310.4 }, { metric: 'cls_milli', value: 120 }]);
  assert.deepEqual(cruxMetrics({ record: { metrics: {
    largest_contentful_paint: { percentiles: { p75: 2500 } },
    cumulative_layout_shift: { percentiles: { p75: '0.05' } },
    interaction_to_next_paint: { percentiles: { p75: 180 } },
  } } }), [
    { metric: 'lcp_ms', value: 2500 },
    { metric: 'cls_milli', value: 50 },
    { metric: 'inp_ms', value: 180 },
  ]);
  assert.deepEqual(cruxMetrics({}), []);
});
