import { json } from '../src/server/commerce.js';

// Kept as an explicit 410 while older clients may still call this URL.
// Patient names, email addresses and phone numbers must not enter measurement.
export default function handler(_req, res) {
  return json(res, 410, { error: 'Registro de pacientes desactivado' });
}
