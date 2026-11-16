import { db } from './commerce.js';

function metric(metric, value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? { metric, value: Number(number.toFixed(3)) } : null;
}

export function lighthouseMetrics(data) {
  const audits = data?.lighthouseResult?.audits || {};
  return [
    metric('lcp_ms', audits['largest-contentful-paint']?.numericValue),
    metric('cls_milli', Number(audits['cumulative-layout-shift']?.numericValue) * 1000),
  ].filter(Boolean);
}

export function cruxMetrics(data) {
  const metrics = data?.record?.metrics || {};
  return [
    metric('lcp_ms', metrics.largest_contentful_paint?.percentiles?.p75),
    metric('cls_milli', Number(metrics.cumulative_layout_shift?.percentiles?.p75) * 1000),
    metric('inp_ms', metrics.interaction_to_next_paint?.percentiles?.p75),
  ].filter(Boolean);
}

async function store(siteId, provider, day, values) {
  if (!values.length) return;
  await db('measurement_daily_metrics', {
    method: 'POST', query: '?on_conflict=site_id,provider,day,campaign_ref,metric',
    body: values.map(({ metric, value }) => ({ site_id: siteId, provider, day, campaign_ref: '', metric, value })),
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function connection(siteId, provider, error = null) {
  await db('measurement_connections', {
    method: 'POST', query: '?on_conflict=site_id,provider,account_ref',
    body: { site_id: siteId, provider, account_ref: '', last_synced_at: error ? null : new Date().toISOString(), last_error: error },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function runProvider(site, provider, day, action) {
  try {
    const values = await action();
    await store(site.id, provider, day, values);
    await connection(site.id, provider, values.length ? null : 'Sin datos disponibles');
  } catch (error) {
    const code = error.message === 'Sin clave API' || /^HTTP \d{3}$/.test(error.message) ? error.message : 'Error de conexión';
    await connection(site.id, provider, code);
  }
}

async function checkedJson(response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function syncSite(site, day = new Date().toISOString().slice(0, 10)) {
  const origin = site.allowed_origins?.[0];
  if (!site.active || !origin || new URL(origin).protocol !== 'https:') return;
  await Promise.all([
    runProvider(site, 'uptime', day, async () => {
      const response = await fetch(origin, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(12000) });
      return [metric('availability_percent', response.status >= 200 && response.status < 400 ? 100 : 0)];
    }),
    runProvider(site, 'pagespeed', day, async () => {
      const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
      url.searchParams.set('url', origin);
      url.searchParams.set('strategy', 'mobile');
      if (process.env.GOOGLE_PERFORMANCE_API_KEY) url.searchParams.set('key', process.env.GOOGLE_PERFORMANCE_API_KEY);
      const data = await checkedJson(await fetch(url, { signal: AbortSignal.timeout(45000) }));
      return lighthouseMetrics(data);
    }),
    runProvider(site, 'crux', day, async () => {
      if (!process.env.GOOGLE_PERFORMANCE_API_KEY) throw new Error('Sin clave API');
      const url = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(process.env.GOOGLE_PERFORMANCE_API_KEY)}`;
      const data = await checkedJson(await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origin, formFactor: 'PHONE', metrics: ['largest_contentful_paint','cumulative_layout_shift','interaction_to_next_paint'] }), signal: AbortSignal.timeout(20000) }));
      return cruxMetrics(data);
    }),
  ]);
}
