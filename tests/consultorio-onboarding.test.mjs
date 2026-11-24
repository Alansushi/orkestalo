import assert from 'node:assert/strict';
import test from 'node:test';
import { siteUrlAllowed, onboardingSteps, canActivateEmail, paidEventReady } from '../src/server/consultorio-onboarding.js';
import panel from '../api/consultorio.js';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { readPublicSite } from '../src/server/public-site.js';

const respond = () => ({ statusCode:200, setHeader(){}, end(value){ this.body=JSON.parse(value); } });

test('admin invitation rejects a doctor outside the configured allowlist', async () => {
  const previous = { fetch:globalThis.fetch, url:process.env.SUPABASE_URL, key:process.env.SUPABASE_SECRET_KEY, admins:process.env.CLINIC_ADMIN_EMAILS };
  Object.assign(process.env, { SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'secret', CLINIC_ADMIN_EMAILS:'owner@example.org' });
  globalThis.fetch = async url => {
    if (new URL(url).pathname === '/auth/v1/user') return Response.json({ id:'doctor', email:'doctor@example.org', email_confirmed_at:'2026-11-19T00:00:00Z' });
    throw new Error('An unauthorized admin queried data');
  };
  try {
    const res = respond();
    await panel({ method:'POST', url:'/api/consultorio?action=admin-invite', headers:{ authorization:'Bearer valid' }, body:{ email:'new@example.org', name:'Consultorio nuevo' } }, res);
    assert.equal(res.statusCode, 403);
  } finally {
    globalThis.fetch=previous.fetch;
    for (const [key,value] of Object.entries({ SUPABASE_URL:previous.url, SUPABASE_SECRET_KEY:previous.key, CLINIC_ADMIN_EMAILS:previous.admins })) value === undefined ? delete process.env[key] : process.env[key]=value;
  }
});

