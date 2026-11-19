import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEmail, renderTemplate, prepareEmail, extractSiteProposal, starterTemplates, templateKinds } from '../src/server/clinic-email-content.js';
import panel from '../api/consultorio.js';
import { claimFirstPatient, queueMessage, deliverMessage } from '../src/server/consultorio.js';
import calWebhook from '../src/server/consultorio-endpoints/cal-webhook.js';
import retryHandler from '../src/server/consultorio-endpoints/consultorio-retry.js';
import { createHmac } from 'node:crypto';

test('normalizes a patient address within a clinic', () => {
  assert.equal(normalizeEmail('  Ana@Example.COM  '), 'ana@example.com');
  assert.equal(normalizeEmail('bad address'), null);
});

test('approved template renders escaped HTML and matching plain text', () => {
  const email = prepareEmail({ id:'c', sender_name:'Dra. Ana', sender_local_part:'ana', reply_to:'ana@example.com', brand_color:'#2277aa' }, { version:2, subject:'Hola {{patient}}', body:'Hola {{patient}}, visita {{booking_url}}' }, { patient:'<Ana>', booking_url:'https://cal.com/ana' }, 'ana@example.com');
  assert.equal(email.subject, 'Hola <Ana>');
  assert.match(email.html, /&lt;Ana&gt;/);
  assert.doesNotMatch(email.html, /<Ana>/);
  assert.match(email.text, /https:\/\/cal.com\/ana/);
  assert.equal(email.from, 'Dra. Ana <ana@orkestalo.com>');
  assert.equal(email.template_version, 2);
  assert.equal(email.reply_to, 'ana@example.com');
});

test('site proposal records sources and omits prices and clinical claims', () => {
  const page = '<html><head><title>Dra. Ana Mora | Ortodoncia</title><meta name="theme-color" content="#123456"></head><body><a href="mailto:ana@example.com">Correo</a><a href="https://cal.com/ana/consulta">Agenda</a><p>Ameyalco 10, CDMX. Consulta $1000. Tratamiento garantizado.</p></body></html>';
  const proposal = extractSiteProposal('https://www.draanamora.com.mx/', page);
  assert.equal(proposal.name.value, 'Dra. Ana Mora');
  assert.equal(proposal.email.value, 'ana@example.com');
  assert.equal(proposal.color.value, '#123456');
  assert.equal(proposal.booking_url.value, 'https://cal.com/ana/consulta');
  assert.ok(Object.values(proposal).every(x => x.source === 'https://www.draanamora.com.mx/'));
  assert.equal(templateKinds.length, 4);
  assert.doesNotMatch(JSON.stringify(proposal), /1000|garantizado/);
});

test('site proposal does not treat JSON-LD fragments as a street address', () => {
  const page = '<script type="application/ld+json">{"streetAddress":"Ameyalco 10, PH Oficina 9","addressLocality":"Ciudad de México","addressRegion":"CDMX"}</script>';
  const proposal = extractSiteProposal('https://www.draanamora.com.mx/', page);
  assert.equal(proposal.location?.value, 'Ameyalco 10, PH Oficina 9, Ciudad de México, CDMX');
  assert.doesNotMatch(proposal.location.value, /addressLocality|addressRegion/);
});

test('site-informed drafts use sourced location and agenda without copying clinical claims', () => {
  const drafts=starterTemplates({ name:{ value:'Dra. Ana Mora' }, location:{ value:'Ameyalco 10, CDMX' }, booking_url:{ value:'https://cal.com/ana' } });
  assert.match(drafts.welcome.body, /Ameyalco 10, CDMX/);
  assert.match(drafts.followup.body, /https:\/\/cal.com\/ana/);
  assert.doesNotMatch(JSON.stringify(drafts), /precio|garantizad|diagnóstico/i);
});

