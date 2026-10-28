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

El recorrido principal es portada → servicio o caso real → formulario con contexto validado → WhatsApp con un mensaje preparado. Las fichas y servicios pasan una `referencia` validada; el formulario preselecciona el tipo sin sobrescribir una selección existente. Nombre, tipo y descripción son obligatorios; correo, teléfono, presupuesto y fecha son opcionales. El navegador puede ofrecer autorrelleno para nombre, correo y teléfono. El visitante decide si envía el mensaje desde WhatsApp. El correo sigue visible en el pie. No se muestran testimonios, cifras de resultados o atribuciones sin fuente: la sección “Lo que hemos construido” apunta a trabajo observable.

Las doce secciones de la portada son hero, enfoque, servicios, proyectos, evidencia, demos, método, punto de vista, capacidades, FAQ, estudio y contacto/cierre. Las tres demos son simulaciones locales claramente etiquetadas. No envían mensajes, reservas ni RSVP. Hay páginas estáticas en `/proyectos/`, seis `/proyectos/[slug]/`, tres `/servicios/[slug]/`, `/contacto/` y `/aviso-de-privacidad/`. Las rutas `.html` y la redirección existente siguen en el build. El aviso de privacidad es un **borrador**, marcado `noindex`, para revisión antes de publicar.

## Correo, privacidad y medición

El formulario no envía datos a un servidor de Orkesta. Construye una URL de WhatsApp en el navegador con los campos proporcionados y omite los opcionales vacíos. El sitio no guarda datos personales del formulario para visitas futuras. El aviso de privacidad describe este flujo y sigue marcado como borrador `noindex` pendiente de revisión legal.

La interfaz emite eventos `orkesta:conversion` para filtros, demos, clics de WhatsApp y continuación desde el formulario. Los metadatos están limitados a categoría, demo, paso, tipo y referencia; no incluyen nombre, correo, teléfono ni descripción. **No hay plataforma de analítica activa**; conectar una requerirá decidir proveedor y consentimiento aplicable. Los títulos, descripciones, canonicals, Open Graph, datos estructurados y sitemap se generan para las rutas nuevas. Español es el idioma inicial; el selector existente permite inglés. La revisión posterior de SEO/AEO está en [`seo-aeo-audit.md`](./seo-aeo-audit.md); retiró `hreflang` mientras no existan páginas inglesas independientes y mantuvo la política de rastreo de `robots.txt`.

## Verificación local

- `npm test`: cubre build, datos del portafolio, rutas, enlaces y composición del mensaje en español e inglés.
- `node scripts/qa-rebrand.mjs` contra `python3 -m http.server 8080 --directory public`: capturas completas a 1440×900, 1920×1080, 768×1024, 390×844 y 375×812; menú, idioma, filtros, campos obligatorios, referencias y enlace final de WhatsApp. Ver [`qa-results.json`](./qa-results.json) y [`screenshots/`](./screenshots/).
- Lighthouse local con Chrome: móvil rendimiento **76**, accesibilidad **100**, buenas prácticas **100**, SEO **100**; FCP **3.5 s**, LCP **4.7 s**, TBT **0 ms**, CLS **0.002**. Escritorio: **97/100/100/100**; FCP **0.7 s**, LCP **1.2 s**, TBT **0 ms**, CLS **0**. Informes: [`lighthouse-mobile.json`](./lighthouse-mobile.json), [`lighthouse-desktop.json`](./lighthouse-desktop.json). Se midió sobre un servidor Python local sin compresión; estos números no son datos de campo ni una garantía de Core Web Vitals en Vercel. El LCP móvil queda como principal oportunidad de mejora.

## Pendientes editoriales

1. Aprobar identidad visual y permiso de uso de las capturas de clientes.
2. Revisar legalmente el aviso de privacidad y el uso de WhatsApp como canal de contacto.
3. Decidir analítica y consentimiento; medir rendimiento sobre un despliegue de la integración Git.

Las publicaciones en Vercel se hacen mediante commit, push, PR a `main`, integración y verificación del despliegue automático. No se usa despliegue directo.
