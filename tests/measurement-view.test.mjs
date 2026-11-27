import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementViewModel } from '../src/measurement/dashboard-view.js';

test('site view uses contact clicks and verified funnel while keeping agenda actions separate', () => {
  const dataset = {
    sites: [{ id: 'ana', name: 'Ana', active: true }], updatedAt: '2026-11-19T12:00:00Z',
    daily: [{ site_id: 'ana', day: '2026-11-19', visits: 4, contact_clicks: 1, form_submits: 0 }],
    funnel: [{ site_id: 'ana', day: '2026-11-19', source: 'directo', medium: '', campaign: '', visits: 2, bookings: 1, approved_payments: 0, confirmed_appointments: 1 }],
    actions: [{ site_id: 'ana', path: '/', name: 'agenda_click', label: '', events: 3 }],
    sources: [], external: [], connections: [],
  };
  const model = measurementViewModel(dataset, 'ana');
  assert.deepEqual(model.metrics.map(x => x.value), [4, 1, 0, 1, 0, 1]);
  assert.equal(model.actions[0].events, 3);
  assert.equal(model.funnel[0].bookings, 1);
  assert.equal(model.updatedAt, dataset.updatedAt);
});

test('no rows are unmeasured rather than zero, including unattributed conversions', () => {
  const model = measurementViewModel({ sites: [{ id: 'ana', name: 'Ana', active: false }], daily: [], funnel: [], actions: [], sources: [], external: [], connections: [] }, 'ana');
  assert.deepEqual(model.metrics.map(x => x.value), Array(6).fill('Aún sin datos'));
  assert.equal(model.site.active, false);
});

test('one site has identical indicators and every detail table in admin and clinic views', () => {
  const site = { id:'ana', name:'Ana', active:true };
  const own = {
    sites:[site], updatedAt:'2026-11-19T12:00:00Z',
    daily:[{site_id:'ana',day:'2026-11-19',visits:5,contact_clicks:2,form_submits:1}],
    funnel:[{site_id:'ana',day:'2026-11-19',source:'directo',medium:'',campaign:'',visits:3,bookings:2,approved_payments:1,confirmed_appointments:1}],
    actions:[{site_id:'ana',path:'/',name:'agenda_click',label:'reservar',events:4}],
    sources:[{site_id:'ana',source:'directo',medium:'',campaign:'',visits:5,contact_clicks:2}],
    external:[{site_id:'ana',day:'2026-11-19',provider:'search_console',campaign_ref:'',metric:'clicks',value:8}],
    connections:[{site_id:'ana',provider:'search_console',last_synced_at:'2026-11-19T10:00:00Z',last_error:null}],
  };
  const foreign = Object.fromEntries(['daily','funnel','actions','sources','external','connections'].map(key => [key,own[key].map(row => ({...row,site_id:'fer'}))]));
  const admin = {...own,sites:[site,{id:'fer',name:'Fer',active:true}],...Object.fromEntries(Object.keys(foreign).map(key => [key,[...own[key],...foreign[key]]]))};
  assert.deepEqual(measurementViewModel(admin,'ana'),measurementViewModel(own,'ana'));
});

test('view model groups consented page visits and directed transitions', () => {
  const model = measurementViewModel({
    sites: [{ id: 'orkesta', name: 'Orkesta', active: true }], daily: [], funnel: [], actions: [], sources: [], external: [], connections: [],
    pages: [{ site_id: 'orkesta', day: '2026-11-25', path: '/proyectos/', page_views: 2, visits: 2 }, { site_id: 'orkesta', day: '2026-11-26', path: '/proyectos/', page_views: 1, visits: 1 }],
    transitions: [{ site_id: 'orkesta', day: '2026-11-26', from_path: '/proyectos/', to_path: '/contacto/', transitions: 2 }],
  }, 'orkesta');
  assert.deepEqual(model.pages.map(({ path, page_views, visits }) => [path, page_views, visits]), [['/proyectos/', 3, 3]]);
  assert.deepEqual(model.transitions.map(({ from_path, to_path, transitions }) => [from_path, to_path, transitions]), [['/proyectos/', '/contacto/', 2]]);
});

test('CAMI uses draft and click labels without claiming delivery', () => {
  const model = measurementViewModel({
    sites: [{ id: 'cami', slug: 'engranes-cami', name: 'Engranes CAMI', active: false }],
    daily: [{ site_id: 'cami', day: '2026-11-27', visits: 4, contact_clicks: 2, quote_drafts: 1, form_errors: 3 }],
    actions: [{ site_id: 'cami', path: '/', name: 'product_interest', label: 'engranes-rectos', events: 2 }],
    channels: [{ site_id: 'cami', day: '2026-11-27', channel: 'whatsapp', clicks: 2 }],
    funnel: [], sources: [], external: [], connections: [],
  }, 'cami');
  assert.deepEqual(model.metrics.map(x => x.label), ['Visitas', 'Borradores preparados', 'Clics para abrir', 'Errores de validación']);
  assert.deepEqual(model.metrics.map(x => x.value), [4, 1, 2, 3]);
  assert.equal(model.interests[0].label, 'engranes-rectos');
  assert.equal(model.channels[0].clicks, 2);
});
