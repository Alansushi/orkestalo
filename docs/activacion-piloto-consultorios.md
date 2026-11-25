# Activación guiada del piloto de consultorios

Esta guía acompaña al [piloto de consultorios](consultorios-piloto.md) y al PR #40 de marca, presencia y medición. La publicación del código y la activación de cada consultorio son pasos distintos. La integración en `main` genera un despliegue automático de Git; no activa por sí sola los mensajes, anticipos ni agendas de Ana y Fernanda.

## 1. Preparar integraciones

- En Cal.com, registrar un cliente OAuth **confidencial** (PKCE desactivado), con retorno exacto `https://www.orkestalo.com/api/consultorio?action=callback` y solo estos permisos: `BOOKING_READ`, `BOOKING_WRITE`, `EVENT_TYPE_READ`, `EVENT_TYPE_WRITE`, `WEBHOOK_READ`, `WEBHOOK_WRITE`. Esperar su aprobación externa antes de conectar cuentas de doctoras.
- Guardar `CAL_OAUTH_CLIENT_ID` y `CAL_OAUTH_CLIENT_SECRET` como secretos en Vercel **Preview y Production**. Confirmar destinos y nombres con `vercel env ls` sin consultar ni publicar valores. Nunca copiarlos al repositorio, a un comentario de PR ni a un chat.
- En Resend, crear un webhook para `https://www.orkestalo.com/api/consultorio-misc?route=email` con `email.delivered`, `email.failed`, `email.bounced` y `email.suppressed`. Guardar su secreto de firma como `RESEND_WEBHOOK_SECRET` en **Preview y Production**. Confirmar que `orkestalo.com` sigue verificado y que `RESEND_API_KEY` ya existe en ambos entornos.
- Confirmar que `SURVEY_TOKEN_SECRET` está en **Preview y Production**. El callback de Cal.com y el de Resend deben responder en producción después del nuevo despliegue de Git; una petición sin firma válida debe rechazarse.

Estado al 21 de noviembre de 2026: el webhook de Resend y su secreto ya están configurados. El cliente OAuth «Orkéstalo Consultorios» se creó desde `info@orkestalo.com` con los seis permisos y el retorno indicados; Cal.com lo muestra **Pendiente**. Su ID y secreto ya están guardados como secretos en Vercel Preview y Production. Este cambio de documentación activa un nuevo despliegue automático de Git para incorporar esas variables. No conectar cuentas de doctoras hasta que Cal.com apruebe el cliente.

Si una variable se añade o cambia después de un despliegue, repetir el flujo commit, push, PR a `main`, integración y verificación del nuevo despliegue. No desplegar con Vercel CLI, API, promoción ni carga manual.

## 2. Ensayo propio y revisión individual

Antes de pedir la revisión a Ana y Fernanda, hacer un ensayo técnico en un **consultorio de prueba independiente**, con una cuenta de Orkéstalo para el panel y la cuenta personal de Cal.com del dueño para la agenda. No conectar esa agenda a los consultorios reales ni activar envíos hacia pacientes reales. Cuando Cal.com apruebe el cliente OAuth, conectar la cuenta, elegir un tipo de cita de prueba y comprobar la creación del webhook firmado. El retorno OAuth lleva a `www.orkestalo.com/consultorio/`; revisar la interfaz en el despliegue disponible. Reservar, reprogramar y cancelar usando correos de prueba controlados; revisar los estados de cita y entrega. Probar plantillas, consentimiento y encuesta dentro del consultorio de prueba antes de activar esos flujos en consultorios reales. El anticipo solo se prueba si el proveedor de pago del evento admite un entorno sin cargo real. Documentar cada resultado y corregir los fallos antes de invitar a las doctoras.

Después, compartir con cada doctora el panel publicado en `/consultorio/`. Cada una entra con **su propia cuenta** y puede revisar y aprobar su contenido de forma asincrónica; no hace falta una llamada. No registrar datos clínicos ni material sin su autorización.

