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
