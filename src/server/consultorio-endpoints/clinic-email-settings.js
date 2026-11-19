import { db, json, readBody, validEmail, validText } from '../commerce.js';
import { approvedTemplate, queryValue } from '../consultorio.js';
import { extractSiteProposal, prepareEmail, starterTemplates, templateKinds } from '../clinic-email-content.js';
import { canActivateEmail, onboardingSteps, siteUrlAllowed } from '../consultorio-onboarding.js';
import { readPublicSite } from '../public-site.js';

const q = queryValue;
const one = async (table, query) => (await db(table, { query }))[0] || null;
const drafts = async clinicId => db('clinic_email_templates', { query:`?clinic_id=eq.${q(clinicId)}&select=*&order=version.desc&limit=100` });
const validTemplate = input => templateKinds.includes(input.kind) && validText(input.subject, 200) && !/[\r\n]/.test(input.subject) && validText(input.body, 5000);

export default async function emailSettings(req, res, { clinic, clinicId, user, action, siteReader = readPublicSite }) {
  const input = req.method === 'GET' ? {} : readBody(req) || {};
  if (req.method === 'GET' && action === 'email') {
    const [templates, analyses, connections] = await Promise.all([drafts(clinicId), db('clinic_site_analyses', { query:`?clinic_id=eq.${q(clinicId)}&select=proposal,created_at&order=created_at.desc&limit=1` }), db('clinic_cal_connections', { query:`?clinic_id=eq.${q(clinicId)}&select=connected_at` })]);
    return json(res, 200, { clinic, templates, proposal:analyses[0] || null, steps:onboardingSteps({ clinic, connected:!!connections.length, templates }) });
  }
  if (req.method === 'POST' && action === 'analyze-site') {
    const site = siteUrlAllowed(clinic.website_url);
    if (!site) return json(res, 409, { error:'Sitio no configurado' });
    const pages = [site.toString()];
    let proposal = {};
    for (const page of pages) {
      const html = await siteReader(page);
      if (!html) continue;
      const extracted = extractSiteProposal(page, html);
      proposal = { ...extracted, ...proposal };
    }
    await db('clinic_site_analyses', { method:'POST', body:{ clinic_id:clinicId, proposal } });
    await db('clinics', { method:'PATCH', query:`?id=eq.${q(clinicId)}`, body:{ content_reviewed_at:null } });
    const existing = await drafts(clinicId);
    for (const [kind, content] of Object.entries(starterTemplates(proposal))) {
      const history = existing.filter(row => row.kind === kind);
      if (history.some(row => !row.approved_at)) continue;
      await db('clinic_email_templates', { method:'POST', body:{ clinic_id:clinicId, kind, version:(history[0]?.version || 0)+1, ...content } });
    }
    return json(res, 200, { proposal, templates:await drafts(clinicId) });
  }
  if (req.method === 'PATCH' && action === 'email-settings') {
    const changes = {};
    if (input.website_url !== undefined) {
      if (input.website_url && !siteUrlAllowed(input.website_url)) return json(res, 400, { error:'Sitio inválido' });
      changes.website_url = input.website_url ? siteUrlAllowed(input.website_url).toString() : null;
      if (changes.website_url !== clinic.website_url) changes.content_reviewed_at = null;
    }
    if (input.sender_name !== undefined) {
      if (!validText(input.sender_name, 120) || /[<>\r\n]/.test(input.sender_name)) return json(res, 400, { error:'Nombre inválido' });
      changes.sender_name = input.sender_name.trim();
      if (changes.sender_name !== clinic.sender_name) changes.identity_confirmed_at = null;
      if (changes.sender_name !== clinic.sender_name) changes.content_reviewed_at = null;
    }
    if (input.reply_to !== undefined) {
      if (!validEmail(input.reply_to)) return json(res, 400, { error:'Correo inválido' });
      changes.reply_to = input.reply_to.trim().toLowerCase();
      if (changes.reply_to !== clinic.reply_to) changes.identity_confirmed_at = null;
      if (changes.reply_to !== clinic.reply_to) changes.content_reviewed_at = null;
    }
    if (input.brand_color !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(input.brand_color)) return json(res, 400, { error:'Color inválido' });
      changes.brand_color = input.brand_color;
      if (changes.brand_color !== clinic.brand_color) changes.content_reviewed_at = null;
    }
    if (input.location !== undefined) {
      if (!validText(input.location, 250, 0)) return json(res, 400, { error:'Ubicación inválida' });
      changes.location = input.location.trim();
      if (changes.location !== clinic.location) changes.content_reviewed_at = null;
    }
    if (input.identity_confirmed === true) {
      if (!validText(changes.sender_name || clinic.sender_name, 120) || !validEmail(changes.reply_to || clinic.reply_to)) return json(res, 409, { error:'Completa nombre y correo de respuestas' });
      changes.identity_confirmed_at = new Date().toISOString();
    }
    if (input.content_reviewed === true) changes.content_reviewed_at = new Date().toISOString();
    if (input.privacy_accepted === true) {
      changes.privacy_accepted_at = new Date().toISOString();
      changes.privacy_version = 'consultorio-privacidad-v1';
    }
    for (const kind of templateKinds) {
      const key = `${kind}_enabled`;
      if (input[key] === undefined) continue;
      if (typeof input[key] !== 'boolean') return json(res, 400, { error:'Estado inválido' });
      if (input[key]) {
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET || kind === 'survey' && !process.env.SURVEY_TOKEN_SECRET) return json(res, 503, { error:'Falta configurar el envío global de correos o encuestas' });
        const [templates, connections] = await Promise.all([drafts(clinicId), db('clinic_cal_connections', { query:`?clinic_id=eq.${q(clinicId)}&select=connected_at` })]);
        if (!canActivateEmail({ clinic:{ ...clinic, ...changes }, connected:!!connections.length, templates, kind })) return json(res, 409, { error:`Completa Cal.com, privacidad y la prueba aprobada de ${kind} antes de activarlo` });
      }
      changes[key] = input[key];
    }
    if (!Object.keys(changes).length) return json(res, 400, { error:'Sin cambios' });
    const [updated] = await db('clinics', { method:'PATCH', query:`?id=eq.${q(clinicId)}`, body:changes });
    const publicFields = ['id','name','doctor_name','sender_name','reply_to','website_url','location','brand_color','cal_event_type_id','cal_paid_event_type_id','cal_booking_url','cal_webhook_ready','cal_paid_event_ready','cal_paid_webhook_ready','identity_confirmed_at','content_reviewed_at','privacy_accepted_at','welcome_enabled','followup_enabled','invite_enabled','survey_enabled'];
    return json(res, 200, { clinic:Object.fromEntries(publicFields.map(key => [key,updated?.[key]])) });
  }
  if (req.method === 'PATCH' && action === 'email-template') {
    if (!validTemplate(input)) return json(res, 400, { error:'Plantilla inválida' });
    const history = (await drafts(clinicId)).filter(row => row.kind === input.kind);
    const draft = history.find(row => !row.approved_at);
    const body = { subject:input.subject.trim(), body:input.body.trim(), tested_at:null, tested_revision:null };
    const [saved] = draft
      ? await db('clinic_email_templates', { method:'PATCH', query:`?id=eq.${q(draft.id)}&clinic_id=eq.${q(clinicId)}&approved_at=is.null&revision=eq.${draft.revision}`, body:{ ...body, revision:draft.revision+1 } })
      : await db('clinic_email_templates', { method:'POST', body:{ clinic_id:clinicId, kind:input.kind, version:(history[0]?.version || 0)+1, ...body } });
    if (!saved) return json(res, 409, { error:'El borrador cambió; actualiza el panel' });
    return json(res, 200, { template:saved });
  }
  if (req.method === 'POST' && ['email-preview','email-test','email-approve'].includes(action)) {
    const template = await one('clinic_email_templates', `?id=eq.${q(input.id || '')}&clinic_id=eq.${q(clinicId)}&select=*&limit=1`);
    if (!template) return json(res, 404, { error:'Plantilla no encontrada' });
    if (action === 'email-approve') {
      if (template.approved_at) return json(res, 200, { template });
      if (!template.tested_at || template.tested_revision !== template.revision) return json(res, 409, { error:'Envíate una prueba de esta versión antes de aprobar' });
      const [approved] = await db('clinic_email_templates', { method:'PATCH', query:`?id=eq.${q(template.id)}&clinic_id=eq.${q(clinicId)}&approved_at=is.null&revision=eq.${template.revision}&tested_revision=eq.${template.revision}`, body:{ approved_at:new Date().toISOString() } });
      if (!approved) return json(res, 409, { error:'La plantilla cambió; actualiza el panel' });
      return json(res, 200, { template:approved });
    }
    const email = prepareEmail(clinic, template, { patient:'Paciente de prueba', doctor:clinic.doctor_name, booking_url:clinic.cal_booking_url || 'https://cal.com/', survey_url:'https://www.orkestalo.com/encuesta/', location:clinic.location || '' }, user.email);
    if (action === 'email-preview') return json(res, 200, { email });
    if (!validEmail(user.email) || !process.env.RESEND_API_KEY) return json(res, 503, { error:'Prueba no disponible' });
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ ...email, subject:`[PRUEBA] ${email.subject}`, template_version:undefined }), signal:AbortSignal.timeout(8000) });
    if (!response.ok) return json(res, 503, { error:'No se pudo enviar la prueba' });
    const tested = await db('clinic_email_templates', { method:'PATCH', query:`?id=eq.${q(template.id)}&clinic_id=eq.${q(clinicId)}&revision=eq.${template.revision}`, body:{ tested_at:new Date().toISOString(), tested_revision:template.revision } });
    if (!tested.length) return json(res, 409, { error:'El borrador cambió mientras se enviaba la prueba' });
    return json(res, 200, { sent:true });
  }
  return json(res, 400, { error:'Acción inválida' });
}
