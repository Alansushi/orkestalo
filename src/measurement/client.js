// Embed with <script src="https://www.orkestalo.com/assets/measurement.js"
// data-site="registered-site-slug"></script>. Attribution is per tab and consented.
(() => {
  try {
    const script = document.currentScript;
    const site = script?.dataset.site;
    if (!site || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    const consentKey = script.dataset.consentKey;
    const key = `orkesta_measure_${site}`;
    const session = sessionStorage;
    const permitted = () => {
      try {
        const allowed = consentKey && localStorage.getItem(consentKey) === 'accepted';
        if (!allowed) for (const suffix of ['', ':ref', ':ctx']) session.removeItem(key + suffix);
        return allowed;
      }
      catch { return false; }
    };
    if (!permitted()) return;
    const endpoint = new URL('/api/measurement-track', script.src).href;
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
    try { context = JSON.parse(session.getItem(`${key}:ctx`) || '{}'); } catch { context = {}; }
    if (!Object.keys(context).length) {
      for (const name of ['utm_source', 'utm_medium', 'utm_campaign']) {
        const value = params.get(name);
        if (value && /^[\p{L}\p{N} _.-]{1,100}$/u.test(value)) context[name] = value;
      }
      if (document.referrer) {
        const host = new URL(document.referrer).hostname;
        if (/^[a-z0-9.-]{1,160}$/i.test(host)) context.referrer_host = host;
      }
      session.setItem(`${key}:ctx`, JSON.stringify(context));
    }
    const once = new Set();
    const routes = new Set(['/','/servicios','/preguntas-frecuentes','/buen-fin-mercado-pago','/aviso-de-privacidad','/politica-de-cookies','/politica-cancelacion','/terminos-de-uso','/gracias','/pago-pendiente','/error-pago']);
    function safePath(input) {
      const path = String(input || location.pathname).split(/[?#]/)[0].replace(/\/$/, '') || '/';
      return routes.has(path) ? path : null;
    }
    function track(name, options = {}) {
      try {
        if (!permitted()) return;
        if (!['page_view','section_view','contact_click','agenda_click','form_start','form_submit','site_error'].includes(name)) return;
        const path = safePath(options.path);
        if (!path) return;
        let eventId = crypto.randomUUID();
        if (name === 'contact_click' || name === 'form_submit') {
          const conversionKey = `${key}:${name}:${options.channel || ''}:${options.label || ''}`;
          eventId = session.getItem(conversionKey) || eventId;
          session.setItem(conversionKey, eventId);
        }
        let currentRef = session.getItem(`${key}:ref`);
        if (!currentRef) { currentRef = crypto.randomUUID(); session.setItem(`${key}:ref`, currentRef); }
        if (!session.getItem(key)) { sessionId = crypto.randomUUID(); session.setItem(key, sessionId); context = {}; }
        const event = { id: eventId, session: sessionId, attribution_ref: currentRef, name, path, ...context };
        if (['hero','nav','services','about','faq','booking','contact','footer','form','other'].includes(options.label)) event.label = options.label;
        if (['whatsapp','phone','email','form'].includes(options.channel)) event.channel = options.channel;
        const data = JSON.stringify({ site, events: [event] });
        if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([data], { type: 'text/plain' }));
        else fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: data, keepalive: true }).catch(() => {});
      } catch { /* measurement must never interrupt the site */ }
    }
    function trackOnce(key, name, options) {
      if (once.has(key)) return;
      once.add(key);
      track(name, options);
    }
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const channel = /^https:\/\/wa\.me\//i.test(href) ? 'whatsapp' : /^tel:/i.test(href) ? 'phone' : /^mailto:/i.test(href) ? 'email' : null;
      if (channel) track('contact_click', { channel, label: link.dataset.measureLabel });
      else if (href === '#agenda' || href.endsWith('/#agenda')) track('agenda_click', { label: 'booking' });
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
      const sections = { servicios: 'services', 'por-que': 'about', 'como-funciona': 'about', testimonios: 'about', agenda: 'booking', contacto: 'contact', credenciales: 'about' };
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
    if (safePath() ) trackOnce('page', 'page_view', { path: safePath() });
  } catch { /* measurement must never interrupt the site */ }
})();
