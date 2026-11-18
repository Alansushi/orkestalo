import { db, json } from '../src/server/commerce.js';
import { isOwner } from '../src/server/measurement-auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  try {
    if (!await isOwner(req)) return json(res, 401, { error: 'Acceso requerido' });
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [sites, daily, sources, connections, external, funnel, actions] = await Promise.all([
      db('measurement_sites', { query: '?select=id,slug,name,active&order=name.asc' }),
      db('measurement_event_daily', { query: `?select=site_id,day,page_views,visits,contact_clicks,form_submits&day=gte.${since}&order=day.asc&limit=1000` }),
      db('measurement_source_daily', { query: `?select=site_id,day,source,medium,campaign,visits,contact_clicks,form_submits&day=gte.${since}&limit=1000` }),
      db('measurement_connections', { query: '?select=site_id,provider,last_synced_at,last_error&limit=1000' }),
      db('measurement_daily_metrics', { query: `?select=site_id,provider,day,campaign_ref,metric,value&day=gte.${since}&limit=1000` }),
      db('measurement_funnel', { query: `?select=site_id,day,source,medium,campaign,visits,bookings,approved_payments,confirmed_appointments&day=gte.${since}&limit=1000` }),
      db('measurement_action_daily', { query: `?select=site_id,day,path,name,label,events&day=gte.${since}&limit=1000` }),
    ]);
    return json(res, 200, { since, sites, daily, sources, connections, external, funnel, actions });
  } catch (error) {
    console.error('Fallo del panel de medición', error);
    return json(res, 503, { error: 'Panel no disponible' });
  }
}
