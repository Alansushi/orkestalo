import { Webhook } from 'svix';
import { db, json } from '../commerce.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const id = req.headers?.['svix-id'], timestamp = req.headers?.['svix-timestamp'], signature = req.headers?.['svix-signature'];
  if (!id || !timestamp || !signature || !process.env.RESEND_WEBHOOK_SECRET) return json(res, 401, { error: 'Firma inválida' });
  try {
    let raw = req.rawBody;
    if (typeof raw !== 'string') { const chunks = []; let size = 0; for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 100_000) return json(res, 413, { error: 'Mensaje demasiado grande' }); chunks.push(bytes); } raw = Buffer.concat(chunks).toString('utf8'); }
    new Webhook(process.env.RESEND_WEBHOOK_SECRET).verify(raw, { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature });
    const event = JSON.parse(raw);
    const status = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.failed': 'failed', 'email.suppressed': 'bounced' }[event.type];
    const emailId = event.data?.email_id;
    if (status && typeof emailId === 'string' && emailId.length < 200) {
      await db('clinic_email_events', { method:'POST', query:'?on_conflict=svix_id', body:{ svix_id:id, resend_id:emailId, status }, prefer:'resolution=ignore-duplicates,return=minimal' });
      const guard = status === 'failed' ? '&status=not.in.(bounced,delivered)' : status === 'delivered' ? '&status=neq.bounced' : '';
      const inviteGuard = status === 'failed' ? '&email_status=not.in.(bounced,delivered)' : status === 'delivered' ? '&email_status=neq.bounced' : '';
      await db('clinic_messages', { method: 'PATCH', query: `?resend_id=eq.${encodeURIComponent(emailId)}${guard}`, body: { status, ...(status === 'failed' || status === 'bounced' ? { last_error: event.type } : {}) } });
      await db('clinic_payment_invites', { method:'PATCH', query:`?resend_id=eq.${encodeURIComponent(emailId)}${inviteGuard}`, body:{ email_status:status } });
    }
    return json(res, 200, { ok: true });
  } catch (error) { console.error('Resend webhook', error); return json(res, 401, { error: 'Firma o evento inválido' }); }
}