test('administrator invites once and resends access without creating another clinic', async () => {
  const id='00000000-0000-0000-0000-000000000001';
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,admins:process.env.CLINIC_ADMIN_EMAILS,resend:process.env.RESEND_API_KEY};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CLINIC_ADMIN_EMAILS:'owner@example.org',RESEND_API_KEY:'resend'});
  let invitation, clinics=0, memberships=0, emails=0;const linkTypes=[];
  globalThis.fetch=async (url,options={})=>{
    const path=new URL(url).pathname, method=options.method||'GET';
    if(path.endsWith('/auth/v1/user'))return Response.json({id:'owner',email:'owner@example.org',email_confirmed_at:'2026-11-19'});
    if(path.endsWith('/auth/v1/admin/generate_link')){linkTypes.push(JSON.parse(options.body).type);return Response.json({action_link:'https://db.example.supabase.co/auth/v1/verify?token=abc',id:'new-user'});}
    if(path.endsWith('/clinic_invitations'))return Response.json(invitation?[invitation]:[]);
    if(path.endsWith('/rpc/clinic_provision')){clinics++;memberships++;const body=JSON.parse(options.body);invitation={email:body.p_email,clinic_id:id,user_id:body.p_user_id};return Response.json([{...invitation,created:true}]);}
    if(path.endsWith('/clinics'))return Response.json([{id,name:'Consultorio nuevo'}]);
    if(path.endsWith('/emails')){emails++;return Response.json({id:`email-${emails}`});}
    throw new Error(`Unexpected ${url}`);
  };
  try {for(let i=0;i<2;i++){const res=respond();await panel({method:'POST',url:'/api/consultorio?action=admin-invite',headers:{authorization:'Bearer valid'},body:{email:'new@example.org',name:'Consultorio nuevo',doctor_name:'Dra. Nueva'}},res);assert.equal(res.statusCode,200);assert.equal(res.body.invitation.resent,i===1);}const resend=respond();await panel({method:'POST',url:'/api/consultorio?action=admin-resend',headers:{authorization:'Bearer valid'},body:{email:'new@example.org'}},resend);assert.equal(resend.statusCode,200);assert.equal(clinics,1);assert.equal(memberships,1);assert.equal(emails,3);assert.deepEqual(linkTypes,['invite','magiclink','magiclink']);}
  finally {globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CLINIC_ADMIN_EMAILS:previous.admins,RESEND_API_KEY:previous.resend}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('administrator can invite an existing Supabase user without a clinic', async () => {
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,admins:process.env.CLINIC_ADMIN_EMAILS,resend:process.env.RESEND_API_KEY};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CLINIC_ADMIN_EMAILS:'owner@example.org',RESEND_API_KEY:'resend'});
  const types=[];
  globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname;
    if(path.endsWith('/auth/v1/user'))return Response.json({id:'owner',email:'owner@example.org',email_confirmed_at:'2026-11-19'});
    if(path.endsWith('/auth/v1/admin/generate_link')){const type=JSON.parse(options.body).type;types.push(type);return type==='invite'?new Response('{}',{status:422}):Response.json({action_link:'https://db.example.supabase.co/link',id:'existing-user'});}
    if(path.endsWith('/clinic_invitations'))return Response.json([]);
    if(path.endsWith('/rpc/clinic_provision'))return Response.json([{clinic_id:'00000000-0000-0000-0000-000000000001',user_id:'existing-user',email:'existing@example.org',created:true}]);
    if(path.endsWith('/emails'))return Response.json({id:'mail'});
    throw new Error(`Unexpected ${url}`);
  };
  try {const res=respond();await panel({method:'POST',url:'/api/consultorio?action=admin-invite',headers:{authorization:'Bearer valid'},body:{email:'existing@example.org',name:'Consultorio',doctor_name:'Dra. Existente'}},res);assert.equal(res.statusCode,200);assert.deepEqual(types,['invite','magiclink']);}
  finally {globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CLINIC_ADMIN_EMAILS:previous.admins,RESEND_API_KEY:previous.resend}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('invitation rejects internal websites and unsafe sender names before writing', async () => {
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,admins:process.env.CLINIC_ADMIN_EMAILS};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CLINIC_ADMIN_EMAILS:'owner@example.org'});
  globalThis.fetch=async url=>{if(new URL(url).pathname.endsWith('/auth/v1/user'))return Response.json({id:'owner',email:'owner@example.org',email_confirmed_at:'2026-11-19'});throw new Error('Invalid invite reached storage');};
  try {for(const input of [{email:'x@example.org',name:'Consultorio',website_url:'https://127.0.0.1'},{email:'x@example.org',name:'Doctor\r\nBcc: x@example.org'}]){const res=respond();await panel({method:'POST',url:'/api/consultorio?action=admin-invite',headers:{authorization:'Bearer valid'},body:input},res);assert.equal(res.statusCode,400);}}
  finally {globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CLINIC_ADMIN_EMAILS:previous.admins}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('site analysis accepts public HTTPS hosts and rejects internal targets', () => {
  assert.equal(siteUrlAllowed('https://example.org/').hostname, 'example.org');
  for (const url of ['http://example.org', 'https://localhost', 'https://127.0.0.1', 'https://10.2.3.4', 'https://[::1]', 'https://[::ffff:7f00:1]', 'https://169.254.1.2', 'https://user:pass@example.org', 'https://example.org:8443', 'https://metadata.google.internal']) {
    assert.equal(siteUrlAllowed(url), null, url);
  }
});

test('site analyzer pins the checked public IP through the TLS request', async () => {
  let options, requested=false;
  const request=(url,requestOptions,onResponse)=>{
    requested=true;options=requestOptions;
    const req=new EventEmitter();req.end=()=>{const res=new EventEmitter();res.statusCode=200;res.headers={'content-type':'text/html; charset=utf-8'};onResponse(res);queueMicrotask(()=>{res.emit('data',Buffer.from('<title>Ok</title>'));res.emit('end');});};return req;
  };
  const html=await readPublicSite('https://example.org/',{resolve:async()=>[{address:'93.184.216.34',family:4}],request});
  assert.equal(html,'<title>Ok</title>');assert.equal(options.servername,'example.org');
  options.lookup('example.org',{},(error,address,family)=>{assert.equal(error,null);assert.equal(address,'93.184.216.34');assert.equal(family,4);});
  options.lookup('example.org',{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'93.184.216.34',family:4}]);});
  requested=false;
  await assert.rejects(readPublicSite('https://example.org/',{resolve:async()=>[{address:'127.0.0.1',family:4}],request}),/red privada/);
  assert.equal(requested,false);
  await assert.rejects(readPublicSite('https://example.org/',{resolve:async()=>[{address:'::ffff:7f00:1',family:6}],request}),/red privada/);
  assert.equal(requested,false);
});