test('doctor cannot approve a draft before a successful test send', async () => {
  const clinicId='00000000-0000-0000-0000-000000000001';
  const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY='key';
  globalThis.fetch=async (url) => {
    const path=new URL(url).pathname;
    if (path.endsWith('/auth/v1/user')) return Response.json({ id:'doctor', email:'doctor@example.com' });
    if (path.endsWith('/clinic_memberships')) return Response.json([{ clinic_id:clinicId, user_id:'doctor', active:true }]);
    if (path.endsWith('/clinics')) return Response.json([{ id:clinicId, doctor_name:'Dra. Ana', sender_local_part:'ana', reply_to:'doctor@example.com' }]);
    if (path.endsWith('/clinic_email_templates')) return Response.json([{ id:'template-1', clinic_id:clinicId, kind:'welcome', version:1, subject:'Hola', body:'Bienvenida', approved_at:null, tested_at:null }]);
    return Response.json([]);
  };
  const res={ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } };
  try {
    await panel({ method:'POST', url:`/api/consultorio?action=email-approve&clinic=${clinicId}`, headers:{ authorization:'Bearer doctor-token' }, body:{ id:'template-1' } }, res);
    assert.equal(res.statusCode, 409);
  } finally { globalThis.fetch=oldFetch; if (oldUrl===undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL=oldUrl; if (oldKey===undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY=oldKey; }
});

test('doctor cannot approve content edited after its test send', async () => {
  const clinicId='00000000-0000-0000-0000-000000000001';
  const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY='key';
  let approved=false;
  globalThis.fetch=async (url, options) => {
    const path=new URL(url).pathname;
    if (path.endsWith('/auth/v1/user')) return Response.json({ id:'doctor', email:'doctor@example.com' });
    if (path.endsWith('/clinic_memberships')) return Response.json([{ clinic_id:clinicId, user_id:'doctor', active:true }]);
    if (path.endsWith('/clinics')) return Response.json([{ id:clinicId, doctor_name:'Dra. Ana' }]);
    if (path.endsWith('/clinic_email_templates')) { if (options.method==='PATCH') approved=true; return Response.json([{ id:'tpl', revision:2, tested_revision:1, tested_at:'2026-11-18T00:00:00Z', approved_at:null }]); }
    return Response.json([]);
  };
  const res={ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } };
  try { await panel({ method:'POST', url:`/api/consultorio?action=email-approve&clinic=${clinicId}`, headers:{ authorization:'Bearer doctor-token' }, body:{ id:'tpl' } },res); assert.equal(res.statusCode,409); assert.equal(approved,false); }
  finally { globalThis.fetch=oldFetch; if (oldUrl===undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL=oldUrl; if (oldKey===undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY=oldKey; }
});

test('first confirmed appointment is claimed once per clinic and normalized email', async () => {
  const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY='key';
  const patients=new Map();
  globalThis.fetch=async (url, options) => {
    const path=new URL(url).pathname;
    if (!path.endsWith('/clinic_patients')) return Response.json([]);
    if (options.method==='POST') {
      const body=JSON.parse(options.body), key=`${body.clinic_id}:${body.email}`;
      if (patients.has(key)) return Response.json([]);
      patients.set(key, body); return Response.json([body]);
    }
    const query=new URL(url).searchParams, key=`${query.get('clinic_id').slice(3)}:${query.get('email').slice(3)}`;
    return Response.json(patients.has(key) ? [patients.get(key)] : []);
  };
  try {
    assert.equal(await claimFirstPatient({ id:'clinic-a' }, { id:'appointment-1', patient_email:' ANA@EXAMPLE.COM ' }), true);
    assert.equal(await claimFirstPatient({ id:'clinic-a' }, { id:'appointment-2', patient_email:'ana@example.com' }), false);
    assert.equal(await claimFirstPatient({ id:'clinic-b' }, { id:'appointment-3', patient_email:'ana@example.com' }), true);
  } finally { globalThis.fetch=oldFetch; if (oldUrl===undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL=oldUrl; if (oldKey===undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY=oldKey; }
});

test('queued email retries with its original approved content and sender', async () => {
  const oldFetch=globalThis.fetch, oldEnv={ SUPABASE_URL:process.env.SUPABASE_URL, SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY, RESEND_API_KEY:process.env.RESEND_API_KEY };
  Object.assign(process.env, { SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'key', RESEND_API_KEY:'resend-key' });
  let queued, sends=0; const bodies=[];
  globalThis.fetch=async (url, options) => {
    if (url==='https://api.resend.com/emails') { sends++; bodies.push(JSON.parse(options.body)); return sends===1 ? new Response('{}',{ status:503 }) : Response.json({ id:'resend-id' }); }
    const path=new URL(url).pathname;
    if (path.endsWith('/clinic_email_templates')) return Response.json([{ id:'tpl', kind:'welcome', version:3, subject:'Hola {{patient}}', body:'Texto aprobado de {{doctor}}', approved_at:'2026-11-18T00:00:00Z' }]);
    if (path.endsWith('/clinic_messages') && options.method==='POST') { queued={ id:'message-1', ...JSON.parse(options.body) }; return Response.json([queued]); }
    if (path.endsWith('/clinic_messages') && options.method==='PATCH') { queued={ ...queued, ...JSON.parse(options.body) }; return Response.json([queued]); }
    return Response.json([]);
  };
  try {
    const clinic={ id:'clinic', doctor_name:'Dra. Ana', sender_name:'Dra. Ana', sender_local_part:'ana', reply_to:'ana@example.com', brand_color:'#123456' };
    const appointment={ id:'appointment', patient_name:'Paciente', patient_email:'patient@example.com' };
    const message=await queueMessage(clinic, appointment, 'welcome');
    assert.equal(message.email_snapshot.template_version, 3);
    assert.equal(await deliverMessage(clinic, appointment, message), false);
    assert.equal(await deliverMessage({ ...clinic, sender_name:'Otra doctora', reply_to:'other@example.com' }, appointment, queued), true);
    assert.deepEqual(bodies[0], bodies[1]);
    assert.equal(bodies[1].from, 'Dra. Ana <ana@orkestalo.com>');
  } finally { globalThis.fetch=oldFetch; for (const [key,value] of Object.entries(oldEnv)) if (value===undefined) delete process.env[key]; else process.env[key]=value; }
});

test('analyzing a public site never replaces an approved template', async () => {
  const clinicId='00000000-0000-0000-0000-000000000001';
  const oldFetch=globalThis.fetch, oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY='key';
  let templateInserts=0, templateUpdates=0;
  globalThis.fetch=async (url, options={}) => {
    if (url.startsWith('https://www.draanamora.com.mx/')) return new Response('<title>Dra. Ana Mora</title>', { headers:{ 'content-type':'text/html' } });
    const path=new URL(url).pathname;
    if (path.endsWith('/auth/v1/user')) return Response.json({ id:'doctor', email:'doctor@example.com' });
    if (path.endsWith('/clinic_memberships')) return Response.json([{ clinic_id:clinicId, user_id:'doctor', active:true }]);
    if (path.endsWith('/clinics')) return Response.json([{ id:clinicId, website_url:'https://www.draanamora.com.mx/', doctor_name:'Dra. Ana' }]);
    if (path.endsWith('/clinic_email_templates')) {
      if (options.method==='POST') templateInserts++;
      if (options.method==='PATCH') templateUpdates++;
      return Response.json(['welcome','followup','invite','survey'].map(kind => ({ kind, version:2, approved_at:'2026-11-18T00:00:00Z' })));
    }
    return Response.json([]);
  };
  const res={ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } };
  try {
    await panel({ method:'POST', url:`/api/consultorio?action=analyze-site&clinic=${clinicId}`, headers:{ authorization:'Bearer doctor-token' }, body:{} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(templateInserts, 4);
    assert.equal(templateUpdates, 0);
  } finally { globalThis.fetch=oldFetch; if (oldUrl===undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL=oldUrl; if (oldKey===undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY=oldKey; }
});

test('Cal sends welcome once, followup for a later booking, and none for pending or reschedule', async () => {
  const clinicId='00000000-0000-0000-0000-000000000001';
  const oldFetch=globalThis.fetch, oldEnv={ SUPABASE_URL:process.env.SUPABASE_URL, SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY, RESEND_API_KEY:process.env.RESEND_API_KEY };
  Object.assign(process.env, { SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'key', RESEND_API_KEY:'resend-key' });
  const appointments=new Map(), patients=new Map(), messages=[]; let sent=0, failQueueOnce=true;
  globalThis.fetch=async (url, options={}) => {
    if (url==='https://api.resend.com/emails') { sent++; return Response.json({ id:`resend-${sent}` }); }
    const parsed=new URL(url), table=parsed.pathname.split('/').at(-1), body=options.body && JSON.parse(options.body), query=parsed.searchParams;
    if (table==='clinics') return Response.json([{ id:clinicId, cal_webhook_secret:'webhook-secret', cal_event_type_id:1, cal_paid_event_type_id:2, doctor_name:'Dra. Ana', sender_name:'Dra. Ana', sender_local_part:'ana', reply_to:'ana@example.com', welcome_enabled:true, followup_enabled:true }]);
    if (table==='clinic_cal_aliases') return Response.json([]);
    if (table==='clinic_appointments') {
      if (options.method==='POST') { const row={ id:`a-${appointments.size+1}`, ...body }; appointments.set(row.cal_uid,row); return Response.json([row]); }
      if (options.method==='PATCH') { const row=[...appointments.values()].find(x => x.id===query.get('id')?.slice(3)); Object.assign(row,body); return Response.json([row]); }
      if (query.has('cal_uid')) { const row=appointments.get(query.get('cal_uid').slice(3)); return Response.json(row ? [row] : []); }
      return Response.json([]);
    }
    if (table==='clinic_patients') {
      if (options.method==='POST') { const key=`${body.clinic_id}:${body.email}`; if (patients.has(key)) return Response.json([]); patients.set(key,body); return Response.json([body]); }
      const row=patients.get(`${query.get('clinic_id').slice(3)}:${query.get('email').slice(3)}`); return Response.json(row ? [row] : []);
    }
    if (table==='clinic_email_templates') return Response.json([{ id:'template', version:1, approved_at:'2026-11-18T00:00:00Z', subject:'Cita', body:'Hola {{patient}}' }]);
    if (table==='clinic_messages') {
      if (options.method==='POST') { if (failQueueOnce) { failQueueOnce=false; return new Response('{}',{ status:503 }); } if (messages.some(m => m.idempotency_key===body.idempotency_key)) return Response.json([]); const row={ id:`m-${messages.length+1}`, ...body }; messages.push(row); return Response.json([row]); }
      if (options.method==='PATCH') { const row=messages.find(m => m.id===query.get('id')?.slice(3)); Object.assign(row,body); return Response.json([row]); }
    }
    return Response.json([]);
  };
  const send=async (uid,triggerEvent,createdAt,eventTypeId=1,expected=200) => {
    const rawBody=JSON.stringify({ triggerEvent, createdAt, payload:{ uid, eventTypeId, startTime:'2026-12-01T15:00:00Z', endTime:'2026-12-01T15:30:00Z', attendees:[{ name:'Paciente', email:'PATIENT@example.com' }] } });
    const res={ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } };
    await calWebhook({ method:'POST', url:`/api/consultorio-misc?route=cal&clinic=${clinicId}`, headers:{ 'x-cal-signature-256':createHmac('sha256','webhook-secret').update(rawBody).digest('hex') }, rawBody }, res);
    assert.equal(res.statusCode,expected);
  };
  try {
    await send('one','BOOKING_CREATED','2026-11-20T10:00:00Z',1,503);
    await send('one','BOOKING_CREATED','2026-11-20T10:00:00Z');
    await send('one','BOOKING_CREATED','2026-11-20T10:00:00Z');
    await send('two','BOOKING_CREATED','2026-11-20T11:00:00Z');
    await send('pending','BOOKING_PAYMENT_INITIATED','2026-11-20T12:00:00Z',2);
    await send('two','BOOKING_RESCHEDULED','2026-11-20T13:00:00Z');
    assert.deepEqual(messages.map(m=>m.kind), ['welcome','followup']);
    assert.equal(sent,2);
  } finally { globalThis.fetch=oldFetch; for (const [key,value] of Object.entries(oldEnv)) if (value===undefined) delete process.env[key]; else process.env[key]=value; }
});

test('retry skips a welcome after its appointment was cancelled', async () => {
  const oldFetch=globalThis.fetch, oldEnv={ SUPABASE_URL:process.env.SUPABASE_URL, SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY, CRON_SECRET:process.env.CRON_SECRET, SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY, RESEND_API_KEY:process.env.RESEND_API_KEY };
  Object.assign(process.env, { SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'key', CRON_SECRET:'cron', SUPABASE_PUBLISHABLE_KEY:'publishable', RESEND_API_KEY:'resend-key' });
  let sent=0;
  globalThis.fetch=async (url) => {
    if (url==='https://api.resend.com/emails') { sent++; return Response.json({ id:'sent' }); }
    const parsed=new URL(url), table=parsed.pathname.split('/').at(-1);
    if (table==='clinic_messages') return Response.json([{ id:'m1', clinic_id:'c1', appointment_id:'a1', kind:'welcome', status:'failed', email_snapshot:{ from:'Dra <dra@orkestalo.com>', reply_to:'dra@example.com', to:['patient@example.com'], subject:'Hola', text:'Hola', html:'<p>Hola</p>' } }]);
    if (table==='clinics') return Response.json([{ id:'c1', welcome_enabled:true }]);
    if (table==='clinic_appointments') return Response.json([{ id:'a1', status:'cancelled' }]);
    return Response.json([]);
  };
  const res={ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } };
  try { await retryHandler({ method:'GET', headers:{ authorization:'Bearer cron' } },res); assert.equal(res.statusCode,200); assert.equal(sent,0); }
  finally { globalThis.fetch=oldFetch; for (const [key,value] of Object.entries(oldEnv)) if (value===undefined) delete process.env[key]; else process.env[key]=value; }
});
