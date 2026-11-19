const $ = id => document.getElementById(id);
let config, session, clinics = [], current, snapshot, generation = 0;
const saved = sessionStorage.getItem('consultorio_session');
try { session = saved ? JSON.parse(saved) : null; } catch { session = null; }
const show = (id, value) => { $(id).textContent = value; };
const note = value => show('notice', value);

async function auth(path, body) {
  const response = await fetch(`${config.url}/auth/v1/${path}`, { method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('No se pudo iniciar sesión. Revisa tus datos.');
  return response.json();
}
async function api(path, options = {}) {
  const accessToken = session.access_token;
  const response = await fetch(`/api/${path}`, { ...options, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (response.status === 401) { if (session?.access_token === accessToken) signOut(); throw new Error('La sesión venció. Vuelve a entrar.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción');
  return data;
}
function signOut() { generation++; session = null; current = null; snapshot = null; clinics = []; sessionStorage.removeItem('consultorio_session'); $('dashboard').hidden = true; $('login').hidden = false; $('logout').hidden = true; for (const id of ['login-form','task-form','manual-form','slot-form','booking-form']) $(id).reset(); for (const id of ['appointments','tasks','messages','slots','clinic-select']) $(id).replaceChildren(); $('booking-form').hidden = true; note(''); }
function element(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
function item(title, detail, action, onClick) {
  const row = element('div', null, 'item'), body = element('div');
  body.append(element('strong', title), element('small', detail)); row.append(body);
  if (action) { const button = element('button', action, 'quiet'); button.addEventListener('click', onClick); row.append(button); }
  return row;
}
const when = value => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const statusLabel = { confirmed: 'Confirmada', pending: 'Pendiente de confirmación', cancelled: 'Cancelada', attended: 'Atendida', missed: 'No asistió', unregistered: 'Falta registrar en Cal.com' };
function render() {
  const { clinic, appointments, tasks, messages, connected, paymentInvites = [] } = snapshot;
  show('clinic-name', clinic.name); show('cal-state', connected ? 'Cal.com conectado' : 'Conecta Cal.com para consultar horarios y crear citas.');
  $('cal-connect').hidden = connected;
  show('upcoming-count', appointments.filter(a => a.status === 'confirmed' && Date.parse(a.starts_at) > Date.now()).length);
  show('pending-count', tasks.filter(t => !t.done_at).length + appointments.filter(a => ['pending', 'unregistered'].includes(a.status)).length + paymentInvites.filter(i => i.status === 'pending').length);
  show('failed-count', messages.filter(m => ['failed', 'bounced'].includes(m.status)).length + paymentInvites.filter(i => ['failed', 'bounced'].includes(i.email_status)).length);
  const ap = $('appointments'); ap.replaceChildren();
  const visible = appointments.filter(a => Date.parse(a.starts_at) > Date.now() - 7 * 86400000).sort((a,b) => Date.parse(a.starts_at)-Date.parse(b.starts_at)).slice(0,50);
  if (!visible.length) ap.append(element('p','Aún no hay citas. Conecta Cal.com o registra una cita acordada por WhatsApp.','muted'));
  for (const a of visible) {
    const row = item(a.patient_name, `${when(a.starts_at)} · ${a.kind} · ${statusLabel[a.status] || a.status}`, a.status === 'confirmed' && Date.parse(a.starts_at) < Date.now() ? 'Marcar atendida' : null, async () => { try { await api(`consultorio?clinic=${current}`, { method: 'PATCH', body: JSON.stringify({ action: 'attend', id: a.id }) }); await load(); } catch (e) { note(e.message); } });
    if (['unregistered','pending','confirmed'].includes(a.status) && !a.survey_allowed) { const consent = element('button','Autorizó encuesta','quiet'); consent.addEventListener('click', () => run(async () => { await api(`consultorio?clinic=${current}`, { method:'PATCH', body:JSON.stringify({ action:'survey-consent', id:a.id, allowed:true }) }); await load(); })); row.append(consent); }
    ap.append(row);
  }
  for (const invite of paymentInvites.filter(i => i.status === 'pending')) ap.append(item(invite.patient_name, `${when(invite.requested_start)} · Enlace con anticipo pendiente · Correo ${invite.email_status}`));
  const taskList = $('tasks'); taskList.replaceChildren();
  const open = tasks.filter(t => !t.done_at); if (!open.length) taskList.append(element('p','No hay pendientes abiertos.','muted'));
  for (const t of open) taskList.append(item(t.title, when(t.created_at), 'Hecho', async () => { try { await api(`consultorio?clinic=${current}`, { method: 'PATCH', body: JSON.stringify({ action: 'task', id: t.id, done: true }) }); await load(); } catch(e) { note(e.message); } }));
  const ml = $('messages'); ml.replaceChildren();
  if (!messages.length) ml.append(element('p','Aún no se han enviado mensajes.','muted'));
  for (const m of messages.slice(0,20)) ml.append(item(m.kind === 'welcome' ? 'Bienvenida' : 'Encuesta', `${m.status}${m.last_error ? ` · ${m.last_error}` : ''} · ${when(m.created_at)}`));
  for (const invite of paymentInvites.slice(0,10)) ml.append(item('Enlace con anticipo', `${invite.email_status} · ${when(invite.created_at)}`));
}
async function load() { if (!current || !session) return; const version = generation, clinic = current, accessToken = session.access_token; const result = await api(`consultorio?clinic=${clinic}`); if (version !== generation || clinic !== current || accessToken !== session?.access_token) return; snapshot = result; render(); }
async function enter() {
  const version = generation, accessToken = session?.access_token;
  const data = await api('consultorio?action=clinics');
  if (version !== generation || accessToken !== session?.access_token) return;
  clinics = data.clinics;
  if (!clinics.length) { signOut(); throw new Error('Tu cuenta aún no está asignada a un consultorio.'); }
  const select = $('clinic-select'); select.replaceChildren();
  for (const clinic of clinics) { const option = element('option', clinic.name); option.value = clinic.id; select.append(option); }
  current = clinics[0].id; await load(); if (!session) return; $('dashboard').hidden = false; $('login').hidden = true; $('logout').hidden = false; $('login-form').reset();
}
function formData(form) { return Object.fromEntries(new FormData(form)); }
async function run(fn) { try { note(''); await fn(); } catch (e) { note(e.message); } }
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); show('login-error','');
  try { const form = formData(event.currentTarget); session = await auth('token?grant_type=password', { email: form.email, password: form.password }); sessionStorage.setItem('consultorio_session', JSON.stringify(session)); await enter(); }
  catch (error) { signOut(); show('login-error', error.message); }
});
$('logout').addEventListener('click', signOut);
$('refresh').addEventListener('click', () => run(load));
$('clinic-select').addEventListener('change', event => { generation++; current = event.target.value; snapshot = null; $('dashboard').hidden = true; run(async () => { await load(); if (snapshot && current === event.target.value) $('dashboard').hidden = false; }); });
$('task-form').addEventListener('submit', event => { event.preventDefault(); run(async () => { await api(`consultorio?clinic=${current}`, { method:'POST', body: JSON.stringify({ action:'task', title:formData(event.target).title }) }); event.target.reset(); await load(); }); });
$('manual-form').addEventListener('submit', event => { event.preventDefault(); run(async () => { const form = formData(event.target); await api(`consultorio?clinic=${current}`, { method:'POST', body: JSON.stringify({ action:'manual', name:form.name, email:form.email, phone:form.phone, start:new Date(form.start).toISOString(), end:new Date(form.end).toISOString(), surveyAllowed: !!form.surveyAllowed }) }); event.target.reset(); await load(); note('Cita pendiente guardada. Regístrala en Cal.com.'); }); });
$('cal-connect').addEventListener('click', () => run(async () => { const data = await api(`consultorio?action=connect&clinic=${current}`, { method:'POST' }); location.assign(data.url); }));
$('slot-form').addEventListener('submit', event => { event.preventDefault(); run(async () => { const form = formData(event.target); const start = new Date(`${form.start}T00:00:00`).toISOString(), end = new Date(`${form.end}T23:59:59`).toISOString(); const data = await api(`consultorio?action=slots&clinic=${current}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`); const slots = $('slots'); slots.replaceChildren(); const times = Object.values(data.slots || {}).flat().map(x => typeof x === 'string' ? x : x.time || x.start).filter(Boolean); if (!times.length) slots.append(element('p','No hay horarios disponibles en ese periodo.','muted')); for (const time of times) { const button = element('button',when(time)); button.type='button'; button.addEventListener('click', () => { $('booking-form').hidden = false; $('booking-form').elements.start.value = time; $('booking-form').scrollIntoView({ behavior:'smooth', block:'nearest' }); }); slots.append(button); } }); });
$('booking-form').addEventListener('submit', event => { event.preventDefault(); run(async () => { const form = formData(event.target); const data = await api(`consultorio?action=booking&clinic=${current}`, { method:'POST', body:JSON.stringify({ name:form.name, email:form.email, start:form.start, payment:!!form.payment }) }); note(data.invitePending ? (data.emailSent ? 'Enlace de anticipo enviado. La reserva aparecerá al confirmarse el pago.' : 'La invitación quedó pendiente; el correo falló y se reintentará.') : 'Cita creada en Cal.com. Actualiza el panel en unos segundos.'); event.target.reset(); event.target.hidden=true; await load(); }); });
show('today', new Intl.DateTimeFormat('es-MX',{ dateStyle:'full' }).format(new Date()));
(async () => { try { const response = await fetch('/api/consultorio-misc?route=config'); if (!response.ok) throw new Error('Piloto no configurado'); config = await response.json(); if (!config.url || !config.key) throw new Error('Piloto no configurado'); if (session?.access_token) await enter(); } catch (error) { signOut(); show('login-error', error.message); } })();
