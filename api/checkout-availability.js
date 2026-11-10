import { campaignOpen, checkoutReady, json } from '../src/server/commerce.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  return json(res, 200, { available: campaignOpen() && checkoutReady() });
}
