import { ownerFromToken } from './measurement.js';

const COOKIE = 'orkesta_measurement_session';
export function readSession(req) {
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
}
export async function isOwner(req) {
  return ownerFromToken(readSession(req));
}
export function setSession(res, token, seconds) {
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/api/measurement-; Max-Age=${seconds}`);
}
