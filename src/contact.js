export const WHATSAPP_NUMBER = '525549713262';

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();
const line = (label, value) => clean(value) ? `${label}: ${clean(value)}` : '';

export function makeWhatsAppUrl({ source = '/', situation = '', name = '', process = '' } = {}) {
  const message = [
    `Página de origen: ${clean(source) || '/'}`,
    line('Situación', situation),
    line('Nombre', name),
    line('Proceso', process),
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const projectTypes = {
  'sitio-web': { es: 'un sitio web', en: 'a website' },
  'experiencia-digital': { es: 'una experiencia digital', en: 'a digital experience' },
  'automatizacion-ia': { es: 'una automatización con IA', en: 'an AI automation project' },
  otro: { es: 'un proyecto', en: 'a project' },
};

export function makeProjectWhatsAppUrl(input = {}, language = 'es') {
  const lang = language === 'en' ? 'en' : 'es';
  const name = clean(input.name);
  const type = projectTypes[input.type]?.[lang] || projectTypes.otro[lang];
  const description = clean(input.description);
  const details = lang === 'en' ? [
    `Hi, I'm ${name}. I'd like to talk about ${type}.`,
    `My idea: ${description}`,
    line('Reference', input.reference),
    line('Email', input.email),
    line('Phone', input.phone),
    line('Approximate budget', input.budget),
    line('Preferred date', input.date),
  ] : [
    `Hola, soy ${name}. Me gustaría conversar sobre ${type}.`,
    `Mi idea: ${description}`,
    line('Referencia', input.reference),
    line('Correo', input.email),
    line('Teléfono', input.phone),
    line('Presupuesto', input.budget),
    line('Fecha ideal', input.date),
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(details.filter(Boolean).join('\n'))}`;
}