1. Revisar nombre visible, correo de respuesta, sitio, ubicación, identidad y aviso de privacidad. La doctora confirma sus datos y la revisión de privacidad.
2. Revisar las cuatro plantillas (bienvenida, reserva posterior, invitación con anticipo y encuesta). Enviar pruebas a su propio correo. Una edición posterior invalida la prueba: reenviar y volver a revisar. Solo la doctora aprueba sus versiones.
3. Cargar en la biblioteca únicamente material autorizado, con licencia y restricciones. La doctora aprueba cada versión y revisa su ficha de presencia. Registrar las solicitudes y su historial de estados.
4. Tras aprobar Cal.com el cliente, la doctora conecta su cuenta y selecciona por nombre el tipo de cita normal. El panel crea y comprueba el webhook firmado. El tipo con anticipo es opcional: requiere precio, enlace de Cal.com, campo oculto `orkesta_invite` y webhook propio.
5. Activar mensajes y encuestas **por consultorio** solo después de las pruebas reales y aprobaciones correspondientes. El consentimiento de encuesta se registra para cada cita.

## 3. Pruebas del piloto y evidencia

Usar `info@orkestalo.com` como paciente de prueba controlado. Registrar fecha, entorno, consultorio, actor, resultado esperado y observado, y enlace o captura sin secretos ni datos clínicos en el registro de aceptación del piloto. Para los estados de error y el aislamiento, usar datos de prueba: no alterar sitios reales.

| Comprobación | Evidencia requerida |
| --- | --- |
| Correo | Prueba aprobada por cada doctora; entrega y rebote con `delivered@resend.dev` y `bounced@resend.dev`; fallo y supresión; mensaje de prueba fallido reintentado por el cron y registro de su ejecución. |
| Citas | Reserva normal, reprogramación, cancelación, aviso inicial y posterior; webhooks firmados y citas visibles solo en el consultorio correcto. |
| Consentimiento | Encuesta enviada solo con autorización de esa cita; enlace de un solo uso y respuesta guardada una sola vez. |
| Marca y presencia | Biblioteca propia, aprobación y descarga; ficha revisada; solicitudes e historial; acceso cruzado denegado. |
| Medición | Para el mismo sitio y periodo en el panel publicado, comparar los seis indicadores y **cada tabla** entre `/medicion/` y «Mis resultados» de `/consultorio/` para Ana y Fernanda. Probar código, autenticador, sesión vencida, sitio inactivo, vínculo o dominio incorrecto, fuente no disponible y estado sin datos. |
| Anticipo | Solo probar checkout si el proveedor de pago **del evento de Cal.com** ofrece un entorno sin cargo real. Registrar proveedor, modo de prueba y resultado. Las credenciales de prueba de Mercado Pago no verifican por sí solas un checkout de Cal.com conectado a Stripe o PayPal. |

## 4. Publicación del código y activación del piloto

El ensayo del consultorio independiente y las pruebas automatizadas pueden acreditar el funcionamiento técnico para integrar el PR #40 sin usar agendas ni datos de pacientes de las doctoras. Antes de integrar, verificar que la rama y Preview pasan, que el ensayo controlado de OAuth, webhook y ciclo de cita está registrado, que los envíos y anticipos de Ana y Fernanda siguen desactivados y que ninguna función del piloto se inicia por el despliegue. Después verificar el despliegue **automático de la integración Git de Vercel** asociado al commit de integración.

La activación de **cada consultorio real** requiere su propia revisión de identidad, privacidad, contenido, biblioteca y ficha; pruebas y aprobaciones de plantillas por la doctora; conexión de su agenda; y las comprobaciones de correo, citas, consentimiento y medición de la sección 3. Mantener sus envíos y anticipos desactivados hasta entonces. El ensayo del consultorio independiente no sustituye el consentimiento ni la aprobación de cada doctora. Corregir cada fallo y repetir la prueba afectada antes de activar el consultorio correspondiente. Si el anticipo no admite una prueba sin cargo real, mantenerlo desactivado.