test('onboarding stays incomplete until calendar, hooks, privacy and four approvals are ready', () => {
  const clinic = { sender_name:'Dra. Eva', reply_to:'eva@example.org', identity_confirmed_at:'2026-11-19T00:00:00Z', cal_event_type_id:42, cal_webhook_ready:false, privacy_accepted_at:null };
  const templates = ['welcome','followup','invite','survey'].map(kind => ({ kind, tested_revision:1, tested_at:'2026-11-19T00:00:00Z', revision:1, approved_at:'2026-11-19T00:00:00Z' }));
  assert.equal(onboardingSteps({ clinic, connected:true, templates }).find(s => s.id === 'content').done, false);
  assert.equal(onboardingSteps({ clinic, connected:true, templates }).find(s => s.id === 'calendar').done, false);
  assert.equal(canActivateEmail({ clinic, connected:true, templates, kind:'welcome' }), false);
  clinic.cal_webhook_ready = true; clinic.privacy_accepted_at = '2026-11-19T00:00:00Z';clinic.content_reviewed_at='2026-11-19T00:00:00Z';
  assert.equal(canActivateEmail({ clinic, connected:true, templates, kind:'welcome' }), true);
  assert.equal(canActivateEmail({ clinic, connected:true, templates, kind:'invite' }), false);
});

test('paid appointment requires a priced Cal event with invite field and booking URL', () => {
  assert.equal(paidEventReady({ price:1000, bookingUrl:'https://cal.com/eva/anticipo', bookingFields:[{ slug:'orkesta_invite', hidden:true, type:'shortText' }] }), true);
  assert.equal(paidEventReady({ price:1000, bookingUrl:'https://cal.com/eva/anticipo', bookingFields:[{ slug:'orkesta_invite', hidden:false, type:'shortText' }] }), false);
  assert.equal(paidEventReady({ price:0, bookingUrl:'https://cal.com/eva/anticipo', bookingFields:[{ slug:'orkesta_invite', hidden:true, type:'shortText' }] }), false);
  assert.equal(paidEventReady({ price:1000, bookingUrl:'https://cal.com/eva/anticipo', bookingFields:[] }), false);
});

