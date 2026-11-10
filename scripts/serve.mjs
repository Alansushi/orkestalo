import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

await import('./build.mjs');

const root = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const types = {
  '.css': 'text/css', '.html': 'text/html', '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.txt': 'text/plain', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  const relative = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = resolve(root, `.${relative}`);
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': `${types[extname(file)] ?? 'application/octet-stream'}${['.html', '.css', '.js', '.txt', '.xml'].includes(extname(file)) ? '; charset=utf-8' : ''}`,
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 500).end();
  }
}).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
  console.log(`Orkesta local source ready on port ${process.env.PORT || 3000}`);
});
