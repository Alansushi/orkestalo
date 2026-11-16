import { db, json } from '../src/server/commerce.js';
import { syncSite } from '../src/server/measurement-sync.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return json(res, 401, { error: 'Sin acceso' });
  try {
    const sites = await db('measurement_sites', { query: '?active=eq.true&select=id,active,allowed_origins' });
    await Promise.all(sites.map(site => syncSite(site)));
    return json(res, 200, { ok: true, sites: sites.length });
  } catch (error) {
    console.error('Fallo de sincronización de medición', error);
    return json(res, 503, { error: 'Sincronización no disponible' });
  }
}
