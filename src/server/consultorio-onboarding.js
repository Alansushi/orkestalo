import { isIP } from 'node:net';

function privateIp(address) {
  if (address.includes(':')) {
    const lower = address.toLowerCase();
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice(7);
      if (mapped.includes('.')) return privateIp(mapped);
      const parts = mapped.split(':').map(part => Number.parseInt(part, 16));
      if (parts.length === 2 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 65535)) return privateIp(`${parts[0] >> 8}.${parts[0] & 255}.${parts[1] >> 8}.${parts[1] & 255}`);
      return true;
    }
    return lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || /^fe[89ab]/.test(lower) || lower.startsWith('2001:db8:');
  }
  const parts = address.split('.').map(Number);
  const [a,b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19) || a === 192 && b === 0;
}

export function siteUrlAllowed(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (url.protocol !== 'https:' || url.port || url.username || url.password || !host.includes('.') || host === 'localhost' || /\.(?:localhost|local|internal|test|invalid)$/.test(host) || isIP(host) && privateIp(host)) return null;
    return url;
  } catch { return null; }
}

export function paidEventReady(event) {
  return Number(event?.price) > 0 && !!siteUrlAllowed(event?.bookingUrl) && ['cal.com','app.cal.com'].includes(new URL(event.bookingUrl).hostname) && event.bookingFields?.some(field => field.slug === 'orkesta_invite' && field.hidden === true && field.type === 'shortText') === true;
}

export function onboardingSteps({ clinic, connected, templates = [] }) {
  const approved = kind => templates.some(t => t.kind === kind && t.approved_at && t.tested_at && t.tested_revision === t.revision);
  const identity = !!clinic.sender_name && !!clinic.reply_to && !!clinic.identity_confirmed_at;
  const calendar = !!connected && !!clinic.cal_event_type_id && !!clinic.cal_webhook_ready;
  const privacy = !!clinic.privacy_accepted_at;
  return [
    { id:'identity', done:identity },
    { id:'calendar', done:calendar },
    { id:'content', done:identity },
    ...['welcome','followup','invite','survey'].map(kind => ({ id:kind, done:approved(kind) })),
    { id:'privacy', done:privacy },
    { id:'activate', done:identity && calendar && privacy && ['welcome','followup','invite','survey'].every(approved) && ['welcome','followup','survey'].every(kind => clinic[`${kind}_enabled`]) },
  ];
}

export function canActivateEmail({ clinic, connected, templates, kind }) {
  const steps = onboardingSteps({ clinic, connected, templates });
  if (!steps.find(step => step.id === 'identity')?.done || !steps.find(step => step.id === 'calendar')?.done || !steps.find(step => step.id === 'privacy')?.done || !steps.find(step => step.id === kind)?.done) return false;
  if (kind === 'invite' && (!clinic.cal_paid_event_type_id || !clinic.cal_paid_event_ready || !clinic.cal_paid_webhook_ready)) return false;
  return true;
}

export function isPrivateAddress(address) { return privateIp(address); }
