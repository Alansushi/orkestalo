import { ownerFromToken } from './measurement.js';

const COOKIE = 'orkesta_measurement_session';
const PENDING = 'orkesta_measurement_pending';
function cookie(req, name) {
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) || '';
  try { return decodeURIComponent(raw); } catch { return ''; }
}
export function readSession(req) {
  return cookie(req, COOKIE);
}
export function readPending(req) { return cookie(req, PENDING); }
export async function isOwner(req) {
  return ownerFromToken(readSession(req));
}
export function setSession(res, token, seconds) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-dashboard; Max-Age=${seconds}`);
}
export function setPending(res, token, seconds = 300) {
  res.setHeader('Set-Cookie', `${PENDING}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-session; Max-Age=${seconds}`);
}
