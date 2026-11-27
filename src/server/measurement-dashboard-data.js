import { db as defaultDb } from './commerce.js';

const PAGE_SIZE = 1000;
const datasets = {
  daily: ['measurement_event_daily', 'site_id,day,page_views,visits,contact_clicks,form_submits', 'site_id.asc,day.asc'],
  sources: ['measurement_source_daily', 'site_id,day,source,medium,campaign,visits,contact_clicks,form_submits', 'site_id.asc,day.asc,source.asc,medium.asc,campaign.asc'],
  connections: ['measurement_connections', 'id,site_id,provider,last_synced_at,last_error', 'site_id.asc,provider.asc,id.asc'],
  external: ['measurement_daily_metrics', 'site_id,provider,day,campaign_ref,metric,value', 'site_id.asc,provider.asc,day.asc,campaign_ref.asc,metric.asc'],
  funnel: ['measurement_funnel', 'site_id,day,source,medium,campaign,visits,bookings,approved_payments,confirmed_appointments', 'site_id.asc,day.asc,source.asc,medium.asc,campaign.asc'],
  actions: ['measurement_action_daily', 'site_id,day,path,name,label,events', 'site_id.asc,day.asc,path.asc,name.asc,label.asc'],
  pages: ['measurement_page_30d', 'site_id,path,page_views,visits', 'site_id.asc,path.asc'],
  transitions: ['measurement_transition_30d', 'site_id,from_path,to_path,transitions', 'site_id.asc,from_path.asc,to_path.asc'],
};

async function allRows(db, table, params) {
  const rows = [];
  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    const page = await db(table, { query: `?${params}&limit=${PAGE_SIZE}&offset=${offset}` });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new Error(`Demasiadas filas en ${table}`);
}

export async function loadMeasurementDashboard({ siteId, db = defaultDb, now = new Date() } = {}) {
  const since = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const scope = siteId ? `&site_id=eq.${encodeURIComponent(siteId)}` : '';
  const sites = await allRows(db, 'measurement_sites', `select=id,slug,name,active${siteId ? `&id=eq.${encodeURIComponent(siteId)}` : ''}&order=name.asc,id.asc`);
  const entries = await Promise.all(Object.entries(datasets).map(async ([key, [table, columns, order]]) => {
    const period = ['connections', 'pages', 'transitions'].includes(key) ? '' : `&day=gte.${since}`;
    try { return [key, await allRows(db, table, `select=${columns}${scope}${period}&order=${order}`), false]; }
    catch (error) {
      if (['pages', 'transitions'].includes(key) && error.message === 'Supabase 404') return [key, [], true];
      throw error;
    }
  }));
  return { since, updatedAt: now.toISOString(), sites, navigationPending: entries.some(([, , pending]) => pending),
    ...Object.fromEntries(entries.map(([key, rows]) => [key, rows])) };
}

export async function loadClinicMeasurement(clinic, clinicId, { db = defaultDb, now = new Date() } = {}) {
  const [link] = await db('clinic_measurement_links', { query: `?clinic_id=eq.${encodeURIComponent(clinicId)}&select=site_id,verified_at&limit=1` });
  if (!link?.verified_at || !clinic.website_url) return { status: 'sin datos verificados' };
  const [site] = await db('measurement_sites', { query: `?id=eq.${encodeURIComponent(link.site_id)}&select=id,allowed_origins,active&limit=1` });
  let origin;
  try { origin = new URL(clinic.website_url).origin; } catch { return { status: 'sin datos verificados' }; }
  if (!site?.allowed_origins?.includes(origin)) return { status: 'sin datos verificados' };
  return { status: 'verificado', dataset: await loadMeasurementDashboard({ siteId: site.id, db, now }) };
}
