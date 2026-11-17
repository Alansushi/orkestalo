import { db } from './commerce.js';

export function monthlyPeriod(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start),
    key: start.toISOString().slice(0, 7),
  };
}

export function monthlyReportText(period, sites, daily, connections) {
  const lines = [`Medición de sitios · ${period.label}`, '', 'Resumen por sitio:'];
  for (const site of sites) {
    const rows = daily.filter(row => row.site_id === site.id);
    const sum = key => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    lines.push(`${site.name}: ${sum('visits')} visitas, ${sum('contact_clicks')} clics de contacto, ${sum('form_submits')} formularios enviados.`);
    for (const connection of connections.filter(row => row.site_id === site.id && row.last_error)) {
      lines.push(`  ${connection.provider}: ${connection.last_error}`);
    }
  }
  lines.push('', 'Los clics de contacto expresan intención; no confirman mensajes ni citas.');
  return lines.join('\n');
}

export async function sendMonthlyReport(now = new Date()) {
  if (now.getUTCDate() !== 1) return { sent: false, reason: 'not_due' };
  if (!process.env.MEASUREMENT_REPORT_EMAIL || !process.env.RESEND_API_KEY || !process.env.ORKESTA_EMAIL_FROM) {
    return { sent: false, reason: 'not_configured' };
  }
  const period = monthlyPeriod(now);
  const sites = await db('measurement_sites', { query: '?active=eq.true&select=id,name,active' });
  if (!sites.length) return { sent: false, reason: 'no_active_sites' };
  const [daily, connections] = await Promise.all([
    db('measurement_event_daily', { query: `?select=site_id,visits,contact_clicks,form_submits&day=gte.${period.start}&day=lt.${period.end}&limit=1000` }),
    db('measurement_connections', { query: '?select=site_id,provider,last_error&limit=1000' }),
  ]);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `measurement-monthly-${period.key}` },
    body: JSON.stringify({ from: process.env.ORKESTA_EMAIL_FROM, to: [process.env.MEASUREMENT_REPORT_EMAIL],
      subject: `Medición de sitios · ${period.label}`, text: monthlyReportText(period, sites, daily, connections) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Correo ${response.status}`);
  return { sent: true, period: period.key };
}
