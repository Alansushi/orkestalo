import { json } from '../src/server/commerce.js';
import calWebhook from '../src/server/consultorio-endpoints/cal-webhook.js';
import configHandler from '../src/server/consultorio-endpoints/consultorio-config.js';
import surveyHandler from '../src/server/consultorio-endpoints/consultorio-survey.js';
import emailWebhook from '../src/server/consultorio-endpoints/consultorio-email-webhook.js';
import retryHandler from '../src/server/consultorio-endpoints/consultorio-retry.js';

export const config = { api: { bodyParser: false } };
const handlers = { cal:calWebhook, config:configHandler, survey:surveyHandler, email:emailWebhook, retry:retryHandler };

export default async function handler(req, res) {
  const route = new URL(req.url, 'https://www.orkestalo.com').searchParams.get('route') || (req.method === 'GET' ? 'retry' : null);
  const selected = handlers[route];
  if (!selected) return json(res, 404, { error:'Ruta no encontrada' });
  if (['cal','email','survey'].includes(route)) {
    if (typeof req.rawBody !== 'string') { const chunks=[]; let size=0; for await (const chunk of req) { const bytes=Buffer.from(chunk); size+=bytes.length; if (size>100_000) return json(res, 413, { error:'Solicitud demasiado grande' }); chunks.push(bytes); } req.rawBody=Buffer.concat(chunks).toString('utf8'); }
    if (route === 'survey') { try { req.body = JSON.parse(req.rawBody); } catch { return json(res, 400, { error:'Solicitud inválida' }); } }
  }
  return selected(req, res);
}
