import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { verifyCalWebhook, appointmentFromCal, clinicForUser, welcomeMessage, surveyMessage, surveyToken, matchingManualAppointment, surveyConsentRecord, paymentInvitationMessage } from '../src/server/consultorio.js';
import panel from '../api/consultorio.js';
import calWebhook from '../src/server/consultorio-endpoints/cal-webhook.js';
import survey from '../src/server/consultorio-endpoints/consultorio-survey.js';
import resendWebhook from '../src/server/consultorio-endpoints/consultorio-email-webhook.js';
import { Webhook } from 'svix';

function response() { return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(value) { this.body = JSON.parse(value); } }; }

test('private panel rejects requests without a verified doctor', async () => {
  const res = response();
  await panel({ method: 'GET', url: '/api/consultorio?clinic=00000000-0000-0000-0000-000000000001', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('two clinics remain isolated at the private API boundary', async () => {
  const a = '00000000-0000-0000-0000-000000000001', b = '00000000-0000-0000-0000-000000000002';
  const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY = 'secret';
  const queried = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    if (parsed.pathname === '/auth/v1/user') return Response.json({ id: 'doctor-a' });
    const table = parsed.pathname.split('/').at(-1); queried.push(table);
    if (table === 'clinic_memberships') return Response.json(parsed.searchParams.get('clinic_id') === `eq.${a}` ? [{ clinic_id:a, user_id:'doctor-a', active:true }] : []);
    if (table === 'clinics') return Response.json([{ id:a, name:'Consultorio A', doctor_name:'Dra. A' }]);
    return Response.json([]);
  };
  try {
    const denied = response(); await panel({ method:'GET', url:`/api/consultorio?clinic=${b}`, headers:{ authorization:'Bearer doctor-token' } }, denied);
    assert.equal(denied.statusCode, 401); assert.deepEqual(queried, ['clinic_memberships']);
    const allowed = response(); await panel({ method:'GET', url:`/api/consultorio?clinic=${a}`, headers:{ authorization:'Bearer doctor-token' } }, allowed);
    assert.equal(allowed.statusCode, 200); assert.equal(allowed.body.clinic.id, a);
  } finally { globalThis.fetch = oldFetch; if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl; if (oldKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldKey; }
});

test('Cal callback rejects an unsigned booking before database mutation', async () => {
  const res = response();
  await calWebhook({ method: 'POST', url: '/api/cal-webhook?clinic=00000000-0000-0000-0000-000000000001', headers: { 'x-cal-signature-256': 'bad' } }, res);
  assert.equal(res.statusCode, 401);
});

test('survey tokens are stable for retry and bound to one appointment', () => {
  assert.equal(surveyToken('appointment-a', 'key'), surveyToken('appointment-a', 'key'));
  assert.notEqual(surveyToken('appointment-a', 'key'), surveyToken('appointment-b', 'key'));
});

test('survey rejects invalid token before writing', async () => {
  const res = response();
  await survey({ method: 'POST', body: { token: 'bad', rating: 5, comment: '' } }, res);
  assert.equal(res.statusCode, 400);
});

test('email callback rejects missing signature before writing', async () => {
  const res = response();
  await resendWebhook({ method: 'POST', headers: {}, url: '/api/consultorio-email-webhook' }, res);
  assert.equal(res.statusCode, 401);
});

test('verified Resend delivery updates only its provider message ID', async () => {
  const secret = `whsec_${Buffer.from('a-signing-secret-at-least-32-bytes').toString('base64')}`;
  const verifier = new Webhook(secret), id = 'msg_test', time = new Date(), raw = JSON.stringify({ type:'email.delivered', data:{ email_id:'resend-42' } });
  const oldSecret = process.env.RESEND_WEBHOOK_SECRET, oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_SECRET_KEY;
  Object.assign(process.env, { RESEND_WEBHOOK_SECRET:secret, SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'secret' });
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, body:JSON.parse(options.body) }); return Response.json([]); };
  try {
    const res = response();
    await resendWebhook({ method:'POST', url:'/api/consultorio-email-webhook', rawBody:raw, headers:{ 'svix-id':id, 'svix-timestamp':String(Math.floor(time.getTime()/1000)), 'svix-signature':verifier.sign(id,time,raw) } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 3);
    assert.ok(calls.slice(1).every(call => call.url.includes('resend_id=eq.resend-42')));
    assert.equal(calls[0].body.status, 'delivered');
  } finally {
    globalThis.fetch = oldFetch;
    for (const [key,value] of Object.entries({ RESEND_WEBHOOK_SECRET:oldSecret, SUPABASE_URL:oldUrl, SUPABASE_SECRET_KEY:oldKey })) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('Cal webhook requires a valid signature over the raw body', () => {
  const body = JSON.stringify({ triggerEvent: 'BOOKING_CREATED', payload: { bookingId: 42 } });
  const signature = createHmac('sha256', 'clinic-secret').update(body).digest('hex');
  assert.equal(verifyCalWebhook(body, signature, 'clinic-secret'), true);
  assert.equal(verifyCalWebhook(body + ' ', signature, 'clinic-secret'), false);
  assert.equal(verifyCalWebhook(body, signature, 'other-secret'), false);
});

test('Cal booking events keep pending payment and cancellation distinct', () => {
  const payload = { uid: 'abc', bookingId: 42, startTime: '2026-12-01T15:00:00Z', endTime: '2026-12-01T15:30:00Z', organizer: { email: 'doc@example.com' }, attendees: [{ name: 'Ana', email: 'ana@example.com' }] };
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_REQUESTED', payload }).status, 'pending');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_CREATED', payload }).status, 'confirmed');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_PAID', payload: { ...payload, status:'ACCEPTED' } }).status, 'confirmed');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_CANCELLED', payload }).status, 'cancelled');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_PAYMENT_INITIATED', payload }).status, 'pending');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_NO_SHOW_UPDATED', payload: { bookingUid:'abc', attendees:[{ email:'ana@example.com', noShow:true }] } }).status, 'missed');
  assert.equal(appointmentFromCal({ triggerEvent:'BOOKING_PAID', payload:{ ...payload, status:'REJECTED' } })?.status, 'pending');
  assert.equal(appointmentFromCal({ triggerEvent: 'BOOKING_CREATED', payload }).patient_email, 'ana@example.com');
});

