# Medición compartida de sitios

El esquema de `supabase/migrations/20261116035541_shared_measurement.sql` agrega un registro de sitios, eventos, contactos, conexiones y métricas diarias, sin modificar las tablas de consultas y pedidos de Orkéstalo. Las tablas nuevas tienen RLS y solo `service_role` recibe permisos. La clave secreta vive en funciones del servidor.

## Puesta en marcha

1. Aplicar las migraciones al proyecto Supabase de Orkéstalo y comprobar las tablas y políticas con una consulta real. El registro inicial contiene las dos doctoras desactivadas. Verificar el dominio de Fernanda en la segunda migración antes de activarla.
2. Configurar `MEASUREMENT_OWNER_EMAIL` en Vercel con el correo autorizado para entrar al panel. El panel está en `/medicion/`: envía un código de un solo uso por Resend y solo acepta una sesión cuyo correo haya sido confirmado por Supabase Auth. Configurar `MEASUREMENT_REPORT_EMAIL` con el destinatario del resumen mensual automático del mes anterior.
3. Revisar el aviso de privacidad y el consentimiento de cada sitio. Activar `measurement_sites.active` solo cuando el sitio y el colector estén publicados y el dominio coincida exactamente con `allowed_origins`.
4. El script compartido está en `/assets/measurement.js`. Cada sitio lo carga después del consentimiento analítico, con `data-site` y `data-consent-key`. Una falla de red del colector no interrumpe la web.
5. `/api/measurement-maintenance` elimina diariamente eventos y contactos al superar `retention_days`, sincroniza las métricas y el día 1 envía un resumen del mes anterior; lo invoca Vercel Cron con `CRON_SECRET`.

## Contrato

Eventos: `page_view`, `section_view`, `contact_click`, `form_start`, `form_submit`, `site_error`. Solo se aceptan campos definidos y etiquetas de una lista cerrada. La ruta se reduce a `/` para impedir que una URL con texto de un paciente llegue al colector. Un clic de WhatsApp es intención de contacto, no mensaje enviado ni cita confirmada. Las conversiones repiten el mismo UUID dentro de una sesión y la clave primaria `(site_id, event_id)` elimina duplicados.

El endpoint opcional de contactos admite nombre, correo o teléfono, canal, y versión de consentimiento. Rechaza motivos de consulta, síntomas, fotografías y texto libre. La identidad y el consentimiento corresponden a cada sitio mediante `site_id`; no se unen visitantes entre sitios.

## Integraciones

La tarea diaria `/api/measurement-maintenance` comprueba disponibilidad y consulta PageSpeed para cada sitio activo. Si se configura `GOOGLE_PERFORMANCE_API_KEY`, consulta además CrUX directamente. PageSpeed registra datos de laboratorio; CrUX registra percentiles reales de una ventana móvil de 28 días, cuando hay suficiente tráfico. Ambos se presentan por separado y conservan fecha y estado de conexión.

El esquema y panel admiten también datos diarios de Google Ads, Meta Ads y Search Console, junto con última sincronización y error. Estos tres conectores aún requieren las cuentas o credenciales autorizadas y el identificador de cuenta por sitio. No registrar cifras manuales como si fueran importaciones automáticas.

## Piloto y oferta

Validar en los dos sitios: UTM atribuido al sitio correcto, repetición de una conversión contada una vez, aislamiento de contactos, rechazo de datos clínicos y navegación usable si falla la medición. Contrastar totales diarios con las plataformas y revisar mensualmente costo y tiempo operativo.

La oferta es una cuota base por sitio que incluya medición, panel, mantenimiento e informe con recomendaciones; un nivel adicional cubre gestión activa de campañas. La inversión publicitaria y la configuración inicial se cotizan aparte. Fijar precios después del piloto: infraestructura y conectores compartidos ÷ sitios activos + tiempo mensual por sitio + margen.
