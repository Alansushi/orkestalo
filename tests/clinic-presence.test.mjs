import assert from 'node:assert/strict';
import test from 'node:test';
import presence from '../api/clinic-presence.js';

const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const V = '00000000-0000-0000-0000-000000000003';
function response() { return { statusCode:200, headers:{}, setHeader(k,v) { this.headers[k]=v; }, end(value) { this.body=JSON.parse(value); } }; }
async function request(path, method='GET', body) { const res=response(); await presence({ method, url:`/api/clinic-presence?clinic=${path}`, headers:{ authorization:'Bearer token' }, body },res); return res; }
async function fixture(role, fn, versionStatus='draft', versionClinic=B, archived=false) {
  const prior={ fetch:globalThis.fetch, url:process.env.SUPABASE_URL, key:process.env.SUPABASE_SECRET_KEY };
  process.env.SUPABASE_URL='https://db.example.supabase.co'; process.env.SUPABASE_SECRET_KEY='secret';
  const calls=[];
  globalThis.fetch=async (url, options={}) => {
    const parsed=new URL(url), table=parsed.pathname.split('/').at(-1), body=options.body && !Buffer.isBuffer(options.body) ? JSON.parse(options.body) : null;
    calls.push({ table, query:parsed.search, method:options.method, body, url:String(url), headers:options.headers });
    if(parsed.pathname==='/auth/v1/user') return Response.json({ id:'person-a', email:'a@example.com' });
    if(table==='clinic_memberships') return Response.json(parsed.searchParams.get('clinic_id')===`eq.${A}` ? [{clinic_id:A,user_id:'person-a',active:true,role}] : []);
    if(table==='clinics') return Response.json([{id:A,name:'Consultorio A',website_url:'https://a.example.com'}]);
    if(table==='clinic_brand_versions') return Response.json([{id:V,clinic_id:versionClinic,resource_id:B,version:2,status:versionStatus,storage_path:`${versionClinic}/${B}/${V}`,name:'Logo'}]);
    if(table==='clinic_brand_resources') return Response.json([{id:B,clinic_id:A,name:'Logo',category:'logo',archived_at:archived?'2026-11-19T00:00:00Z':null}]);
    if(table==='clinic_measurement_links') return Response.json([]);
    if(table==='clinic_pilot_scorecards') return Response.json([{clinic_id:A,...body}]);
    if(parsed.pathname.includes('/storage/v1/object/sign/')) return Response.json({signedURL:`/object/sign/clinic-brand/${A}/${B}/${V}?token=short`});
    if(parsed.pathname.includes('/storage/v1/object/')) return Response.json({Key:'stored'});
    return Response.json([]);
  };
  try { await fn(calls); } finally { globalThis.fetch=prior.fetch; for(const [k,v] of [['SUPABASE_URL',prior.url],['SUPABASE_SECRET_KEY',prior.key]]) if(v===undefined) delete process.env[k]; else process.env[k]=v; }
}

test('missing and foreign memberships deny all private data before querying it', async()=>{
  await fixture('doctor',async calls=>{ const res=await request(B); assert.equal(res.statusCode,401); assert.deepEqual(calls.map(c=>c.table),['user','clinic_memberships']); });
  const res=response(); await presence({method:'GET',url:`/api/clinic-presence?clinic=${A}`,headers:{}},res); assert.equal(res.statusCode,401);
});

test('doctor cannot approve another clinic version or download a draft',async()=>{
  await fixture('doctor',async calls=>{
    const approval=await request(A,'PATCH',{action:'approve',version_id:V}); assert.equal(approval.statusCode,404);
    const download=await request(A,'POST',{action:'download',version_id:V}); assert.equal(download.statusCode,404);
    assert.equal(calls.some(c=>c.url.includes('/storage/v1/')),false);
  });
});

test('approved own version receives a five minute private signed URL',async()=>{
  await fixture('doctor',async calls=>{
    process.env.SUPABASE_SECRET_KEY='sb_secret_test';
    const res=await request(A,'POST',{action:'download',version_id:V});
    assert.equal(res.statusCode,200); assert.match(res.body.url,/token=short/);
    assert.equal(calls.find(c=>c.url.includes('/storage/v1/object/sign/'))?.body.expiresIn,300);
    assert.equal(calls.find(c=>c.url.includes('/storage/v1/object/sign/'))?.headers.Authorization,undefined);
  },'approved',A);
});

test('doctor cannot set request status or verified measurement link',async()=>{
  await fixture('doctor',async()=>{
    assert.equal((await request(A,'PATCH',{action:'request-status',request_id:V,status:'completed'})).statusCode,403);
    assert.equal((await request(A,'PATCH',{action:'measurement-link',site_id:V})).statusCode,403);
  });
});

test('large JSON upload bodies reach validation instead of disappearing',async()=>{
  await fixture('admin',async()=>{
    const body=JSON.stringify({action:'upload',name:'Logo',category:'logo',filename:'logo.png',mime:'image/png',uses:['Sitio web'],license:'Uso autorizado',restrictions:'',data:Buffer.alloc(12000).toString('base64')});
    const res=response();await presence({method:'POST',url:`/api/clinic-presence?clinic=${A}`,headers:{authorization:'Bearer token'},body},res);
    assert.equal(res.statusCode,201);
  });
});

test('commercial font can be recorded without distributing its file',async()=>{
  await fixture('admin',async calls=>{
    const res=await request(A,'POST',{action:'upload',name:'Fuente comercial',category:'tipografia',reference_only:true,uses:['Sitio web'],license:'Licencia individual; no redistribuir',restrictions:'Archivo disponible con el proveedor'});
    assert.equal(res.statusCode,201);
    assert.equal(calls.some(c=>c.url.includes('/storage/v1/')),false);
  });
});

