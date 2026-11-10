import { projects, services } from './data.mjs';
import { makeProjectWhatsAppUrl } from '../contact.js';
import { inject } from '@vercel/analytics';
import { redactAnalyticsEvent } from './analytics.mjs';

inject({ beforeSend: redactAnalyticsEvent });

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
  const validReferences = new Set([...services.map(({ slug }) => slug), ...projects.map(({ slug }) => slug), 'buen-fin-2026']);
  if (validReferences.has(reference)) {
    contactForm.elements.reference.value = reference;
    const matchedService = services.find(({ slug }) => slug === reference);
    const matchedProject = projects.find(({ slug }) => slug === reference);
    if (!contactForm.elements.type.value) {
      if (matchedService) contactForm.elements.type.value = matchedService.type;
      else if (matchedProject) contactForm.elements.type.value = matchedProject.category === 'experiencias' ? 'experiencia-digital' : matchedProject.category === 'automatizacion' ? 'automatizacion-ia' : 'sitio-web';
      else if (reference === 'buen-fin-2026') contactForm.elements.type.value = 'sitio-web';
    }
  }
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(contactForm));
    data.marketingConsent = contactForm.elements.marketingConsent.checked;
    if (data.marketingConsent && !data.email?.trim() && !data.phone?.trim()) {
      const channel = contactForm.elements.email;
      channel.setCustomValidity('Indica un correo o WhatsApp para recibir propuestas.');
      channel.reportValidity();
      channel.setCustomValidity('');
      return;
    }
    const button = contactForm.querySelector('[type="submit"]');
    const feedback = document.querySelector('[data-contact-feedback]');
    button.disabled = true;
    feedback.textContent = 'Guardando consulta…';
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No pudimos guardar tu consulta.');
      document.querySelector('[data-contact-folio]').textContent = result.folio;
      document.querySelector('[data-contact-whatsapp]').href = makeProjectWhatsAppUrl({ ...data, description: `Folio: ${result.folio}\n${data.description}` }, document.documentElement.lang);
      contactForm.hidden = true;
      document.querySelector('[data-contact-success]').hidden = false;
      window.orkestaTrack?.('contact_submit', { type: data.type, reference: data.reference });
    } catch (error) {
      feedback.textContent = error.message || 'No pudimos guardar tu consulta. Intenta de nuevo.';
      button.disabled = false;
    }
  });
}

const checkoutForm = document.querySelector('[data-checkout-form]');
checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!checkoutForm.reportValidity()) return;
  const button = checkoutForm.querySelector('[type="submit"]');
  const feedback = document.querySelector('[data-checkout-feedback]');
  const folioNote = document.querySelector('[data-checkout-folio]');
  button.disabled = true;
  feedback.textContent = 'Registrando pedido…';
  try {
    const data = Object.fromEntries(new FormData(checkoutForm));
    data.accepted = checkoutForm.elements.accepted.checked;
    data.marketingConsent = checkoutForm.elements.marketingConsent.checked;
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (result.folio) {
      folioNote.querySelector('strong').textContent = result.folio;
      folioNote.hidden = false;
    }
    if (!response.ok) throw new Error(result.error || 'No pudimos iniciar el pago.');
    feedback.textContent = 'Abriendo Checkout Pro…';
    location.assign(result.checkoutUrl);
  } catch (error) {
    feedback.textContent = error.message || 'No pudimos iniciar el pago.';
    button.disabled = false;
  }
});

const orderStatus = document.querySelector('[data-order-status]');
if (orderStatus) {
  const reference = new URLSearchParams(location.search).get('folio') || '';
  document.querySelector('[data-order-folio]').textContent = reference;
  if (!/^ORK26-[A-F0-9]{18}$/.test(reference)) orderStatus.textContent = 'Folio inválido. Escríbenos para revisar tu pedido.';
  else fetch(`/api/order-status?folio=${encodeURIComponent(reference)}`)
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      orderStatus.textContent = ({ approved: 'Pago aprobado. Te contactaremos para solicitar el brief.', pending: 'Pago pendiente. Conserva tu folio y vuelve a consultar.', rejected: 'Pago rechazado o cancelado. Escríbenos con tu folio.', checkout_error: 'El pago no se inició. Escríbenos con tu folio.' })[result.status] || 'Aún no hay confirmación de pago.';
    })
    .catch(() => { orderStatus.textContent = 'No pudimos verificar el pago todavía. Intenta más tarde o escríbenos con tu folio.'; });
}

window.orkestaTrack = (name, detail = {}) => {
  const safe = Object.fromEntries(Object.entries(detail).filter(([key]) => ['category', 'demo', 'step', 'type', 'reference'].includes(key)));
  window.dispatchEvent(new CustomEvent('orkesta:conversion', { detail: { name, ...safe } }));
};

document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => link.addEventListener('click', () => window.orkestaTrack('whatsapp_click', { type: location.pathname })));
