import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ids = ['identity','calendar','content','welcome','followup','invite','survey','privacy','activate'];
const clinic = id => ({ id, name:`Consultorio ${id}`, doctor_name:'Dra. López', sender_name:'Dra. López', reply_to:'doctora@example.com', identity_confirmed_at:'2026-11-24T00:00:00Z' });

test('tabs open the first pending step, link to its control, and reset on clinic change', { skip: process.platform !== 'darwin' }, async () => {
  const browser = await chromium.launch({ executablePath:chrome, headless:true, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport:{ width:375, height:812 } });
    const html = await readFile(new URL('../public/consultorio/index.html', import.meta.url), 'utf8');
    const js = await readFile(new URL('../public/assets/consultorio.js', import.meta.url), 'utf8');
    const css = await readFile(new URL('../public/assets/consultorio.css', import.meta.url), 'utf8');
    const errors = [];
    let settingsUpdate, requestUpdate, adminMode = false, clinicAdminMode = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem('consultorio_session', JSON.stringify({ access_token:'valid' })));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/consultorio/') return route.fulfill({ contentType:'text/html', body:html });
      if (url.pathname === '/assets/consultorio.js') return route.fulfill({ contentType:'application/javascript', body:js });
      if (url.pathname === '/assets/consultorio.css') return route.fulfill({ contentType:'text/css', body:css });
      if (url.pathname === '/api/consultorio-misc') return route.fulfill({ json:{ url:'https://auth.test', key:'public' } });
      if (url.host === 'auth.test') return route.fulfill({ json:{ access_token:'valid' } });
      if (url.pathname === '/api/consultorio' && url.searchParams.get('action') === 'clinics') return route.fulfill({ json:{ clinics:adminMode?[]:[clinic('a'),clinic('b')] } });
      if (url.pathname === '/api/consultorio' && url.searchParams.get('action') === 'admin-list') return adminMode || clinicAdminMode ? route.fulfill({ json:{ invitations:[] } }) : route.fulfill({ status:403, json:{ error:'No autorizado' } });
      if (url.pathname === '/api/consultorio' && url.searchParams.get('action') === 'email-settings') {
        settingsUpdate = JSON.parse(route.request().postData());
        return route.fulfill({ json:{ ok:true } });
      }
      if (url.pathname === '/api/consultorio' && url.searchParams.get('route') === 'presence') {
        if (url.searchParams.get('action') === 'measurement') return route.fulfill({ json:{ status:'verificado', dataset:{
          sites:[{ id:'site-b', name:'Sitio B', active:true }], daily:[{ site_id:'site-b', visits:8, contact_clicks:2, form_submits:1 }],
          funnel:[{ site_id:'site-b', visits:8, bookings:1, approved_payments:0, confirmed_appointments:1 }],
          actions:[], sources:[], external:[], connections:[], updatedAt:'2026-11-24T00:00:00Z',
        } } });
        if (route.request().method() === 'POST') { requestUpdate = JSON.parse(route.request().postData()); return route.fulfill({ json:{ ok:true } }); }
        return route.fulfill({ json:{ role:clinicAdminMode?'admin':'doctor', resources:[{ id:'logo', name:'Logo', category:'logo' }], versions:[],
          presence:{ reviewed_at:'2026-11-24T00:00:00Z', links:[], checklist:[] },
          requests:[], history:[], events:[] } });
      }
      if (url.pathname === '/api/consultorio' && url.searchParams.get('action') === 'email') {
        const complete = url.searchParams.get('clinic') === 'b';
        return route.fulfill({ json:{ clinic:clinic(url.searchParams.get('clinic')), templates:[], proposal:null,
          steps:ids.map(id => ({ id, done:complete || id !== 'calendar' })) } });
      }
      if (url.pathname === '/api/consultorio' && url.searchParams.get('action') === 'event-types') return route.fulfill({ json:{ events:[] } });
      if (url.pathname === '/api/consultorio') return route.fulfill({ json:{ clinic:clinic(url.searchParams.get('clinic')), appointments:[], tasks:[], messages:[], connected:url.searchParams.get('clinic') === 'b' } });
      return route.fulfill({ status:404, body:'' });
    });
    await page.goto('https://clinic.test/consultorio/');
    await page.locator('#tab-button-agenda[aria-selected="true"]').waitFor();
    assert.equal(await page.locator('#tab-agenda').isVisible(),true);
    assert.equal(await page.locator('#tab-inicio').isVisible(),false);
    assert.equal(await page.locator('#admin-panel').isVisible(),false);
    assert.equal(await page.locator('#tab-button-datos .tab-state').getAttribute('aria-hidden'),null);
    await page.locator('#tab-button-inicio').click();
    const historyLength = await page.evaluate(() => history.length);
    await page.locator('#onboarding-steps li').first().locator('a').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id),'identity-settings');
    assert.equal(await page.evaluate(() => history.length),historyLength);
    await page.locator('#tab-button-inicio').click();
    await page.locator('#onboarding-steps li').nth(1).locator('a').click();
    assert.equal(await page.locator('#tab-button-agenda').getAttribute('aria-selected'),'true');
    assert.equal(await page.evaluate(() => document.activeElement?.id),'cal-reconnect');
    await page.locator('#tab-button-agenda').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-button-mensajes').getAttribute('aria-selected'),'true');
    await page.locator('#tab-button-datos').click();
    await page.locator('#email-settings-form [name="sender_name"]').fill('Dra. Ana López');
    await page.locator('#email-settings-form button').click();
    await page.locator('#notice:has-text("Identidad guardada.")').waitFor();
    assert.equal(settingsUpdate.sender_name,'Dra. Ana López');
    await page.locator('#clinic-select').selectOption('b');
    await page.locator('#tab-button-inicio[aria-selected="true"]').waitFor();
    assert.equal(await page.locator('#home-summary').isVisible(),true);
    assert.equal(await page.locator('#onboarding').isVisible(),false);
    assert.equal(await page.locator('.panel-tabs').evaluate(node => node.scrollWidth > node.clientWidth),true);
    assert.match(await page.locator('#measurement-summary-text').textContent(),/Visitas: 8/);
    assert.equal(await page.locator('#results-section').getAttribute('open'),null);
    await page.locator('#measurement-summary a').click();
    assert.equal(await page.locator('#results-section').getAttribute('open'),'');
    assert.equal(await page.locator('#results-section .mv-grid').isVisible(),true);
    await page.locator('#tab-button-datos').click();
    assert.equal(await page.locator('#brand-section').isVisible(),true);
    assert.equal(await page.locator('#presence-section').isVisible(),true);
    assert.equal(await page.locator('#requests-section').isVisible(),false);
    await page.locator('#tab-button-operacion').click();
    assert.equal(await page.locator('#requests-section').isVisible(),true);
    await page.locator('#service-request-form [name="title"]').fill('Actualizar horarios');
    await page.locator('#service-request-form [name="description"]').fill('Cambiar la página de horarios');
    assert.equal(await page.locator('#service-request-form').evaluate(node=>node.checkValidity()),true);
    await page.locator('#service-request-form button').click();
    await page.locator('#notice:has-text("Solicitud enviada.")').waitFor();
    assert.equal(requestUpdate.title,'Actualizar horarios');
    clinicAdminMode = true;
    await page.reload();
    await page.locator('#tab-button-operacion').click();
    await page.locator('#pilot-section').waitFor({ state:'visible' });
    adminMode = true;
    await page.locator('#logout').click();
    await page.locator('#login-form [name="email"]').fill('admin@example.com');
    await page.locator('#login-form [name="password"]').fill('secret');
    await page.locator('#login-form button').first().click();
    await page.locator('#admin-panel').waitFor({ state:'visible' });
    assert.equal(await page.locator('#task-section').isVisible(),false);
    assert.equal(await page.locator('#requests-section').isVisible(),false);
    assert.equal(await page.locator('#activity-section').isVisible(),false);
    assert.equal(await page.locator('#pilot-section').isVisible(),false);
    assert.equal(await page.locator('#tab-button-operacion').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('#tab-button-inicio').isVisible(),false);
    await page.locator('#tab-button-operacion').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-button-operacion').getAttribute('aria-selected'),'true');
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
});
