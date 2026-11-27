(() => {
  const key = 'orkesta-measurement-consent-v1';
  const pendingKey = 'orkesta-measurement-revocations-v1';
  const sessionKey = 'orkesta_measure_orkesta';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const panel = document.querySelector('[data-measure-consent]');
  const settings = document.querySelector('[data-measure-settings]');
  const accept = document.querySelector('[data-measure-accept]');
  const reject = document.querySelector('[data-measure-reject]');
  if (!panel || !settings || !accept || !reject) return;

  const choice = () => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const privateBrowser = () => navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const volatilePending = new Set();
  const pending = () => {
    try {
      const refs = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      return [...new Set([...(Array.isArray(refs) ? refs : []), ...volatilePending])]
        .filter(ref => typeof ref === 'string' && uuid.test(ref)).slice(-20);
    } catch { return [...volatilePending]; }
  };
  let flushing = false;
  async function flushRevocations() {
    if (flushing) return;
    flushing = true;
    try {
      for (const reference of pending()) {
        try {
          const response = await fetch('/api/measurement-track?action=revoke', {
            method: 'POST', headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ site: 'orkesta', reference }), keepalive: true,
            credentials: 'omit', referrerPolicy: 'origin',
          });
          if (response.ok) {
            volatilePending.delete(reference);
            try { localStorage.setItem(pendingKey, JSON.stringify(pending().filter(ref => ref !== reference))); } catch {}
          }
        } catch { /* retry on the next page load or online event */ }
      }
    } finally { flushing = false; }
  }
  function revokeCurrent() {
    let reference;
    try { reference = sessionStorage.getItem(`${sessionKey}:ref`); } catch {}
    if (reference && uuid.test(reference)) {
      volatilePending.add(reference);
      try { localStorage.setItem(pendingKey, JSON.stringify(pending())); } catch {}
    }
    try {
      for (let i = (sessionStorage.length || 0) - 1; i >= 0; i--) {
        const name = sessionStorage.key(i);
        if (name?.startsWith(sessionKey)) sessionStorage.removeItem(name);
      }
    } catch {}
    try {
      for (const suffix of ['', ':ref', ':ctx', ':seq']) sessionStorage.removeItem(sessionKey + suffix);
    } catch {}
    void flushRevocations();
  }
  let loaded = false;
  function load() {
    if (loaded || choice() !== 'accepted' || privateBrowser()) return;
    loaded = true;
    const script = document.createElement('script');
    script.src = '/assets/measurement.js';
    script.async = true;
    script.dataset.site = 'orkesta';
    script.dataset.consentKey = key;
    document.head.append(script);
  }
  function setChoice(value) {
    if (value === 'rejected') revokeCurrent();
    try { localStorage.setItem(key, value); } catch { return; }
    panel.hidden = true;
    window.dispatchEvent(new Event('site-consent-changed'));
    if (value === 'accepted') load();
  }
  settings.addEventListener('click', () => { panel.hidden = false; accept.focus?.(); });
  accept.addEventListener('click', () => setChoice('accepted'));
  reject.addEventListener('click', () => setChoice('rejected'));
  window.addEventListener('storage', event => {
    if (event.key === key) {
      if (choice() === 'accepted') load();
      else revokeCurrent();
    }
    if (event.key === pendingKey) void flushRevocations();
  });
  window.addEventListener('online', () => { void flushRevocations(); });
  if (choice() === 'accepted') load();
  else if (choice() !== 'rejected') panel.hidden = false;
  else revokeCurrent();
  void flushRevocations();
})();
