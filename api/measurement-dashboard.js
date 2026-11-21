import { json } from '../src/server/commerce.js';
import { isOwner } from '../src/server/measurement-auth.js';
import { loadMeasurementDashboard } from '../src/server/measurement-dashboard-data.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  try {
    if (!await isOwner(req)) return json(res, 401, { error: 'Acceso requerido' });
    return json(res, 200, await loadMeasurementDashboard());
  } catch (error) {
    console.error('Fallo del panel de medición', error);
    return json(res, 503, { error: 'Panel no disponible' });
  }
}
