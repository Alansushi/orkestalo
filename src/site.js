import { makeWhatsAppUrl } from './contact.js';

const getLanguage = () => {
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
    const url = new URL(location.href);
    if (button.dataset.lang === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    history.replaceState(null, '', url);
    try { localStorage.setItem('orkesta-lang', button.dataset.lang); } catch {}
    setLanguage(button.dataset.lang);
  }));
}

function initMenu() {
  const button = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-menu]');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  });
}

function initContact() {
  const form = document.querySelector('[data-wa-form]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const source = form.dataset.source || location.pathname;
    const lang = document.documentElement.lang;
    const situation = data.get('situation');
    const name = data.get('name');
    const process = data.get('process');
    const url = makeWhatsAppUrl({
      source,
      situation: lang === 'en' ? `English: ${situation}` : situation,
      name,
      process,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

function initDirectLinks() {
  document.querySelectorAll('[data-wa-link]').forEach((link) => {
    link.href = makeWhatsAppUrl({
      source: link.dataset.source || location.pathname,
      situation: link.dataset.situation || 'Quiero revisar un proceso',
    });
  });
}

function initFlowboard() {
  const board = document.querySelector('[data-flowboard]');
  if (!board || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nodes = [...board.querySelectorAll('[data-flow-node]')];
  let active = 0;
  window.setInterval(() => {
    nodes.forEach((node, index) => node.classList.toggle('is-active', index === active));
    active = (active + 1) % nodes.length;
  }, 1800);
}

initLanguage();
initMenu();
initContact();
initDirectLinks();
initFlowboard();
