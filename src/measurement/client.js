// Embed with <script src="https://www.orkestalo.com/assets/measurement.js"
// data-site="registered-site-slug"></script>. No cookie or cross-site visitor ID.
(() => {
  try {
    const script = document.currentScript;
    const site = script?.dataset.site;
    if (!site || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    const consentKey = script.dataset.consentKey;
    const permitted = () => {
      try { return consentKey && localStorage.getItem(consentKey) === 'accepted'; }
      catch { return false; }
    };
    if (!permitted()) return;
    const endpoint = new URL('/api/measurement-track', script.src).href;
    const key = `orkesta_measure_${site}`;
    const session = sessionStorage;
    let sessionId = session.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      session.setItem(key, sessionId);
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
    function track(name, options = {}) {
      try {
        if (!permitted()) return;
        if (!['page_view','section_view','contact_click','form_start','form_submit','site_error'].includes(name)) return;
        // Paths may contain patient-supplied text; keep only the site-level route.
        const path = '/';
        let eventId = crypto.randomUUID();
        if (name === 'contact_click' || name === 'form_submit') {
          const conversionKey = `${key}:${name}:${options.channel || ''}:${options.label || ''}`;
          eventId = session.getItem(conversionKey) || eventId;
          session.setItem(conversionKey, eventId);
        }
        const event = { id: eventId, session: sessionId, name, path, ...context };
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
      document.querySelectorAll('[data-measure-section]').forEach(el => observer.observe(el));
    }
    window.orkestaMeasurement = { track };
    trackOnce('page', 'page_view');
  } catch { /* measurement must never interrupt the site */ }
})();
