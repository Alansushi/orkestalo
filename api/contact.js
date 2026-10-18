const limits = { name: 120, email: 254, type: 80, description: 4000, budget: 100, date: 100, reference: 120 };
const types = new Set(['sitio-web', 'experiencia-digital', 'automatizacion-ia', 'otro']);
const text = (value) => typeof value === 'string' ? value.trim() : '';

export function validateContact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Solicitud inválida.' };
  if (text(input.website)) return { ok: false, spam: true };
  const data = Object.fromEntries(Object.keys(limits).map((key) => [key, text(input[key])]));
  if (Object.entries(limits).some(([key, max]) => data[key].length > max)) return { ok: false, error: 'Uno de los campos supera el límite permitido.' };
  if (data.name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !types.has(data.type) || data.description.length < 15) {
    return { ok: false, error: 'Revisa nombre, correo, tipo de proyecto y descripción.' };
  }
  return { ok: true, data };
}

export async function submitContact(input, { env = process.env, fetcher = fetch } = {}) {
  const validation = validateContact(input);
  if (validation.spam) return { status: 200, body: { ok: true } };
  if (!validation.ok) return { status: 400, body: { ok: false, message: validation.error } };
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return { status: 503, body: { ok: false, message: 'El formulario no está disponible. Escríbenos por WhatsApp.' } };
  }
  const { data } = validation;
  const emailText = [
    `Nombre: ${data.name}`, `Correo: ${data.email}`, `Tipo: ${data.type}`,
    `Referencia: ${data.reference || 'Sin referencia'}`,
    `Presupuesto: ${data.budget || 'No indicado'}`,
    `Fecha: ${data.date || 'No indicada'}`,
    '', 'Descripción:', data.description,
  ].join('\n');
  try {
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: ['info@orkestalo.com'],
        reply_to: data.email,
        subject: `Contacto Orkesta: ${data.type}`,
        text: emailText,
      }),
    });
    if (!response.ok) return { status: 502, body: { ok: false, message: 'No pudimos entregar tu mensaje. Escríbenos por WhatsApp.' } };
    return { status: 200, body: { ok: true, message: 'Mensaje enviado. Te responderemos por correo.' } };
  } catch {
    return { status: 502, body: { ok: false, message: 'No pudimos entregar tu mensaje. Escríbenos por WhatsApp.' } };
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ available: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  const size = Number(req.headers['content-length'] || 0);
  if (size > 8000) return res.status(413).json({ ok: false, message: 'Solicitud demasiado grande.' });
  if (JSON.stringify(req.body ?? '').length > 8000) return res.status(413).json({ ok: false, message: 'Solicitud demasiado grande.' });
  const result = await submitContact(req.body);
  return res.status(result.status).json(result.body);
}