test('approved email cannot activate before calendar and privacy are confirmed', async () => {
  const id='00000000-0000-0000-0000-000000000001';
  const previous={ fetch:globalThis.fetch, url:process.env.SUPABASE_URL, key:process.env.SUPABASE_SECRET_KEY, resend:process.env.RESEND_WEBHOOK_SECRET, api:process.env.RESEND_API_KEY };
  Object.assign(process.env,{ SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'secret', RESEND_API_KEY:'key', RESEND_WEBHOOK_SECRET:'whsec_test' });
  let wrote=false;
  globalThis.fetch=async (url,options={}) => {
    const path=new URL(url).pathname;
    if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor',email:'doctor@example.org'});
    if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);
    if(path.endsWith('/clinics')) { if(options.method==='PATCH')wrote=true; return Response.json([{id,doctor_name:'Doctor',sender_name:'Doctor',reply_to:'doctor@example.org',identity_confirmed_at:'2026-11-19',cal_webhook_ready:false}]); }
    if(path.endsWith('/clinic_email_templates'))return Response.json([{kind:'welcome',version:1,revision:1,tested_revision:1,tested_at:'2026-11-19',approved_at:'2026-11-19'}]);
    return Response.json([]);
  };
  try { const res=respond(); await panel({method:'PATCH',url:`/api/consultorio?action=email-settings&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{welcome_enabled:true}},res); assert.equal(res.statusCode,409); assert.equal(wrote,false); }
  finally { globalThis.fetch=previous.fetch; for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,RESEND_WEBHOOK_SECRET:previous.resend,RESEND_API_KEY:previous.api}))value===undefined?delete process.env[key]:process.env[key]=value; }
});

test('survey activation reports missing global delivery and survey configuration', async () => {
  const id='00000000-0000-0000-0000-000000000001';
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,resend:process.env.RESEND_WEBHOOK_SECRET,survey:process.env.SURVEY_TOKEN_SECRET,api:process.env.RESEND_API_KEY};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',RESEND_API_KEY:'key'});delete process.env.RESEND_WEBHOOK_SECRET;delete process.env.SURVEY_TOKEN_SECRET;
  globalThis.fetch=async url=>{const path=new URL(url).pathname;if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor',email:'doctor@example.org'});if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);if(path.endsWith('/clinics'))return Response.json([{id,doctor_name:'Doctor',sender_name:'Doctor',reply_to:'doctor@example.org',identity_confirmed_at:'2026-11-19',privacy_accepted_at:'2026-11-19',cal_event_type_id:42,cal_webhook_ready:true}]);if(path.endsWith('/clinic_email_templates'))return Response.json([{kind:'survey',revision:1,tested_revision:1,tested_at:'2026-11-19',approved_at:'2026-11-19'}]);if(path.endsWith('/clinic_cal_connections'))return Response.json([{connected_at:'2026-11-19'}]);throw new Error(`Unexpected ${url}`);};
  try{const res=respond();await panel({method:'PATCH',url:`/api/consultorio?action=email-settings&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{survey_enabled:true}},res);assert.equal(res.statusCode,503);}
  finally{globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,RESEND_WEBHOOK_SECRET:previous.resend,SURVEY_TOKEN_SECRET:previous.survey,RESEND_API_KEY:previous.api}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('updating clinic identity never returns its webhook signing secret', async () => {
  const id='00000000-0000-0000-0000-000000000001';const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret'});
  globalThis.fetch=async (url,options={})=>{const path=new URL(url).pathname;if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor'});if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);if(path.endsWith('/clinics'))return Response.json([{id,doctor_name:'Doctor',reply_to:'doctor@example.org',sender_name:'Doctor',cal_webhook_secret:'private-signing-key',...(options.body?JSON.parse(options.body):{})}]);throw new Error(`Unexpected ${url}`);};
  try{const res=respond();await panel({method:'PATCH',url:`/api/consultorio?action=email-settings&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{location:'Centro'}},res);assert.equal(res.statusCode,200);assert.equal(res.body.clinic.cal_webhook_secret,undefined);}
  finally{globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('Cal selection creates one signed webhook and reuses it on resume', async () => {
  const id='00000000-0000-0000-0000-000000000001';
  const previous={ fetch:globalThis.fetch, url:process.env.SUPABASE_URL, key:process.env.SUPABASE_SECRET_KEY, client:process.env.CAL_OAUTH_CLIENT_ID, secret:process.env.CAL_OAUTH_CLIENT_SECRET };
  Object.assign(process.env,{ SUPABASE_URL:'https://db.example.supabase.co', SUPABASE_SECRET_KEY:'secret', CAL_OAUTH_CLIENT_ID:'cal-client', CAL_OAUTH_CLIENT_SECRET:'cal-secret' });
  let created=0, updated=0, webhook, clinic={id,cal_webhook_secret:'signing-secret',cal_event_type_id:null};
  globalThis.fetch=async (url,options={}) => {
    const parsed=new URL(url), path=parsed.pathname, method=options.method||'GET';
    if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor',email:'doctor@example.org'});
    if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);
    if(path.endsWith('/clinic_cal_connections'))return Response.json([{access_token:'cal-access',expires_at:'2099-01-01T00:00:00Z'}]);
    if(path.endsWith('/clinic_cal_setup_locks'))return Response.json(method==='POST'?[{clinic_id:id}]:[]);
    if(path.endsWith('/clinics')) { if(method==='PATCH')clinic={...clinic,...JSON.parse(options.body)}; return Response.json([clinic]); }
    if(path.endsWith('/event-types'))return Response.json({status:'success',data:[{id:42,title:'Consulta',slug:'consulta',bookingUrl:'https://cal.com/doctor/consulta',price:0}]});
    if(path.endsWith('/event-types/42/webhooks')) {
      if(method==='POST'){created++;webhook={id:8,active:true,...JSON.parse(options.body)};return Response.json({status:'success',data:webhook});}
      return Response.json({status:'success',data:webhook?[webhook]:[]});
    }
    if(path.endsWith('/event-types/42/webhooks/8')&&method==='PATCH'){updated++;webhook={...webhook,...JSON.parse(options.body)};return Response.json({status:'success',data:webhook});}
    if(path.endsWith('/clinic_cal_webhooks'))return Response.json([{clinic_id:id,event_type_id:42,webhook_id:8}]);
    throw new Error(`Unexpected ${url}`);
  };
  try {
    for(let i=0;i<2;i++){const res=respond();await panel({method:'POST',url:`/api/consultorio?action=select-event&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{eventTypeId:42,paid:false}},res);assert.equal(res.statusCode,200);}
    assert.equal(created,1); assert.equal(updated,1); assert.equal(clinic.cal_event_type_id,42); assert.equal(clinic.cal_webhook_ready,true); assert.equal(webhook.secret,'signing-secret');
  } finally { globalThis.fetch=previous.fetch; for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CAL_OAUTH_CLIENT_ID:previous.client,CAL_OAUTH_CLIENT_SECRET:previous.secret}))value===undefined?delete process.env[key]:process.env[key]=value; }
});

