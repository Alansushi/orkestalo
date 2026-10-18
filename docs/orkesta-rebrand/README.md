# Orkesta 2.0 — entrega local

Estado: implementación y verificación local en `codex/orkesta-2-rebrand`. No se ha publicado ni integrado en `main`.

## Auditoría e inventario

La landing anterior enfocaba la conversación en automatización. Se conservan las páginas comerciales `.html`, sus demos explicativas, el selector ES/EN, WhatsApp (`+52 55 4971 3262`) y la redirección de `/automatizacion-ia-pymes-latam.html`. La nueva portada presenta diseño web, experiencias digitales y automatización con un camino a proyectos verificables y contacto.

La fuente del sistema visual es el kit local en `../multimedia orkestalo/orkesta_2_0_visual_kit/`; se copiaron sus tokens y manifiesto a [`kit/`](./kit/). Son una **propuesta visual**, sujeta a aprobación de marca antes de producción. El CSS reutiliza el fondo cálido `#F7F6F2`, tinta `#17181C`, azul `#555CFF`, lavanda `#D9D5FF` y lima `#DBFF77`, con Space Grotesk, DM Sans e IBM Plex Mono autoalojadas. Sus licencias OFL se incluyen en `media/fonts/`. El logotipo horizontal SVG se reconstruyó desde el lockup propuesto y tiene versión positiva y negativa. Las ilustraciones conceptuales del kit se usan en servicios y demos; el hero y el portafolio usan capturas de los sitios públicos reales.

| Proyecto | URL pública comprobada | Uso |
| --- | --- | --- |
| GRAFIK | https://www.grafik.mx/ | Ficha y captura de portada |
| Dra. Ana Mora | https://www.draanamora.com.mx/ | Odontología y ortodoncia; ficha y captura |
| Diego & Giselle | https://www.diegoygiselle.com/ | Experiencia de evento pasado; solo primer viewport |
| Dra. Fernanda Suaste | https://sitio-dra-fernanda-suaste.vercel.app/ | Ficha y captura de portada |
| Expression Gráfica | https://expresiongrafica.vercel.app/ | Nombre público corregido; ficha y captura |
| Aranza & Mateo | https://aranza-mateo.vercel.app/ | Experiencia de evento pasado; solo primer viewport |

Las seis URLs respondieron con HTTP 200 al capturar. Los WebP de `media/projects/` se revisaron visualmente; las capturas de eventos excluyen RSVP, datos bancarios, listas de invitados y regalos. La disponibilidad y contenido de terceros pueden cambiar. **Sello** aparece en el manifiesto sin URL propia y no se enlaza ni publica como ficha.

## Estrategia de conversión y contenido

El recorrido principal es portada → servicio o caso real → formulario con contexto validado. WhatsApp es la vía inmediata y permanece en cabecera, contacto y pie. Las fichas y servicios pasan un `referencia` validado; el formulario preselecciona el tipo. El usuario puede aportar nombre, correo, tipo, descripción y, opcionalmente, presupuesto y fecha. No se muestran testimonios, cifras de resultados o atribuciones sin fuente: la sección “Lo que hemos construido” apunta a trabajo observable.

Las doce secciones de la portada son hero, enfoque, servicios, proyectos, evidencia, demos, método, punto de vista, capacidades, FAQ, estudio y contacto/cierre. Las tres demos son simulaciones locales claramente etiquetadas. No envían mensajes, reservas ni RSVP. Hay páginas estáticas en `/proyectos/`, seis `/proyectos/[slug]/`, tres `/servicios/[slug]/`, `/contacto/` y `/aviso-de-privacidad/`. Las rutas `.html` y la redirección existente siguen en el build. El aviso de privacidad es un **borrador**, marcado `noindex`, para revisión antes de publicar.

## Correo, privacidad y medición

`POST /api/contact` valida longitudes, tipo, correo y descripción; limita el cuerpo, usa un campo antispam y solo confirma éxito cuando Resend acepta el envío. `GET /api/contact` expone disponibilidad. Se requieren `RESEND_API_KEY` y `RESEND_FROM_EMAIL` de un remitente verificado; el destinatario es `info@orkestalo.com`. Si faltan o falla el proveedor, el sitio muestra un estado de error y ofrece WhatsApp. Las pruebas locales simulan respuestas de la API; **no se ha enviado un correo externo real**.

La integración Resend se descubrió en Vercel Marketplace. La CLI se actualizó a 64.5.0, pero el alta quedó en `action_required`: la cuenta debe aceptar los términos de Resend en [Vercel](https://vercel.com/alansushis-projects/~/integrations/accept-terms/resend?source=cli). Después hay que asociar la integración al proyecto, verificar el dominio/remitente y configurar `RESEND_FROM_EMAIL`, probar una entrega real y revisar el aviso de privacidad. No se aceptaron términos en nombre del titular.

La interfaz emite eventos `orkesta:conversion` para filtros, demos, clics de WhatsApp y envío/resultado del formulario. Los metadatos están limitados a categoría, demo, paso, tipo y referencia; no incluyen nombre, correo ni descripción. **No hay plataforma de analítica activa**; conectar una requerirá decidir proveedor y consentimiento aplicable. Los títulos, descripciones, canonicals, hreflang ES/EN, Open Graph, datos estructurados y sitemap se generan para las rutas nuevas. Español es el idioma inicial; el selector existente permite inglés. `robots.txt` se conserva.

## Verificación local

- `npm test`: **16/16 correctas**, cubriendo build, datos del portafolio, rutas, enlaces y estados de la API.
- `node scripts/qa-rebrand.mjs` contra `python3 -m http.server 8080 --directory public`: capturas completas a 1440×900, 1920×1080, 768×1024, 390×844 y 375×812; menú, idioma, filtros, contexto de contacto y respuestas simuladas. Ver [`qa-results.json`](./qa-results.json) y [`screenshots/`](./screenshots/).
- Lighthouse local con Chrome: móvil rendimiento **76**, accesibilidad **100**, buenas prácticas **100**, SEO **100**; FCP **3.5 s**, LCP **4.7 s**, TBT **0 ms**, CLS **0.002**. Escritorio: **97/100/100/100**; FCP **0.7 s**, LCP **1.2 s**, TBT **0 ms**, CLS **0**. Informes: [`lighthouse-mobile.json`](./lighthouse-mobile.json), [`lighthouse-desktop.json`](./lighthouse-desktop.json). Se midió sobre un servidor Python local sin compresión; estos números no son datos de campo ni una garantía de Core Web Vitals en Vercel. El LCP móvil queda como principal oportunidad de mejora.

## Pendientes antes de producción

1. Aprobar identidad visual y permiso de uso de las capturas de clientes.
2. Aceptar los términos del Marketplace, terminar Resend, verificar remitente y probar entrega real al buzón.
3. Revisar legalmente el aviso de privacidad, su alcance y la retención de consultas.
4. Decidir analítica y consentimiento; medir rendimiento sobre un despliegue de la integración Git.
5. Si se solicita publicación, hacer commit, push, PR a `main`, integrar y verificar el despliegue automático de Vercel. No usar despliegue directo.
