import { db } from './commerce.js';

const NAMES = new Set(['page_view', 'section_view', 'contact_click', 'form_start', 'form_submit', 'site_error']);
const CHANNELS = new Set(['whatsapp', 'phone', 'email', 'form']);
const LABELS = new Set(['hero', 'nav', 'services', 'about', 'faq', 'booking', 'contact', 'footer', 'form', 'other']);
const INPUT_KEYS = new Set(['site', 'events']);
const EVENT_KEYS = new Set(['id', 'session', 'name', 'path', 'label', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE = /^[\p{L}\p{N} _.-]+$/u;

function short(value, max) {
  return typeof value === 'string' && value.length <= max && SAFE.test(value) ? value : null;
}

export function validateMeasurement(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !INPUT_KEYS.has(k))) return null;
  if (typeof input.site !== 'string' || !/^[a-z0-9-]{3,60}$/.test(input.site) || !Array.isArray(input.events) || input.events.length < 1 || input.events.length > 20) return null;
  const events = [];
  for (const item of input.events) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(k => !EVENT_KEYS.has(k))) return null;
    if (!UUID.test(item.id) || !UUID.test(item.session) || !NAMES.has(item.name) || item.path !== '/') return null;
    if (item.label != null && !LABELS.has(item.label)) return null;
    if (item.channel != null && !CHANNELS.has(item.channel)) return null;
    if (item.name === 'contact_click' && !item.channel) return null;
    const row = { event_id: item.id, session_id: item.session, name: item.name, path: item.path };
    for (const key of ['label', 'channel', 'utm_source', 'utm_medium', 'utm_campaign', 'referrer_host']) {
      if (item[key] != null) {
        const max = key === 'referrer_host' ? 160 : key === 'label' ? 80 : 100;
        const clean = short(item[key], max);
        if (!clean) return null;
        row[key] = clean;
      }
    }
    events.push(row);
  }
  return { site: input.site, events };
}

export function exactOrigin(origin, allowed) {
  if (typeof origin !== 'string' || !Array.isArray(allowed)) return false;
  try {
    const parsed = new URL(origin);
    return parsed.origin === origin && parsed.protocol === 'https:' && allowed.includes(origin);
  } catch { return false; }
}

export async function siteForCapture(slug, origin) {
  const sites = await db('measurement_sites', { query: `?slug=eq.${encodeURIComponent(slug)}&select=id,active,allowed_origins&limit=1` });
  const site = sites[0];
  return site?.active && exactOrigin(origin, site.allowed_origins) ? site : null;
}

export async function ownerFromToken(token) {
  if (!token || !process.env.MEASUREMENT_OWNER_USER_ID || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return false;
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user.id === process.env.MEASUREMENT_OWNER_USER_ID;
}