test('Cal no-show payload is identified by booking UID and attendee flag', () => {
  const event = { triggerEvent:'BOOKING_NO_SHOW_UPDATED', createdAt:'2026-12-01T16:00:00Z', payload:{ bookingUid:'abc', attendees:[{ email:'ana@example.com', noShow:true }] } };
  assert.deepEqual(appointmentFromCal(event), { cal_uid:'abc', patient_email:'ana@example.com', status:'missed', cal_event_at:'2026-12-01T16:00:00Z' });
});

test('paid Cal booking stays pending until an accepted payment event', async () => {
  const clinicId = '00000000-0000-0000-0000-000000000001';
  const appointmentId = '00000000-0000-0000-0000-000000000002';
  const inviteId = '00000000-0000-0000-0000-000000000003';
  const oldFetch = globalThis.fetch, oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY = 'secret';
  let appointment, inviteConfirmed = false;
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url), table = parsed.pathname.split('/').at(-1), body = options.body && JSON.parse(options.body);
    if (table === 'clinics') return Response.json([{ id:clinicId, cal_webhook_secret:'secret', cal_event_type_id:1, cal_paid_event_type_id:2, welcome_enabled:false }]);
    if (table === 'clinic_cal_aliases') return Response.json([]);
    if (table === 'clinic_appointments') {
      if (options.method === 'POST') { appointment = { id:appointmentId, clinic_id:clinicId, ...body }; return Response.json([appointment]); }
      if (options.method === 'PATCH') { appointment = { ...appointment, ...body }; return Response.json([appointment]); }
      return Response.json(appointment ? [appointment] : []);
    }
    if (table === 'clinic_payment_invites') { inviteConfirmed = body?.status === 'confirmed'; return Response.json([{ id:inviteId, ...body }]); }
    return Response.json([]);
  };
  const payload = { uid:'paid-uid', eventTypeId:2, startTime:'2026-12-01T15:00:00Z', endTime:'2026-12-01T15:30:00Z', attendees:[{ name:'Ana', email:'ana@example.com' }], responses:{ orkesta_invite:inviteId } };
  const send = async (triggerEvent, status, createdAt) => {
    const rawBody = JSON.stringify({ triggerEvent, createdAt, payload:{ ...payload, ...(status ? { status } : {}) } });
    const res = response();
    await calWebhook({ method:'POST', url:`/api/consultorio-misc?route=cal&clinic=${clinicId}`, headers:{ 'x-cal-signature-256':createHmac('sha256','secret').update(rawBody).digest('hex') }, rawBody }, res);
    assert.equal(res.statusCode, 200);
  };
  try {
    await send('BOOKING_CREATED', null, '2026-11-20T10:00:00Z');
    assert.equal(appointment.status, 'pending');
    await send('BOOKING_PAID', 'REJECTED', '2026-11-20T10:01:00Z');
    assert.equal(appointment.status, 'pending');
    await send('BOOKING_PAID', 'ACCEPTED', '2026-11-20T10:02:00Z');
    assert.equal(appointment.status, 'confirmed');
    assert.equal(inviteConfirmed, true);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldKey;
  }
});