test('switching the Cal event disables the old patient webhook before saving the new type', async () => {
  const id='00000000-0000-0000-0000-000000000001';const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,client:process.env.CAL_OAUTH_CLIENT_ID,secret:process.env.CAL_OAUTH_CLIENT_SECRET};Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CAL_OAUTH_CLIENT_ID:'client',CAL_OAUTH_CLIENT_SECRET:'secret'});
  const subscriberUrl=`https://www.orkestalo.com/api/consultorio-misc?route=cal&clinic=${id}`;let removed=0,newHook;
  globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname,method=options.method||'GET';if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor'});if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);if(path.endsWith('/clinic_cal_connections'))return Response.json([{access_token:'token',expires_at:'2099-01-01'}]);if(path.endsWith('/clinic_cal_setup_locks'))return Response.json(method==='POST'?[{clinic_id:id}]:[]);if(path.endsWith('/event-types'))return Response.json({status:'success',data:[{id:42,title:'Nueva',bookingUrl:'https://cal.com/eva/nueva',price:0}]});if(path.endsWith('/clinics'))return Response.json([{id,cal_webhook_secret:'sign',cal_event_type_id:41}]);if(path.endsWith('/event-types/41/webhooks'))return Response.json({status:'success',data:[{id:7,subscriberUrl,active:true}]});if(path.endsWith('/event-types/41/webhooks/7')&&method==='DELETE'){removed++;return Response.json({status:'success',data:{id:7}});}if(path.endsWith('/event-types/42/webhooks')){if(method==='POST'){newHook={id:8,...JSON.parse(options.body)};return Response.json({status:'success',data:newHook});}return Response.json({status:'success',data:newHook?[newHook]:[]});}if(path.endsWith('/clinic_cal_webhooks'))return Response.json([{}]);throw new Error(`Unexpected ${method} ${url}`);};
  try{const res=respond();await panel({method:'POST',url:`/api/consultorio?action=select-event&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{eventTypeId:42,paid:false}},res);assert.equal(res.statusCode,200);assert.equal(removed,1);}
  finally{globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CAL_OAUTH_CLIENT_ID:previous.client,CAL_OAUTH_CLIENT_SECRET:previous.secret}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('simultaneous Cal setup is rejected before creating a duplicate webhook', async () => {
  const id='00000000-0000-0000-0000-000000000001';const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,client:process.env.CAL_OAUTH_CLIENT_ID,secret:process.env.CAL_OAUTH_CLIENT_SECRET};Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CAL_OAUTH_CLIENT_ID:'client',CAL_OAUTH_CLIENT_SECRET:'secret'});
  globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname;if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor'});if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);if(path.endsWith('/clinic_cal_connections'))return Response.json([{access_token:'token',expires_at:'2099-01-01'}]);if(path.endsWith('/event-types'))return Response.json({status:'success',data:[{id:42,title:'Cita',price:0}]});if(path.endsWith('/clinics'))return Response.json([{id,cal_webhook_secret:'secret'}]);if(path.endsWith('/clinic_cal_setup_locks'))return Response.json([]);throw new Error(`Webhook request should not happen: ${url}`);};
  try{const res=respond();await panel({method:'POST',url:`/api/consultorio?action=select-event&clinic=${id}`,headers:{authorization:'Bearer valid'},body:{eventTypeId:42,paid:false}},res);assert.equal(res.statusCode,409);}
  finally{globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CAL_OAUTH_CLIENT_ID:previous.client,CAL_OAUTH_CLIENT_SECRET:previous.secret}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('Cal connection requests the event-type permission needed to create webhooks', async () => {
  const id='00000000-0000-0000-0000-000000000001';const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,client:process.env.CAL_OAUTH_CLIENT_ID,secret:process.env.CAL_OAUTH_CLIENT_SECRET};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',CAL_OAUTH_CLIENT_ID:'client',CAL_OAUTH_CLIENT_SECRET:'secret'});
  globalThis.fetch=async url=>{const path=new URL(url).pathname;if(path.endsWith('/auth/v1/user'))return Response.json({id:'doctor'});if(path.endsWith('/clinic_memberships'))return Response.json([{clinic_id:id,user_id:'doctor',active:true}]);if(path.endsWith('/clinic_oauth_states'))return Response.json([{}]);throw new Error(`Unexpected ${url}`);};
  try{const res=respond();await panel({method:'POST',url:`/api/consultorio?action=connect&clinic=${id}`,headers:{authorization:'Bearer valid'}},res);assert.equal(res.statusCode,200);assert.ok(new URL(res.body.url).searchParams.get('scope').split(' ').includes('EVENT_TYPE_WRITE'));}
  finally{globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key,CAL_OAUTH_CLIENT_ID:previous.client,CAL_OAUTH_CLIENT_SECRET:previous.secret}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('reconnecting Cal clears old webhook readiness and patient mail switches', async () => {
  const id='00000000-0000-0000-0000-000000000001';
  const previous={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret'});
  let changes;
  globalThis.fetch=async(url,options={})=>{const path=new URL(url).pathname;if(path.endsWith('/clinic_oauth_states'))return Response.json([{clinic_id:id}]);if(path.endsWith('/auth/oauth2/token'))return Response.json({access_token:'new',refresh_token:'refresh',expires_in:1800});if(path.endsWith('/clinic_cal_connections'))return Response.json([{clinic_id:id}]);if(path.endsWith('/clinics')){changes=JSON.parse(options.body);return Response.json([{id,...changes}]);}throw new Error(`Unexpected ${url}`);};
  try {const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(){}};await panel({method:'GET',url:'/api/consultorio?action=callback&state=valid&code=valid',headers:{}},res);assert.equal(res.statusCode,302);assert.equal(changes.cal_webhook_ready,false);assert.equal(changes.welcome_enabled,false);assert.equal(changes.invite_enabled,false);assert.match(changes.cal_webhook_secret,/^[a-f0-9]{64}$/);}
  finally {globalThis.fetch=previous.fetch;for(const [key,value] of Object.entries({SUPABASE_URL:previous.url,SUPABASE_SECRET_KEY:previous.key}))value===undefined?delete process.env[key]:process.env[key]=value;}
});

test('panel keeps onboarding and operations in tabs with the published brand logo', async () => {
  const html=await readFile(new URL('../src/consultorio/index.html',import.meta.url),'utf8');
  assert.match(html,/id="onboarding"/);
  assert.match(html,/id="tab-operacion" role="tabpanel"/);
  assert.match(html,/orkesta-lockup-horizontal-propuesta\.svg/);
  assert.match(html,/id="admin-invite-form"/);
  assert.match(html,/id="event-type-select"/);
});
