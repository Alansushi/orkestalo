import { db, json } from '../src/server/commerce.js';
import { syncSite } from '../src/server/measurement-sync.js';
import { sendMonthlyReport } from '../src/server/measurement-report.js';

async function pruneExpiredData() {
  const sites = await db('measurement_sites', { query: '?select=id,retention_days' });
  for (const site of sites) {
    const before = new Date(Date.now() - site.retention_days * 86400000).toISOString();
    const siteFilter = encodeURIComponent(site.id);
    const cutoff = encodeURIComponent(before);
    await db('measurement_events', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&occurred_at=lt.${cutoff}`, prefer: 'return=minimal' });
    await db('measurement_conversions', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&occurred_at=lt.${cutoff}`, prefer: 'return=minimal' });
    await db('measurement_revocations', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&revoked_at=lt.${cutoff}`, prefer: 'return=minimal' });
    await db('measurement_contacts', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&created_at=lt.${cutoff}`, prefer: 'return=minimal' });
  }
  return sites.length;
}

async function syncActiveSites() {
  const sites = await db('measurement_sites', { query: '?active=eq.true&select=id,active,allowed_origins' });
  await Promise.all(sites.map(site => syncSite(site)));
  return sites.length;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return json(res, 401, { error: 'Sin acceso' });
  try {
    const [retainedSites, syncedSites, report] = await Promise.all([pruneExpiredData(), syncActiveSites(), sendMonthlyReport()]);
    return json(res, 200, { ok: true, retainedSites, syncedSites, report });
  } catch (error) {
    console.error('Fallo de mantenimiento de medición', error);
    return json(res, 503, { error: 'Mantenimiento no disponible' });
  }
}
