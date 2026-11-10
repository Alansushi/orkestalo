import { makeWhatsAppUrl } from './contact.js';

const getLanguage = () => {
  if (location.pathname.startsWith('/buen-fin-2026')) return 'es';
  const query = new URLSearchParams(location.search).get('lang');
  if (query === 'en' || query === 'es') return query;
  try { return localStorage.getItem('orkesta-lang') === 'en' ? 'en' : 'es'; } catch { return 'es'; }
};

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-es][data-en]').forEach((node) => {
    node.textContent = node.dataset[lang];
  });
  document.querySelectorAll('[data-html-es][data-html-en]').forEach((node) => {
    node.innerHTML = node.dataset[`html${lang[0].toUpperCase()}${lang.slice(1)}`];
  });
  document.querySelectorAll('[data-placeholder-es][data-placeholder-en]').forEach((node) => {
    node.placeholder = node.dataset[`placeholder${lang[0].toUpperCase()}${lang.slice(1)}`];
  });
  document.querySelectorAll('[data-aria-es][data-aria-en]').forEach((node) => {
    node.setAttribute('aria-label', node.dataset[`aria${lang[0].toUpperCase()}${lang.slice(1)}`]);
  });
  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === lang;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function initLanguage() {
  setLanguage(getLanguage());
  document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {
    if (location.pathname.startsWith('/buen-fin-2026')) return;
    const url = new URL(location.href);
    if (button.dataset.lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
    try { localStorage.setItem('orkesta-lang', button.dataset.lang); } catch {}
    setLanguage(button.dataset.lang);
  }));
}

function initDirectLinks() {
  document.querySelectorAll('[data-wa-link]').forEach((link) => {
    link.href = makeWhatsAppUrl({
      source: link.dataset.source || location.pathname,
      situation: link.dataset.situation || 'Quiero revisar un proceso',
    });
  });
}

initLanguage();
initDirectLinks();

// Ciudad de México is UTC−6 at the end of this campaign.
const campaignClose = Date.parse('2026-11-18T06:00:00Z');
function syncCampaignLink() {
  const link = document.querySelector('[data-campaign-link]');
  if (link) link.hidden = Date.now() >= campaignClose;
  if (link && !link.hidden) setTimeout(syncCampaignLink, Math.min(campaignClose - Date.now(), 2147483647));
}
syncCampaignLink();

if (location.pathname === '/buen-fin-2026/' || location.pathname === '/buen-fin-2026') {
  function closeCampaignPage() {
    if (Date.now() >= campaignClose) location.replace('/');
    else setTimeout(closeCampaignPage, Math.min(campaignClose - Date.now(), 2147483647));
  }
  closeCampaignPage();
}
