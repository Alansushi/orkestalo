import { next } from '@vercel/functions';

export const CAMPAIGN_CLOSE = Date.parse('2026-11-18T06:00:00Z');
export const isCampaignClosed = (now = Date.now()) => now >= CAMPAIGN_CLOSE;

export default function proxy(request) {
  const path = new URL(request.url).pathname;
  if ((path === '/buen-fin-2026' || path.startsWith('/buen-fin-2026/')) && isCampaignClosed()) {
    return new Response('La campaña Buen Fin 2026 ha concluido.', {
      status: 410,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    });
  }
  return next();
}
