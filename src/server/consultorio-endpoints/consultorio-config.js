import { json } from '../commerce.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método no permitido' });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return json(res, 503, { error: 'Piloto no configurado' });
  return json(res, 200, { url, key });
}
