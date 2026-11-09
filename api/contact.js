import { db, folio, json, normalizeContact, readBody, sendInquiryNotice } from '../src/server/commerce.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  const input = normalizeContact(readBody(req));
  if (!input) return json(res, 400, { error: 'Revisa los datos del formulario.' });
  const reference = folio();
  try {
    const saved = await db('inquiries', { method: 'POST', body: { folio: reference, ...input } });
    if (saved.length !== 1) throw new Error('La consulta no se confirmó');
  } catch (error) {
    console.error('No se pudo guardar la consulta', error);
    return json(res, 503, { error: 'No pudimos guardar tu consulta. Intenta de nuevo.' });
  }
  let emailSent = false;
  try {
    emailSent = await sendInquiryNotice({ folio: reference, ...input });
  } catch (error) {
    console.error('Consulta guardada; falló el aviso por correo', error);
  }
  return json(res, 201, { folio: reference, emailSent });
}