test('only clinic admin records the day-30 commercial response and separate effort',async()=>{
  const record={action:'pilot-scorecard',setup_minutes:240,support_minutes:90,proposal_scope:'Identidad y presencia',proposed_price_mxn:2500,would_buy:true,response_notes:'Aceptaría el servicio',discontinued_tasks:'Coordinar cambios por WhatsApp'};
  await fixture('doctor',async()=>assert.equal((await request(A,'PATCH',record)).statusCode,403));
  await fixture('admin',async()=>{const res=await request(A,'PATCH',record);assert.equal(res.statusCode,200);assert.equal(res.body.scorecard.setup_minutes,240);});
});

test('admin cannot approve a doctor version or attest her presence review',async()=>{
  await fixture('admin',async()=>{
    assert.equal((await request(A,'PATCH',{action:'approve',version_id:V})).statusCode,403);
    assert.equal((await request(A,'PATCH',{action:'presence-review'})).statusCode,403);
  });
});

test('Ana, Fernanda, nonmember and expired sessions stay within their own clinic',async()=>{
  const prior={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  process.env.SUPABASE_URL='https://db.example.supabase.co';process.env.SUPABASE_SECRET_KEY='secret';
  const selected=[];
  globalThis.fetch=async(url,options={})=>{
    const parsed=new URL(url),token=options.headers?.Authorization,table=parsed.pathname.split('/').at(-1);
    if(parsed.pathname==='/auth/v1/user') return token==='Bearer expired'?new Response('',{status:401}):Response.json({id:token==='Bearer ana'?'ana':token==='Bearer fer'?'fer':'outsider',email:'person@example.com'});
    if(table==='clinic_memberships') {
      const id=parsed.searchParams.get('clinic_id')?.slice(3),user=parsed.searchParams.get('user_id')?.slice(3);
      return Response.json((id===A&&user==='ana')||(id===B&&user==='fer')?[{clinic_id:id,user_id:user,active:true,role:'doctor'}]:[]);
    }
    selected.push({table,clinic:parsed.searchParams.get('clinic_id')});
    if(table==='clinics') return Response.json([{id:parsed.searchParams.get('id').slice(3),name:'Own clinic',website_url:null}]);
    return Response.json([]);
  };
  try {
    for(const [token,clinic,want] of [['ana',A,200],['ana',B,401],['fer',B,200],['fer',A,401],['outsider',A,401],['expired',A,401]]) {
      const res=response();await presence({method:'GET',url:`/api/clinic-presence?clinic=${clinic}`,headers:{authorization:`Bearer ${token}`}},res);assert.equal(res.statusCode,want,`${token} to ${clinic}`);
    }
    assert.equal(selected.some(call=>call.clinic===`eq.${B}`&&call.table!=='clinics'),true);
  } finally {globalThis.fetch=prior.fetch;for(const [key,value] of [['SUPABASE_URL',prior.url],['SUPABASE_SECRET_KEY',prior.key]]) if(value===undefined)delete process.env[key];else process.env[key]=value;}
});

test('archived approved material cannot yield a new signed URL',async()=>{
  await fixture('doctor',async calls=>{
    const res=await request(A,'POST',{action:'download',version_id:V});assert.equal(res.statusCode,404);
    assert.equal(calls.some(c=>c.url.includes('/storage/v1/')),false);
  },'approved',A,true);
});

test('foreign clinic request, file and measurement actions fail at membership gate',async()=>{
  await fixture('admin',async calls=>{
    for(const [method,body] of [['POST',{action:'download',version_id:V}],['POST',{action:'request',kind:'sitio',title:'Cambiar portada',description:'Actualizar foto'}],['PATCH',{action:'measurement-link',site_id:V}]]) {
      assert.equal((await request(B,method,body)).statusCode,401);
    }
    const measured=response();await presence({method:'GET',url:`/api/clinic-presence?clinic=${B}&action=measurement`,headers:{authorization:'Bearer token'}},measured);
    assert.equal(measured.statusCode,401);
    assert.equal(calls.some(c=>['clinic_brand_versions','clinic_service_requests','measurement_sites'].includes(c.table)),false);
  });
});

test('measurement outage leaves brand and requests available with unverified state',async()=>{
  const old={fetch:globalThis.fetch,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY};
  process.env.SUPABASE_URL='https://db.example.supabase.co';process.env.SUPABASE_SECRET_KEY='secret';
  globalThis.fetch=async(url)=>{
    const parsed=new URL(url),table=parsed.pathname.split('/').at(-1);
    if(parsed.pathname==='/auth/v1/user')return Response.json({id:'ana',email:'ana@example.com'});
    if(table==='clinic_memberships')return Response.json([{clinic_id:A,user_id:'ana',active:true,role:'doctor'}]);
    if(table==='clinics')return Response.json([{id:A,name:'Ana',website_url:'https://ana.example.com'}]);
    if(table==='clinic_measurement_links')return Response.json([{site_id:V,verified_at:'2026-11-19T00:00:00Z'}]);
    if(table==='measurement_sites')return Response.json([{id:V,slug:'ana',active:true,allowed_origins:['https://ana.example.com']}]);
    if(table==='measurement_event_daily')return new Response('',{status:503});
    return Response.json([]);
  };
  try{const res=await request(A);assert.equal(res.statusCode,200);assert.deepEqual(res.body.resources,[]);const metrics=response();await presence({method:'GET',url:`/api/clinic-presence?clinic=${A}&action=measurement`,headers:{authorization:'Bearer token'}},metrics);assert.equal(metrics.statusCode,200);assert.equal(metrics.body.status,'medición no disponible');}
  finally{globalThis.fetch=old.fetch;for(const [key,value] of [['SUPABASE_URL',old.url],['SUPABASE_SECRET_KEY',old.key]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
