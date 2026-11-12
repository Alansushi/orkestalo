# Retiro programado — 18 de noviembre de 2026

**Sitio:** https://www.orkestalo.com
**Ruta temporal:** `/buen-fin-2026/`
**Momento:** 18 de noviembre de 2026, 00:00, hora de Ciudad de México.

Ese día retirar por completo la campaña: quitar el enlace del hero y la lógica de vencimiento en `src/rebrand/render.mjs` y `src/site.js`; eliminar la página de `src/rebrand/commerce-pages.mjs`, su metadata y sus estilos exclusivos `studio-campaign-link` y `bf-*` en `rebrand.css`. Eliminar los cinco recursos exclusivos de `media/buen-fin-2026/`: `mercado-pago-desktop.png`, `mercado-pago-mobile.png`, `logo-mipymes-horizontal.png`, `logo-mipymes-vertical.png` y `registro-orkesta-qr.png`. Retirar los textos del cupón, bonificación y registro MIPYME de cualquier página compartida que los muestre. Revisar `vercel.json` y `proxy.js`: la URL antigua debe dejar de servir la oferta y responder 404 o el 410 habitual. Actualizar las pruebas y verificar hero, ruta, sitemap, metadata y caché. Usar la skill `retirar-buen-fin-mp-2026`.

Conservar los registros de pedidos, avisos de privacidad, datos y términos contractuales que deban mantenerse por obligaciones legales o para atender compras realizadas durante la campaña. No eliminar ni modificar pedidos al retirar los recursos visuales.

El texto comercial y las condiciones del cupón se basan en la versión revisada de la página de la Dra. Ana. Los enlaces oficiales de Mercado Libre devolvieron 403 en la consulta automatizada del 11 de noviembre de 2026; conservar los enlaces en la página para que cada comprador consulte las condiciones vigentes.
