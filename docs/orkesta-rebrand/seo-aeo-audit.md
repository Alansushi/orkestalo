# Auditoría SEO/AEO de Orkesta

Fecha: 18 de octubre de 2026. Alcance: portada rediseñada, rutas de proyectos y servicios, páginas comerciales heredadas, sitemap, robots y `llms.txt`. Idioma principal: español; el selector inglés es una opción de lectura mediante JavaScript. Entorno: código local en `codex/orkesta-seo-aeo` y respuestas HTTP públicas; sin acceso a Google Search Console, Bing Webmaster Tools ni analítica.

## Hallazgos y cambios

| Prioridad | Estado inicial y evidencia | Cambio y criterio de cierre |
| --- | --- | --- |
| Alta | `https://orkestalo.com/` responde 307 hacia `https://www.orkestalo.com/`, pero canonicals, Open Graph, JSON-LD y sitemap usaban el host sin `www`. | Se usa `www` en todas las URLs absolutas públicas. Las pruebas comprueban canonical propio por ruta y coincidencia con el sitemap. La [guía de canonical de Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) recomienda no enviar señales a destinos distintos. |
| Alta | `hreflang=en` apuntaba a `?lang=en`, aunque el HTML inicial era español y el canonical apuntaba a la misma página española. | Se retiraron los alternates de páginas y sitemap; el selector EN sigue disponible. Publicar páginas inglesas independientes y rastreables sería una decisión posterior. Véase la [guía de versiones localizadas](https://developers.google.com/search/docs/specialty/international/localized-versions). |
| Media | El sitemap tenía `lastmod` fijo de agosto, anterior al rediseño; las rutas nuevas se agregaban con alternates de idioma no independientes. | Se quitaron `lastmod`, `changefreq`, `priority` y alternates. El build añade las rutas nuevas como URLs canónicas simples. Google pide [fechas de modificación precisas y verificables](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). |
| Media | Varias páginas heredadas incluían fechas de publicación/modificación en JSON-LD sin fuente verificable y FAQPage para preguntas que solo aparecían tras ejecutar React. | Se quitaron esas fechas y los FAQPage no presentes en el HTML inicial. El FAQPage de WhatsApp conserva preguntas y respuestas coincidentes con el contenido visible. La [política de datos estructurados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) exige que el marcado represente el contenido de la página. |
| Media | Las páginas nuevas de servicio usaban `publisher` y tenían alcance genérico. Varias páginas heredadas prometían llamadas gratis de 30 minutos, plazos en semanas, NDA, soporte mensual, retención cero o ROI sin respaldo en el proyecto. | Los servicios usan `provider` con la identidad Organization compartida y explican alcance, entregables y condiciones por propuesta. Se suavizaron las afirmaciones en HTML inicial, React y archivos `llms`. Los ejemplos de cálculo de impacto siguen identificados como ilustrativos. |
| Baja | `/proyectos/` devuelve 404 en producción al momento de la revisión; pertenece al rediseño pendiente del PR #15. | Comprobar esta ruta en el preview Git del rediseño y en su eventual publicación. Esta rama no modifica producción. |

`robots.txt` conserva sus permisos de rastreo, incluidos los rastreadores de entrenamiento; solo se actualizó la URL del sitemap. Los controles de búsqueda y entrenamiento son distintos por proveedor, como documentan [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) y [Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers). `llms.txt` se mantiene como resumen editorial; [Google indica que no lo usa para visibilidad en Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

## Medición y límites

| Indicador | Estado |
| --- | --- |
| HTTP del host | Observado: sin `www` 307; con `www` 200. |
| Rutas nuevas en producción | `/proyectos/`: 404 antes de integrar el rediseño. |
| Indexación, consultas, impresiones y clics | **Sin evidencia**: requiere propiedad verificada de Search Console y Bing Webmaster Tools. |
| Apariciones o citas en funciones de IA | **Sin evidencia**. Los informes [Generative AI performance de Google](https://support.google.com/webmasters/answer/16984139) y [AI Performance de Bing](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/) pueden aportar observaciones, si están disponibles y hay volumen; no garantizan apariciones. |
| Core Web Vitals de usuarios | **Sin evidencia**. El Lighthouse móvil previo registró LCP de 4.7 s en laboratorio local sin compresión; no representa usuarios reales ni un efecto de estos cambios. |

Para establecer una línea base, verificar la propiedad `www` en Search Console y Bing, enviar `https://www.orkestalo.com/sitemap.xml`, inspeccionar portada, tres servicios y `/proyectos/`, y registrar fecha, cobertura, consultas, impresiones, clics y segmentos de país/dispositivo. Comparar ventanas equivalentes tras la publicación, anotando el rediseño y cualquier cambio externo. Si aparecen los informes generativos, registrar las páginas observadas y el periodo; no inferir una cuota de citas a partir de pruebas manuales.

## Verificación

`npm test`: 19/19 pruebas correctas. Compila y comprueba rutas, enlaces internos de las páginas nuevas, canonical por página, sitemap, JSON-LD parseable, fechas y alternates ausentes, servicio/proveedor y FAQ visible. `node scripts/qa-rebrand.mjs`: QA local correcta en cinco tamaños de pantalla, menú, idioma, filtros y formulario simulado. Las comprobaciones HTTP públicas se hicieron con `curl -sSIL` el 18 de octubre de 2026.

El preview protegido generado por la integración Git para el PR #16 quedó en estado **Ready**. Con `vercel curl` autenticado respondieron 200 la portada, `/proyectos/index.html`, `/servicios/automatizacion-ia/index.html` y `/sitemap.xml`; las rutas con barra final se comprobaron siguiendo la redirección. El HTML del preview conserva canonical propio con `www`, sin `hreflang`, y el sitemap incluye `/proyectos/` sin fechas. La protección del preview añade `X-Robots-Tag: noindex`, esperado para ese entorno. Esto prueba el artefacto de preview, no indexación ni resultados de búsqueda.
