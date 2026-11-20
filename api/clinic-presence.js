import { randomUUID } from 'node:crypto';
import { db, json, readBody, validText } from '../src/server/commerce.js';
import { queryValue, userFromRequest } from '../src/server/consultorio.js';
import { deliverRequestNotice } from '../src/server/clinic-request-notices.js';

const q = queryValue;
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const categories = ['logo','tipografia','color','plantilla','fotografia','otro'];
const kinds = ['sitio','marca','ayuda técnica','cotización'];
const statuses = ['recibida','en revisión','en proceso','completada'];
const bucket = 'clinic-brand';
const row = async (table, query) => (await db(table,{query}))[0] || null;
const scoped = (clinicId,id) => `?id=eq.${q(id)}&clinic_id=eq.${q(clinicId)}&select=*&limit=1`;
const safe = (value,max) => validText(value,max) && !/[<>\r\n]/.test(value);

async function storage(path, { method='POST', body, type='application/json' }={}) {
  const base=new URL(process.env.SUPABASE_URL);
  const url=new URL(`/storage/v1/object/${path}`,base);
  const key=process.env.SUPABASE_SECRET_KEY;
  const headers={apikey:key,'Content-Type':type};
  if(!key.startsWith('sb_secret_')) headers.Authorization=`Bearer ${key}`;
  const response=await fetch(url,{method,headers,body: type==='application/json' ? JSON.stringify(body) : body,signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error(`Storage ${response.status}`);
  return response.json();
}
async function event(clinicId,type,resourceId,actorId,details={}) {
  await db('clinic_presence_events',{method:'POST',body:{clinic_id:clinicId,type,resource_id:resourceId,actor_id:actorId,details}});
}
async function metrics(clinic,clinicId) {
  const link=await row('clinic_measurement_links',`?clinic_id=eq.${q(clinicId)}&select=site_id,verified_at,verified_by&limit=1`);
  if(!link?.verified_at || !clinic.website_url) return {status:'sin datos verificados'};
  const site=await row('measurement_sites',`?id=eq.${q(link.site_id)}&select=id,slug,allowed_origins,active&limit=1`);
  let origin;try { origin=new URL(clinic.website_url).origin; } catch { return {status:'sin datos verificados'}; }
  if(!site?.active || !site.allowed_origins?.includes(origin)) return {status:'sin datos verificados'};
  const end=new Date(), start=new Date(end.getTime()-30*86400000);
  const daily=await db('clinic_measurement_daily',{query:`?site_id=eq.${q(site.id)}&day=gte.${start.toISOString().slice(0,10)}&select=day,visits,clicks,forms,booking_requests,confirmed_appointments&limit=35`});
  const totals=Object.fromEntries(['visits','clicks','forms','booking_requests','confirmed_appointments'].map(key=>[key,daily.reduce((sum,d)=>sum+Number(d[key]),0)]));
  return {status:'verificado',period:{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)},source:site.slug,...totals};
}
export default async function handler(req,res) {
  if(!['GET','POST','PATCH'].includes(req.method)) return json(res,405,{error:'Método no permitido'});
  const url=new URL(req.url,'https://www.orkestalo.com'), clinicId=url.searchParams.get('clinic');
  if(!uuid(clinicId)) return json(res,400,{error:'Consultorio inválido'});
  let user,member;
  try {
    user=await userFromRequest(req);
    if(!user) return json(res,401,{error:'Acceso restringido'});
    member=await row('clinic_memberships',`?clinic_id=eq.${q(clinicId)}&user_id=eq.${q(user.id)}&active=eq.true&select=clinic_id,user_id,role&limit=1`);
    if(!member) return json(res,401,{error:'Acceso restringido'});
    const admin=member.role==='admin';
    const clinic=await row('clinics',`?id=eq.${q(clinicId)}&select=id,name,website_url&limit=1`);
    if(!clinic) return json(res,404,{error:'Consultorio no encontrado'});
    if(req.method==='GET') {
      const [resources,versions,presence,requests,history,events,results,pilot]=await Promise.all([
        db('clinic_brand_resources',{query:`?clinic_id=eq.${q(clinicId)}&select=*&order=created_at.desc&limit=100`}),
        db('clinic_brand_versions',{query:`?clinic_id=eq.${q(clinicId)}&select=id,resource_id,version,status,name,category,uses,license,restrictions,reference_only,created_at,approved_at,approved_by&order=created_at.desc&limit=300`}),
        row('clinic_presence_profiles',`?clinic_id=eq.${q(clinicId)}&select=*&limit=1`),
        db('clinic_service_requests',{query:`?clinic_id=eq.${q(clinicId)}&select=*&order=created_at.desc&limit=100`}),
        db('clinic_request_history',{query:`?clinic_id=eq.${q(clinicId)}&select=*&order=created_at.desc&limit=500`}),
        db('clinic_presence_events',{query:`?clinic_id=eq.${q(clinicId)}&select=id,type,resource_id,details,created_at&order=created_at.desc&limit=50`}),
        metrics(clinic,clinicId).catch(error=>{console.error('Medición consultorio',error);return {status:'sin datos verificados'};}),
        admin ? row('clinic_pilot_scorecards',`?clinic_id=eq.${q(clinicId)}&select=*&limit=1`) : null
      ]);
      return json(res,200,{role:member.role,resources,versions,presence,requests,history,events,results,pilot});
    }
    const input=typeof req.body==='string' && req.body.length<=3000000 ? JSON.parse(req.body) : readBody(req)||{}, action=input.action;
    if(action==='download' && req.method==='POST') {
      if(!uuid(input.version_id)) return json(res,400,{error:'Versión inválida'});
      const version=await row('clinic_brand_versions',scoped(clinicId,input.version_id));
      if(!version || version.clinic_id!==clinicId || version.status!=='approved' || version.reference_only || !version.storage_path?.startsWith(`${clinicId}/`)) return json(res,404,{error:'Versión no disponible'});
      const resource=await row('clinic_brand_resources',scoped(clinicId,version.resource_id));
      if(!resource || resource.archived_at) return json(res,404,{error:'Recurso archivado'});
      const signed=await storage(`sign/${bucket}/${version.storage_path}`,{body:{expiresIn:300}});
      if(!signed.signedURL?.startsWith('/object/sign/')) throw new Error('Firma inválida');
      return json(res,200,{url:new URL(`/storage/v1${signed.signedURL}`,process.env.SUPABASE_URL).toString(),expiresIn:300});
    }
    if(action==='approve' && req.method==='PATCH') {
      if(member.role!=='doctor') return json(res,403,{error:'La doctora debe aprobar la versión'});
      if(!uuid(input.version_id)) return json(res,400,{error:'Versión inválida'});
      const version=await row('clinic_brand_versions',scoped(clinicId,input.version_id));
      if(!version || version.clinic_id!==clinicId || version.status!=='draft') return json(res,404,{error:'Versión no disponible'});
      const resource=await row('clinic_brand_resources',scoped(clinicId,version.resource_id));
      if(!resource || resource.archived_at) return json(res,404,{error:'Recurso archivado'});
      const updated=await db('clinic_brand_versions',{method:'PATCH',query:`?id=eq.${q(input.version_id)}&clinic_id=eq.${q(clinicId)}&status=eq.draft`,body:{status:'approved',approved_at:new Date().toISOString(),approved_by:user.id}});
      if(!updated.length) return json(res,409,{error:'La versión ya cambió'});
      await event(clinicId,'version_approved',version.resource_id,user.id,{version_id:version.id});
      return json(res,200,{version:updated[0]});
    }
    if(action==='request' && req.method==='POST') {
      if(!kinds.includes(input.kind) || !safe(input.title,120) || !validText(input.description,2000)) return json(res,400,{error:'Revisa la solicitud'});
      const [request]=await db('clinic_service_requests',{method:'POST',body:{clinic_id:clinicId,kind:input.kind,title:input.title.trim(),description:input.description.trim(),requester_id:user.id,requester_email:user.email,status:'recibida'}});
      const [history]=await db('clinic_request_history',{method:'POST',body:{clinic_id:clinicId,request_id:request.id,actor_id:user.id,actor_label:user.email,status:'recibida'}});
      await event(clinicId,'request_created',request.id,user.id);
      await deliverRequestNotice(clinic,request,history);
      return json(res,201,{request});
    }
    if(action==='presence-review' && req.method==='PATCH') {
      if(member.role!=='doctor') return json(res,403,{error:'La doctora debe revisar la ficha'});
      const updated=await db('clinic_presence_profiles',{method:'PATCH',query:`?clinic_id=eq.${q(clinicId)}`,body:{reviewed_by_doctor_at:new Date().toISOString(),reviewed_by_doctor:user.id}});
      if(!updated.length) return json(res,404,{error:'Ficha no disponible'});
      await event(clinicId,'presence_reviewed',clinicId,user.id);
      return json(res,200,{presence:updated[0]});
    }
    if(!admin) return json(res,403,{error:'Solo Orkesta puede realizar esta acción'});
    if(action==='pilot-scorecard' && req.method==='PATCH') {
      if(!Number.isInteger(input.setup_minutes)||input.setup_minutes<0||input.setup_minutes>100000||!Number.isInteger(input.support_minutes)||input.support_minutes<0||input.support_minutes>100000||!validText(input.discontinued_tasks||'',2000,0)||!validText(input.usage_notes||'',2000,0)||!validText(input.proposal_scope||'',2000,0)||!validText(input.response_notes||'',2000,0)||input.proposed_price_mxn!=null&&(!Number.isFinite(input.proposed_price_mxn)||input.proposed_price_mxn<0)||input.would_buy!=null&&typeof input.would_buy!=='boolean') return json(res,400,{error:'Registro inválido'});
      const [scorecard]=await db('clinic_pilot_scorecards',{method:'POST',query:'?on_conflict=clinic_id',body:{clinic_id:clinicId,setup_minutes:input.setup_minutes,support_minutes:input.support_minutes,discontinued_tasks:input.discontinued_tasks||'',usage_notes:input.usage_notes||'',proposal_scope:input.proposal_scope||'',proposed_price_mxn:input.proposed_price_mxn??null,would_buy:input.would_buy??null,response_notes:input.response_notes||'',updated_at:new Date().toISOString(),updated_by:user.id},prefer:'resolution=merge-duplicates,return=representation'});
      return json(res,200,{scorecard});
    }
    if(action==='pilot-start' && req.method==='PATCH') {
      const approved=await db('clinic_brand_versions',{query:`?clinic_id=eq.${q(clinicId)}&status=eq.approved&select=id&limit=1`});
      const profile=await row('clinic_presence_profiles',`?clinic_id=eq.${q(clinicId)}&reviewed_by_doctor_at=not.is.null&select=clinic_id&limit=1`);
      if(!approved.length||!profile) return json(res,409,{error:'La biblioteca y la ficha deben estar revisadas antes de iniciar'});
      const existing=await row('clinic_pilot_scorecards',`?clinic_id=eq.${q(clinicId)}&select=*&limit=1`);
      if(existing?.start_at) return json(res,409,{error:'El piloto ya inició'});
      const [scorecard]=await db('clinic_pilot_scorecards',{method:'POST',query:'?on_conflict=clinic_id',body:{...existing,clinic_id:clinicId,start_at:new Date().toISOString(),updated_by:user.id},prefer:'resolution=merge-duplicates,return=representation'});
      return json(res,200,{scorecard});
    }
    if(action==='upload' && req.method==='POST') {
      const referenceOnly=input.reference_only===true;
      if(!safe(input.name,120) || !categories.includes(input.category) || !Array.isArray(input.uses) || input.uses.length>12 || input.uses.some(use=>!safe(use,120)) || !validText(input.license,500) || !validText(input.restrictions||'',500,0) || (referenceOnly ? input.data!=null : !safe(input.filename,120) || !['application/pdf','image/svg+xml','image/png','image/jpeg','image/webp','application/zip'].includes(input.mime) || typeof input.data!=='string' || input.data.length>2800000 || !/^[a-zA-Z0-9+/]*={0,2}$/.test(input.data))) return json(res,400,{error:'Material inválido'});
      const bytes=referenceOnly?null:Buffer.from(input.data,'base64');
      if(!referenceOnly && (!bytes.length || bytes.length>2*1024*1024)) return json(res,400,{error:'Archivo demasiado grande'});
      let resource=input.resource_id && uuid(input.resource_id) ? await row('clinic_brand_resources',scoped(clinicId,input.resource_id)) : null;
      if(input.resource_id && !resource) return json(res,404,{error:'Recurso no encontrado'});
      if(!resource) [resource]=await db('clinic_brand_resources',{method:'POST',body:{clinic_id:clinicId,name:input.name.trim(),category:input.category,created_by:user.id}});
      const prior=await db('clinic_brand_versions',{query:`?clinic_id=eq.${q(clinicId)}&resource_id=eq.${q(resource.id)}&select=version&order=version.desc&limit=1`});
      const versionId=randomUUID(),path=`${clinicId}/${resource.id}/${versionId}`;
      if(!referenceOnly) await storage(`${bucket}/${path}`,{body:bytes,type:input.mime});
      const [version]=await db('clinic_brand_versions',{method:'POST',body:{id:versionId,clinic_id:clinicId,resource_id:resource.id,version:(prior[0]?.version||0)+1,name:input.name.trim(),category:input.category,filename:referenceOnly?null:input.filename.trim(),mime:referenceOnly?null:input.mime,storage_path:referenceOnly?null:path,reference_only:referenceOnly,uses:input.uses,license:input.license.trim(),restrictions:(input.restrictions||'').trim(),created_by:user.id,status:'draft'}});
      await event(clinicId,'version_uploaded',resource.id,user.id,{version_id:version.id});
      return json(res,201,{resource,version});
    }
    if(action==='archive' && req.method==='PATCH') {
      if(!uuid(input.resource_id)) return json(res,400,{error:'Recurso inválido'});
      const updated=await db('clinic_brand_resources',{method:'PATCH',query:`?id=eq.${q(input.resource_id)}&clinic_id=eq.${q(clinicId)}&archived_at=is.null`,body:{archived_at:new Date().toISOString(),archived_by:user.id}});
      if(!updated.length) return json(res,404,{error:'Recurso no encontrado'});
      await event(clinicId,'resource_archived',input.resource_id,user.id);
      return json(res,200,{resource:updated[0]});
    }
    if(action==='presence' && req.method==='PATCH') {
      if(!Array.isArray(input.links) || input.links.length>12 || input.links.some(link=>!safe(link.label,80)||!/^https:\/\//.test(link.url)||link.url.length>500) || !Array.isArray(input.checklist) || input.checklist.length>30 || input.checklist.some(check=>!safe(check.label,120)||typeof check.done!=='boolean') || !validText(input.evidence||'',2000,0) || !validText(input.next_action||'',500,0)) return json(res,400,{error:'Ficha inválida'});
      const [presence]=await db('clinic_presence_profiles',{method:'POST',query:'?on_conflict=clinic_id',body:{clinic_id:clinicId,links:input.links,checklist:input.checklist,evidence:input.evidence||'',next_action:input.next_action||'',reviewed_at:new Date().toISOString(),reviewed_by:user.id,reviewed_by_doctor_at:null,reviewed_by_doctor:null},prefer:'resolution=merge-duplicates,return=representation'});
      await event(clinicId,'presence_updated',clinicId,user.id);
      return json(res,200,{presence});
    }
    if(action==='request-status' && req.method==='PATCH') {
      if(!uuid(input.request_id)||!statuses.includes(input.status)||!safe(input.owner,120)) return json(res,400,{error:'Estado inválido'});
      const old=await row('clinic_service_requests',scoped(clinicId,input.request_id));
      if(!old) return json(res,404,{error:'Solicitud no encontrada'});
      if(statuses.indexOf(input.status)!==statuses.indexOf(old.status)+1) return json(res,409,{error:'Sigue el orden de estados'});
      const updated=await db('clinic_service_requests',{method:'PATCH',query:`?id=eq.${q(input.request_id)}&clinic_id=eq.${q(clinicId)}&status=eq.${q(old.status)}`,body:{status:input.status,owner:input.owner.trim(),updated_at:new Date().toISOString()}});
      if(!updated.length) return json(res,409,{error:'La solicitud ya cambió'});
      const [history]=await db('clinic_request_history',{method:'POST',body:{clinic_id:clinicId,request_id:input.request_id,actor_id:user.id,actor_label:user.email,status:input.status}});
      await event(clinicId,'request_status',input.request_id,user.id,{status:input.status});
      await deliverRequestNotice(clinic,updated[0],history);
      return json(res,200,{request:updated[0]});
    }
    if(action==='measurement-link' && req.method==='PATCH') {
      if(!uuid(input.site_id)||!clinic.website_url) return json(res,400,{error:'Sitio inválido'});
      const site=await row('measurement_sites',`?id=eq.${q(input.site_id)}&select=id,allowed_origins,active&limit=1`);
      if(!site?.active || !site.allowed_origins?.includes(new URL(clinic.website_url).origin)) return json(res,409,{error:'El sitio no coincide con el consultorio'});
      const [link]=await db('clinic_measurement_links',{method:'POST',query:'?on_conflict=clinic_id',body:{clinic_id:clinicId,site_id:site.id,verified_at:new Date().toISOString(),verified_by:user.id},prefer:'resolution=merge-duplicates,return=representation'});
      return json(res,200,{link});
    }
    return json(res,400,{error:'Acción inválida'});
  } catch(error) { console.error('Presencia consultorio',error); return json(res,503,{error:'Servicio no disponible'}); }
}
