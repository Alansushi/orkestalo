import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isPrivateAddress, siteUrlAllowed } from './consultorio-onboarding.js';

export async function readPublicSite(value, { resolve = lookup, request = https.request } = {}) {
  const url = siteUrlAllowed(value);
  if (!url) throw new Error('Sitio inválido');
  const addresses = await resolve(url.hostname, { all:true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('El sitio apunta a una red privada');
  const chosen = addresses[0];
  return new Promise((resolveText, reject) => {
    const req = request(url, {
      method:'GET', headers:{ Accept:'text/html' }, timeout:7000,
      lookup:(_host,_options,callback) => callback(null,chosen.address,chosen.family),
      servername:url.hostname,
    }, response => {
      if (response.statusCode !== 200 || !/^text\/html\b/i.test(response.headers['content-type'] || '')) { response.resume(); resolveText(''); return; }
      let size=0; const chunks=[];
      response.on('data', chunk => { size+=chunk.length; if(size>250_000){req.destroy(new Error('Sitio demasiado grande'));return;} chunks.push(chunk); });
      response.on('end',()=>resolveText(Buffer.concat(chunks).toString('utf8')));
      response.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(new Error('Sitio no disponible')));
    req.on('error',reject);
    req.end();
  });
}
