import { validEmail } from './commerce.js';

export const templateKinds = ['welcome', 'followup', 'invite', 'survey'];
const variables = new Set(['patient', 'doctor', 'booking_url', 'survey_url', 'location']);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return validEmail(email) ? email : null;
}

export function renderTemplate(value, data) {
  return String(value).replace(/{{\s*([a-z_]+)\s*}}/g, (match, key) => variables.has(key) ? String(data[key] ?? '') : match);
}

export function prepareEmail(clinic, template, data, to) {
  const recipient = normalizeEmail(to);
  if (!recipient || !/^#[0-9a-f]{6}$/i.test(clinic.brand_color || '#163f51')) throw new Error('Datos de correo inválidos');
  const subject = renderTemplate(template.subject, data).replace(/[\r\n]/g, ' ').trim();
  const text = renderTemplate(template.body, data).replace(/\r\n/g, '\n').trim();
  if (!subject || !text) throw new Error('Plantilla vacía');
  const color = clinic.brand_color || '#163f51';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f7f8;font-family:Arial,sans-serif;color:#24323a"><main style="max-width:600px;margin:24px auto;padding:28px;background:#fff;border-top:5px solid ${color}"><div style="white-space:pre-wrap;line-height:1.6">${escape(text)}</div></main></body></html>`;
  return { from:`${clinic.sender_name || clinic.doctor_name} <${clinic.sender_local_part}@orkestalo.com>`, reply_to:clinic.reply_to, to:[recipient], subject, text, html, template_version:template.version };
}

export function starterTemplates(proposal = {}) {
  const location = proposal.location?.value ? ` Nos vemos en ${String(proposal.location.value).slice(0, 250)}.` : '';
  const agenda = proposal.booking_url?.value ? ` Agenda: ${String(proposal.booking_url.value).slice(0, 300)}.` : '';
  return {
    welcome:{ subject:'Bienvenida al consultorio de {{doctor}}', body:`Hola {{patient}}, te damos la bienvenida al consultorio de {{doctor}}. Tu cita está confirmada.${location} Si necesitas cambiarla, usa el enlace de tu confirmación o responde a este correo.` },
    followup:{ subject:'Tu nueva cita con {{doctor}}', body:`Hola {{patient}}, tu siguiente cita con {{doctor}} está confirmada.${location}${agenda} Si necesitas cambiarla, usa el enlace de tu confirmación o responde a este correo.` },
    invite:{ subject:'Reserva tu cita con {{doctor}}', body:'Hola {{patient}}, {{doctor}} te invita a reservar tu cita. Elige un horario disponible y completa el anticipo aquí: {{booking_url}}. La cita se confirma cuando Cal.com complete el pago.' },
    survey:{ subject:'Tu opinión sobre la visita con {{doctor}}', body:'Gracias por visitar el consultorio de {{doctor}}. Si autorizaste la encuesta, puedes compartir tu experiencia aquí: {{survey_url}}' },
  };
}

export function extractSiteProposal(url, html) {
  const clean = String(html).slice(0, 250_000);
  const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
  const field = value => value ? { value:decode(value), source:url } : undefined;
  const title = clean.match(/<title[^>]*>([^<]{2,120})<\/title>/i)?.[1]?.split(/\s*[|–—]\s*/)[0];
  const email = clean.match(/href=["']mailto:([^"'?#\s]+)/i)?.[1];
  const color = clean.match(/<meta\s+[^>]*name=["']theme-color["'][^>]*content=["'](#[0-9a-f]{6})["']/i)?.[1];
  const agenda = clean.match(/https:\/\/(?:cal\.com|app\.cal\.com)\/[^"'\s<>\\]+/i)?.[0]?.replace(/&amp;/g, '&');
  let location;
  for (const script of clean.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const root = JSON.parse(script[1]);
      const nodes = [root];
      while (nodes.length) {
        const node = nodes.shift();
        if (!node || typeof node !== 'object') continue;
        if (node.streetAddress) { location = [node.streetAddress, node.addressLocality, node.addressRegion].filter(Boolean).join(', '); break; }
        nodes.push(...Object.values(node).filter(value => value && typeof value === 'object'));
      }
    } catch { /* Ignore malformed public schema. */ }
    if (location) break;
  }
  if (!location) location = clean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').match(/(?:Calle\s+)?[\p{L} ]+\s+\d{1,5},[^.<>]{5,100}(?:CDMX|Ciudad de México)/iu)?.[0];
  return Object.fromEntries(Object.entries({ name:field(title), email:validEmail(email) ? field(email) : undefined, color:field(color), booking_url:field(agenda), location:field(location) }).filter(([,value]) => value));
}
