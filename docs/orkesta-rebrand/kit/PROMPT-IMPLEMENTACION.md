# Prompt de implementación — ORKESTA 2.0

Actúa como diseñador UX/UI senior + frontend engineer de Orkesta. La meta es implementar una landing comercial completa, responsive y accesible, con estética **Editorial Tech × Creative Studio** y proyectos reales como evidencia. Antes de tocar código, inspecciona el repositorio, componentes, rutas, estilos, contenido y formularios existentes; no rompas la funcionalidad actual de automatización.

## Fuente de verdad
- Recursos en `/public/media/orkesta-2/assets/` (la raíz del ZIP es `orkesta_2_0_visual_kit/`; copia la carpeta `assets` al destino indicado).
- Consulta `docs/assets-manifest.json`, especialmente `section_mapping`.
- Tokens en `docs/tokens.css` y `docs/tokens.json`.
- Usa SVG donde convenga escalar; WebP para ilustraciones y portadas.
- Usa `<picture>` para `hero-editorial-desktop.webp` / `hero-editorial-mobile.webp` y portadas de proyectos; `loading="lazy"` bajo el primer viewport, widths/heights o aspect-ratio para evitar CLS.

## IMPORTANTE: integridad comercial
- Las portadas `portfolio/covers/` son DISEÑOS EDITORIALES DE APOYO, no capturas. Puedes usarlas temporalmente como portadas etiquetadas, sin atribuirles fidelidad al sitio del cliente.
- Los proyectos reales apuntan a URLs verificadas; las capturas reales **no están incluidas**. Para capturar las páginas públicamente accesibles, ejecuta `python scripts/capturar-proyectos.py` desde la raíz del kit con acceso a internet y coloca los archivos reales en `portfolio/screenshots-real/`. Asegura permisos, privacidad y calidad antes de publicar.
- No inventes testimonios, cifras de clientes, conversiones, resultados, ni casos de estudio. No anuncies Sello como un sitio visitable hasta conseguir su URL pública (el vínculo de Vercel es un dashboard privado).
- El logo incluido es una propuesta: confirmar antes de reemplazar la identidad actualmente publicada.

## Secciones completas `/`
1. Header sticky accesible: Inicio / Proyectos / Servicios / Nosotros / Contacto; CTA Cuéntanos tu proyecto.
2. Hero: H1 "Ideas extraordinarias. Experiencias digitales reales." + subtítulo sobre diseño web, experiencias, automatización e IA; CTA "Explorar proyectos" y "Cuéntanos tu idea". Ilustración 3D a la derecha desktop, debajo en móvil. No incrustes H1 en la imagen.
3. Cinta de servicios editorial.
4. 3 casos destacados: GRAFIK, Dra. Ana Mora, Diego & Giselle. Imagen real si está disponible, si no portada editorial con tratamiento coherente.
5. Cuatro servicios: desarrollo web, automatización/IA, experiencias digitales y soluciones a medida. Recursos `services/`.
6. "No nos creas. Pruébalo." Tres demos: agenda, RSVP, flujo automatizado. Las ilustraciones no son widgets funcionales: implementa demos reales si existe lógica; de lo contrario identifica explícitamente como simulación.
7. Portafolio filtrable de siete proyectos, CTA al sitio público. Para Sello no inventes URL.
8. Proceso en cuatro pasos: Conversamos, Planificamos, Construimos, Lanzamos.
9. Por qué Orkesta: proyectos verificables, versatilidad, ingeniería aplicada y acompañamiento; sin cifras inventadas.
10. Testimonios: usar ÚNICAMENTE autorizados y verificables; si no los hay, sustituir por pruebas de producto y procesos.
11. CTA de contacto con formulario validado y alternativa de WhatsApp/correo, mensajes de error útiles, consentimiento cuando aplique.
12. FAQs.
13. Footer: navegación, recursos, redes reales, términos y privacidad reales.

## Criterios de calidad
- Contraste WCAG AA; navegación por teclado; enlaces externos `rel="noopener noreferrer"`; descripciones alternativas; jerarquía semántica; FAQ con controles accesibles.
- Carga eficiente, `sizes` y formatos modernos, imágenes de hero priorizadas; no usar imágenes gigantes como fondos de toda la página.
- Mantener CTAs rastreables y eventos de interacción, sin recolectar datos sin consentimiento.
- Mobile 360-430 px, tablet y desktop 1280-1920 px.
- Separar datos de proyectos en archivo tipado y reutilizable; URLs y labels de assets en un mapa central.
- Respetar `prefers-reduced-motion`; animación por capas suave únicamente donde aporte.
