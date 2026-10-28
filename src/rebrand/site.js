import { projects, services } from './data.mjs';
import { makeProjectWhatsAppUrl } from '../contact.js';
import { inject } from '@vercel/analytics';

inject();

const demoSequences = {
  web: {
    es: ['Claro: tu propuesta en una frase.', 'Visual: una idea que se recuerda.', 'Directo: una acción fácil de tomar.'],
    en: ['Clear: your offer in one sentence.', 'Visual: an idea worth remembering.', 'Direct: an easy next action.'],
  },
  evento: {
    es: ['01 / La historia', '02 / El gran día', '03 / La información útil'],
    en: ['01 / The story', '02 / The day', '03 / Useful details'],
  },
  flujo: {
    es: ['01 / Solicitud recibida', '02 / Datos revisados', '03 / Equipo informado'],
    en: ['01 / Request received', '02 / Details checked', '03 / Team informed'],
  },
};

document.querySelector('[data-studio-menu-button]')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  document.querySelector('[data-studio-menu]')?.classList.toggle('is-open', open);
});

document.querySelectorAll('[data-studio-menu] a').forEach((link) => link.addEventListener('click', () => {
  document.querySelector('[data-studio-menu]')?.classList.remove('is-open');
  document.querySelector('[data-studio-menu-button]')?.setAttribute('aria-expanded', 'false');
}));

document.querySelectorAll('[data-portfolio-filter]').forEach((button) => button.addEventListener('click', () => {
  const category = button.dataset.portfolioFilter;
  document.querySelectorAll('[data-portfolio-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  let visible = 0;
  document.querySelectorAll('[data-project-category]').forEach((card) => {
    card.hidden = category !== 'todos' && card.dataset.projectCategory !== category;
    if (!card.hidden) visible++;
  });
  document.querySelectorAll('[data-portfolio-empty]').forEach((note) => { note.hidden = visible > 0; });
  window.orkestaTrack?.('portfolio_filter', { category });
}));

document.querySelectorAll('[data-demo]').forEach((demo) => {
  let index = -1;
  demo.querySelector('[data-demo-next]')?.addEventListener('click', () => {
    const language = document.documentElement.lang === 'en' ? 'en' : 'es';
    const sequence = demoSequences[demo.dataset.demo][language];
    index = (index + 1) % sequence.length;
    demo.querySelector('[data-demo-output]').textContent = sequence[index];
    window.orkestaTrack?.('demo_interaction', { demo: demo.dataset.demo, step: index + 1 });
  });
});

const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const params = new URLSearchParams(location.search);
  const reference = params.get('referencia') || '';
  const validReferences = new Set([...services.map(({ slug }) => slug), ...projects.map(({ slug }) => slug)]);
  if (validReferences.has(reference)) {
    contactForm.elements.reference.value = reference;
    const matchedService = services.find(({ slug }) => slug === reference);
    const matchedProject = projects.find(({ slug }) => slug === reference);
    if (!contactForm.elements.type.value) {
      if (matchedService) contactForm.elements.type.value = matchedService.type;
      else if (matchedProject) contactForm.elements.type.value = matchedProject.category === 'experiencias' ? 'experiencia-digital' : matchedProject.category === 'automatizacion' ? 'automatizacion-ia' : 'sitio-web';
    }
  }
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(contactForm));
    const url = makeProjectWhatsAppUrl(data, document.documentElement.lang);
    window.orkestaTrack?.('contact_submit', { type: contactForm.elements.type.value, reference: contactForm.elements.reference.value });
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

window.orkestaTrack = (name, detail = {}) => {
  const safe = Object.fromEntries(Object.entries(detail).filter(([key]) => ['category', 'demo', 'step', 'type', 'reference'].includes(key)));
  window.dispatchEvent(new CustomEvent('orkesta:conversion', { detail: { name, ...safe } }));
};

document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => link.addEventListener('click', () => window.orkestaTrack('whatsapp_click', { type: location.pathname })));
