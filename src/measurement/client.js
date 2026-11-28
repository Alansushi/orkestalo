// Embed with <script src="https://www.orkestalo.com/assets/measurement.js"
// data-site="registered-site-slug"></script>. Attribution is per tab and consented.
(async () => {
  try {
    const script = document.currentScript;
    const site = script?.dataset.site;
    const cami = site === 'engranes-cami';
    if (!site || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    const consentKey = script.dataset.consentKey;
    const key = `orkesta_measure_${site}`;
    const session = sessionStorage;
    const once = new Set();
    const endpoint = new URL('/api/measurement-track', script.src).href;
    const revocationEndpoint = new URL('/api/measurement-track?action=revoke', script.src).href;
    const permitted = () => {
      try {
        const allowed = consentKey && localStorage.getItem(consentKey) === 'accepted';
        if (!allowed) {
          once.clear();
          const oldRef = session.getItem(`${key}:ref`);
          if (oldRef && site !== 'orkesta') try {
            const body = JSON.stringify({ site, reference: oldRef });
            navigator.sendBeacon(revocationEndpoint, new Blob([body], { type: 'text/plain' }));
          } catch { /* keep consent withdrawal immediate */ }
          try { for (const entry of JSON.parse(session.getItem(`${key}:dedupe`) || '[]')) session.removeItem(entry); } catch { /* ignore corrupt local state */ }
          for (const suffix of ['', ':ref', ':ctx', ':seq', ':dedupe']) session.removeItem(key + suffix);
        }
        return allowed;
      }
      catch { return false; }
    };
    if (!permitted()) return;
    let sessionId = session.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      session.setItem(key, sessionId);
    }
    let reference = session.getItem(`${key}:ref`);
    if (!reference) {
      reference = crypto.randomUUID();
      session.setItem(`${key}:ref`, reference);
    }
    const params = new URLSearchParams(location.search);
    let context = {};
    try {
      const stored = JSON.parse(session.getItem(`${key}:ctx`) || '{}');
      if (['google','bing','facebook','instagram','meta','tiktok','doctoralia','whatsapp','email','direct','other'].includes(stored.utm_source)) context.utm_source = stored.utm_source;
      if (['cpc','paid','organic','social','email','referral','none','other'].includes(stored.utm_medium)) context.utm_medium = stored.utm_medium;
      if (/^cmp_[a-f0-9]{16}$/.test(stored.utm_campaign || '')) context.utm_campaign = stored.utm_campaign;
      if (['google','bing','facebook','instagram','doctoralia','other'].includes(stored.referrer_host)) context.referrer_host = stored.referrer_host;
    } catch { context = {}; }
    if (!Object.keys(context).length) {
      const source = params.get('utm_source')?.toLowerCase();
      const medium = params.get('utm_medium')?.toLowerCase();
      if (['google','bing','facebook','instagram','meta','tiktok','doctoralia','whatsapp','email','direct','other'].includes(source)) context.utm_source = source;
      if (['cpc','paid','organic','social','email','referral','none','other'].includes(medium)) context.utm_medium = medium;
      const campaign = params.get('utm_campaign');
      if (campaign && /^[a-z0-9][a-z0-9_-]{2,63}$/.test(campaign) && crypto.subtle) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(campaign));
        context.utm_campaign = 'cmp_' + Array.from(new Uint8Array(digest)).slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join('');
      }
      if (document.referrer) {
        const host = new URL(document.referrer).hostname;
        context.referrer_host = /(^|\.)google\./.test(host) ? 'google' : /(^|\.)bing\./.test(host) ? 'bing' : /(^|\.)facebook\./.test(host) ? 'facebook' : /(^|\.)instagram\./.test(host) ? 'instagram' : /(^|\.)doctoralia\./.test(host) ? 'doctoralia' : 'other';
      }
      session.setItem(`${key}:ctx`, JSON.stringify(context));
    }
    const routes = cami ? new Set(['/', '/nosotros', '/trabajos', '/cotizar', '/aviso-de-privacidad']) : site === 'orkesta'
      ? new Set(['/', '/proyectos/', '/contacto/', '/aviso-de-privacidad/',
        '/proyectos/grafik/', '/proyectos/dra-ana-mora/', '/proyectos/diego-y-giselle/',
        '/proyectos/dra-fernanda-suaste/', '/proyectos/expression-grafica/', '/proyectos/aranza-y-mateo/', '/proyectos/engranes-cami/',
        '/servicios/diseno-desarrollo-web/', '/servicios/experiencias-digitales/', '/servicios/automatizacion-ia/'])
      : new Set(['/','/servicios','/preguntas-frecuentes','/buen-fin-mercado-pago','/aviso-de-privacidad','/politica-de-cookies','/politica-cancelacion','/terminos-de-uso','/gracias','/pago-pendiente','/error-pago']);
    function safePath(input) {
      const raw = String(input || location.pathname).split(/[?#]/)[0];
      const path = site === 'orkesta' ? (raw === '/' ? '/' : `${raw.replace(/\/$/, '')}/`) : (raw.replace(/\/$/, '') || '/');
      return routes.has(path) ? path : null;
    }
    const interests = new Set(['engranes-rectos','engranes-helicoidales','engranes-conicos','coronas-y-sinfines','flechas-y-ejes','maquinados-industriales','reparacion-de-reductores','fabricacion-sobre-plano-o-muestra']);
    const fields = new Set(['name','email','phone','city','type','description','quantity','material','neededBy','files']);
    const labels = new Set(['hero','nav','services','about','faq','booking','contact','footer','form','other',...interests,...fields,...Array.from({length:8},(_,i)=>`faq-${i+1}`)]);
    function track(name, options = {}) {
      try {
        if (!permitted()) return;
        if (!(cami ? ['page_view','section_view','contact_click','form_start','form_error','quote_draft','product_interest','faq_open'] : ['page_view','section_view','contact_click','agenda_click','form_start','form_submit','site_error']).includes(name)) return;
        const path = safePath(options.path);
        if (!path) return;
        if (options.label != null && !(cami ? labels : new Set(['hero','nav','services','about','faq','booking','contact','footer','form','other'])).has(options.label)) return;
        if (cami && (name === 'product_interest' && !interests.has(options.label) || name === 'faq_open' && !/^faq-[1-8]$/.test(options.label || '') || name === 'form_error' && (!fields.has(options.label) || path !== '/cotizar') || name === 'quote_draft' && (path !== '/cotizar' || options.label !== 'form'))) return;
        let eventId = crypto.randomUUID();
        if (name === 'contact_click' || name === 'form_submit' || name === 'quote_draft') {
          const conversionKey = `${key}:${name}:${options.channel || ''}:${options.label || ''}`;
          const now = Date.now();
          let previous;
          try { previous = JSON.parse(session.getItem(conversionKey) || 'null'); } catch { /* old or corrupt entry */ }
          if (previous && typeof previous.id === 'string' && Number.isFinite(previous.at) && now - previous.at >= 0 && now - previous.at < 2000) eventId = previous.id;
          session.setItem(conversionKey, JSON.stringify({ id: eventId, at: now }));
          const dedupe = JSON.parse(session.getItem(`${key}:dedupe`) || '[]');
          if (!dedupe.includes(conversionKey)) session.setItem(`${key}:dedupe`, JSON.stringify([...dedupe, conversionKey]));
        }
        let currentRef = session.getItem(`${key}:ref`);
        if (!currentRef) { currentRef = crypto.randomUUID(); session.setItem(`${key}:ref`, currentRef); }
        if (!session.getItem(key)) { sessionId = crypto.randomUUID(); session.setItem(key, sessionId); context = {}; }
        const event = { id: eventId, session: sessionId, attribution_ref: currentRef, name, path, ...context };
        if (name === 'page_view' && (site === 'orkesta' || cami)) {
          const next = (Number(session.getItem(`${key}:seq`)) || 0) + 1;
          if (next > 1000000) return;
          session.setItem(`${key}:seq`, String(next));
          event.page_order = next;
        }
        if (labels.has(options.label) && (cami || ['hero','nav','services','about','faq','booking','contact','footer','form','other'].includes(options.label))) event.label = options.label;
        if (['whatsapp','phone','email','form'].includes(options.channel) || (cami && options.channel === 'map')) event.channel = options.channel;
        const data = JSON.stringify({ site, events: [event] });
        if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([data], { type: 'text/plain' }));
        else fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: data, keepalive: true }).catch(() => {});
      } catch { /* measurement must never interrupt the site */ }
    }
    function trackOnce(key, name, options) {
      if (!permitted()) return;
      if (once.has(key)) return;
      once.add(key);
      track(name, options);
    }
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const channel = cami && link.dataset.measureChannel === 'map' ? 'map' : /^https:\/\/wa\.me\//i.test(href) ? 'whatsapp' : /^tel:/i.test(href) ? 'phone' : /^mailto:/i.test(href) ? 'email' : null;
      if (channel) track('contact_click', { channel, label: link.dataset.measureLabel });
      else if (href === '#agenda' || href.endsWith('/#agenda')) track('agenda_click', { label: 'booking' });
      if (cami && link.dataset.measureInterest) track('product_interest', { label: link.dataset.measureInterest });
    }, { capture: true });
    if (cami) document.addEventListener('toggle', event => {
      const label = event.target?.dataset?.measureFaq;
      if (event.target?.open && label) track('faq_open', { label });
    }, { capture: true });
    document.addEventListener('input', event => {
      const form = event.target.closest?.('form[data-measure-form]');
      if (form) trackOnce(`form:${form.dataset.measureForm || location.pathname}`, 'form_start', { label: form.dataset.measureForm });
    }, { capture: true });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          const label = entry.target.dataset.measureSection;
          if (label) trackOnce(`section:${label}`, 'section_view', { label });
          observer.unobserve(entry.target);
        }
      }, { threshold: 0.5 });
      const sections = { servicios: 'services', 'por-que': 'about', 'como-funciona': 'about', testimonios: 'about', agenda: 'booking', contacto: 'contact', credenciales: 'about', productos: 'services', 'preguntas-frecuentes': 'faq' };
      function observeSections() {
        for (const [id, label] of Object.entries(sections)) {
          const el = document.getElementById?.(id);
          if (el) { el.dataset.measureSection = label; observer.observe(el); }
        }
        document.querySelectorAll('[data-measure-section]').forEach(el => observer.observe(el));
      }
      observeSections();
      window.orkestaObserveSections = observeSections;
    }
    window.orkestaMeasurement = {
      track,
      page(path) { track('page_view', { path }); window.orkestaObserveSections?.(); },
      reference() { return permitted() ? session.getItem(`${key}:ref`) : null; },
    };
    window.addEventListener?.('site-consent-changed', permitted);
    window.addEventListener?.('storage', permitted);
    window.addEventListener?.('pageshow', event => { if (event.persisted) window.orkestaMeasurement.page(); });
    if (safePath() ) trackOnce('page', 'page_view', { path: safePath() });
  } catch { /* measurement must never interrupt the site */ }
})();
