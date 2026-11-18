import { next } from '@vercel/functions';

export default function proxy(request) {
  const path = new URL(request.url).pathname;
  if (['/buen-fin-2026', '/terminos-buen-fin-2026'].some((route) => path === route || path.startsWith(`${route}/`))) {
    return new Response('Este contenido ya no está disponible.', {
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
