export const WHATSAPP_NUMBER = '525549713262';

const clean = (value = '') => String(value).replace(/\s+/g, ' ').trim();

export function makeWhatsAppUrl({ source = '/', situation = '', name = '', process = '' } = {}) {
  const message = [
    `Página de origen: ${clean(source) || '/'}`,
    `Situación: ${clean(situation) || 'Por definir'}`,
    `Nombre: ${clean(name) || 'Por definir'}`,
    `Proceso: ${clean(process) || 'Por definir'}`,
  ].join('\n');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