test('WhatsApp placeholder is matched to its Cal booking without losing survey consent', () => {
  const manual = { id:'manual', source:'whatsapp', status:'unregistered', patient_email:'ana@example.com', starts_at:'2026-12-01T15:00:00+00:00', survey_allowed:true };
  assert.equal(matchingManualAppointment([manual], { patient_email:'ana@example.com', starts_at:'2026-12-01T15:00:00Z' })?.id, 'manual');
  assert.equal(matchingManualAppointment([manual], { patient_email:'other@example.com', starts_at:'2026-12-01T15:00:00Z' }), null);
});

test('survey authorization records version and time only when granted', () => {
  const granted = surveyConsentRecord(true);
  assert.equal(granted.survey_allowed, true);
  assert.match(granted.survey_allowed_at, /^\d{4}-/);
  assert.equal(granted.survey_consent_version, 'consultorio-encuesta-v1');
  assert.deepEqual(surveyConsentRecord(false), { survey_allowed:false, survey_allowed_at:null, survey_consent_version:null });
});

test('clinic lookup authorizes only explicit active membership', () => {
  assert.equal(clinicForUser([{ clinic_id: 'a', user_id: 'u', active: true }], 'u', 'a'), 'a');
  assert.equal(clinicForUser([{ clinic_id: 'a', user_id: 'u', active: true }], 'u', 'b'), null);
  assert.equal(clinicForUser([{ clinic_id: 'a', user_id: 'u', active: false }], 'u', 'a'), null);
});

test('automated messages contain general guidance and a brief survey', () => {
  assert.match(welcomeMessage({ doctor: 'Dra. López', patient: 'Ana' }), /Dra\. López/);
  assert.doesNotMatch(welcomeMessage({ doctor: 'Dra. López', patient: 'Ana' }), /diagnóstico|tratamiento/i);
  assert.match(surveyMessage({ doctor: 'Dra. López', url: 'https://www.orkestalo.com/encuesta/t' }), /https:\/\/www\.orkestalo\.com\/encuesta\/t/);
});

test('payment invitation sends the patient to the clinic Cal.com link', () => {
  const text = paymentInvitationMessage({ doctor:'Dra. López', patient:'Ana', url:'https://cal.com/dra-lopez/consulta' });
  assert.match(text, /Ana/);
  assert.match(text, /https:\/\/cal\.com\/dra-lopez\/consulta/);
  assert.match(text, /Cal\.com/);
});

test('build publishes private clinic and survey entry points without indexing them', async () => {
  const panel = await readFile(new URL('../public/consultorio/index.html', import.meta.url), 'utf8');
  const survey = await readFile(new URL('../public/encuesta/index.html', import.meta.url), 'utf8');
  assert.match(panel, /Panel del consultorio/);
  assert.match(panel, /noindex/);
  assert.match(survey, /Califica tu visita/);
  assert.match(survey, /noindex/);
});

test('clinic panel offers email-code access for newly provisioned doctors', async () => {
  const panel = await readFile(new URL('../public/consultorio/index.html', import.meta.url), 'utf8');
  assert.match(panel, /id="code-form"/);
  assert.match(panel, /Código de acceso/);
  const client = await readFile(new URL('../src/consultorio/app.js', import.meta.url), 'utf8');
  assert.match(client, /otp\?redirect_to=/);
  assert.doesNotMatch(client, /email_redirect_to/);
  assert.match(client, /location\.hash/);
});
