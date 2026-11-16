import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPeriod, monthlyReportText, sendMonthlyReport } from '../src/server/measurement-report.js';

test('monthly report covers the previous complete month', () => {
  assert.deepEqual(monthlyPeriod(new Date('2026-12-01T13:00:00Z')), {
    start: '2026-11-01', end: '2026-12-01', label: 'noviembre de 2026', key: '2026-11',
  });
});

test('monthly report keeps medical contacts out of the email', () => {
  const report = monthlyReportText({ label: 'noviembre de 2026' },
    [{ id: 'ana', name: 'Dra. Ana', active: true }],
    [{ site_id: 'ana', visits: 12, contact_clicks: 3, form_submits: 1 }],
    [{ site_id: 'ana', provider: 'pagespeed', last_error: 'No disponible' }]);
  assert.match(report, /Dra\. Ana: 12 visitas, 3 clics de contacto, 1 formularios enviados/);
  assert.match(report, /pagespeed: No disponible/);
  assert.doesNotMatch(report, /nombre|correo|teléfono|paciente/i);
});

test('monthly report mails the configured recipient once per period key', async () => {
  const original = { fetch: global.fetch, email: process.env.MEASUREMENT_REPORT_EMAIL, key: process.env.RESEND_API_KEY, from: process.env.ORKESTA_EMAIL_FROM, url: process.env.SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY };
  Object.assign(process.env, { MEASUREMENT_REPORT_EMAIL: 'reports@example.com', RESEND_API_KEY: 'mail-secret', ORKESTA_EMAIL_FROM: 'Orkesta <info@example.com>', SUPABASE_URL: 'https://db.example.test', SUPABASE_SECRET_KEY: 'server-secret' });
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('measurement_sites')) return new Response(JSON.stringify([{ id: 'ana', name: 'Dra. Ana', active: true }]), { status: 200 });
    if (String(url).includes('measurement_event_daily')) return new Response(JSON.stringify([{ site_id: 'ana', visits: 12, contact_clicks: 3, form_submits: 1 }]), { status: 200 });
    if (String(url).includes('measurement_connections')) return new Response(JSON.stringify([]), { status: 200 });
    return new Response('{}', { status: 200 });
  };
  try {
    assert.deepEqual(await sendMonthlyReport(new Date('2026-12-01T13:00:00Z')), { sent: true, period: '2026-11' });
    const mail = calls.find(call => call.url === 'https://api.resend.com/emails');
    assert.deepEqual(JSON.parse(mail.options.body).to, ['reports@example.com']);
    assert.equal(mail.options.headers['Idempotency-Key'], 'measurement-monthly-2026-11');
  } finally {
    global.fetch = original.fetch;
    for (const [key, value] of [['MEASUREMENT_REPORT_EMAIL',original.email], ['RESEND_API_KEY',original.key], ['ORKESTA_EMAIL_FROM',original.from], ['SUPABASE_URL',original.url], ['SUPABASE_SECRET_KEY',original.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
