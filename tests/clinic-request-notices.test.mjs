import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverRequestNotice } from '../src/server/clinic-request-notices.js';

test('failed request notice remains retryable and succeeds once mail recovers',async()=>{
  const old={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY,email:process.env.RESEND_API_KEY,from:process.env.ORKESTA_EMAIL_FROM};
  Object.assign(process.env,{SUPABASE_URL:'https://db.example.supabase.co',SUPABASE_SECRET_KEY:'secret',RESEND_API_KEY:'mail-key',ORKESTA_EMAIL_FROM:'Orkesta <info@example.com>'});
  let mailStatus=503,noticeState='queued',attempts=0;
  globalThis.fetch=async (url,options={})=>{
    if(String(url).includes('api.resend.com')) {attempts++;return new Response('',{status:mailStatus});}
    const body=options.body&&JSON.parse(options.body);
    if(options.method==='PATCH'&&body?.notification_status==='sending') return Response.json(noticeState==='queued'||noticeState==='failed'?[{id:'notice'}]:[]);
    if(options.method==='PATCH'&&body?.notification_status) {noticeState=body.notification_status;return Response.json([{id:'notice'}]);}
    return Response.json([]);
  };
  const clinic={name:'Consultorio A'},request={id:'request',clinic_id:'clinic',title:'Actualizar sitio',description:'Nuevo texto',requester_email:'doctor@example.com'},history={id:'notice',status:'en revisión'};
  try {
    assert.equal(await deliverRequestNotice(clinic,request,history),false);assert.equal(noticeState,'failed');
    mailStatus=200;assert.equal(await deliverRequestNotice(clinic,request,history),true);assert.equal(noticeState,'sent');
    assert.equal(attempts,2);
  } finally {globalThis.fetch=old.fetch;for(const [key,value] of [['SUPABASE_URL',old.url],['SUPABASE_SECRET_KEY',old.key],['RESEND_API_KEY',old.email],['ORKESTA_EMAIL_FROM',old.from]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
