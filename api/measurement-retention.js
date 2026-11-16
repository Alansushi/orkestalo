import { db, json } from '../src/server/commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return json(res, 401, { error: 'Sin acceso' });
  try {
    const sites = await db('measurement_sites', { query: '?select=id,retention_days' });
    for (const site of sites) {
      const before = new Date(Date.now() - site.retention_days * 86400000).toISOString();
      const siteFilter = encodeURIComponent(site.id);
      const cutoff = encodeURIComponent(before);
      await db('measurement_events', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&occurred_at=lt.${cutoff}`, prefer: 'return=minimal' });
      await db('measurement_contacts', { method: 'DELETE', query: `?site_id=eq.${siteFilter}&created_at=lt.${cutoff}`, prefer: 'return=minimal' });
    }
    return json(res, 200, { ok: true, sites: sites.length });
  } catch (error) {
    console.error('Fallo de conservación de medición', error);
    return json(res, 503, { error: 'Conservación no disponible' });
  }
}
