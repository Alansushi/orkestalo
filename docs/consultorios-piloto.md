# Piloto de consultorios

## Alta autogestionada

La migración `20261119191714_clinic_self_serve.sql` añade el estado de alta, el registro de invitaciones y los webhooks por tipo de cita. Desactiva los cuatro envíos de los consultorios existentes hasta que cada profesional confirme sus datos, revise privacidad, pruebe y apruebe los mensajes, y active los tipos deseados. Las cuentas, citas y borradores existentes permanecen.

El correo configurado como `MEASUREMENT_OWNER_EMAIL` tiene acceso al área de invitaciones. Si quieres autorizar más cuentas verificadas, configura `CLINIC_ADMIN_EMAILS` en Vercel Production y Preview con esos correos separados por comas. Enviar de nuevo el mismo correo reutiliza el consultorio; el enlace nuevo llega por Resend. El acceso con código de Supabase sigue disponible para las personas ya invitadas. No habilites el alta pública en Supabase Auth.

Cada profesional entra en `/consultorio/` y sigue el recorrido. Puede escribir nombre, correo de respuestas, ubicación y color sin sitio web; si añade uno, el analizador solo lee una página pública HTTPS con dirección DNS pública y no sigue redirecciones. Para Cal.com, el cliente OAuth confidencial necesita `BOOKING_READ`, `BOOKING_WRITE`, `EVENT_TYPE_READ`, `EVENT_TYPE_WRITE`, `WEBHOOK_READ` y `WEBHOOK_WRITE`. Tras conectar, el panel lista los tipos de cita y crea o actualiza un webhook firmado por tipo seleccionado. Si reconecta la cuenta, los envíos se apagan hasta comprobar nuevamente los avisos. El tipo con anticipo es opcional; debe tener precio, URL de Cal.com y un campo oculto de texto corto con slug `orkesta_invite` antes de elegirlo.

La activación se valida en el servidor contra la membresía, la conexión de Cal.com, el webhook, la identidad confirmada, la revisión de privacidad y una versión probada y aprobada de cada correo. El correo de invitación con anticipo exige además su propio tipo y webhook. Configura el webhook global de Resend y `SURVEY_TOKEN_SECRET` por separado. Antes de activar en producción, comprueba la entrega de pruebas y reservas ficticias con las credenciales reales.

## Personalización de correos (noviembre de 2026)

La migración `20261119043419_clinic_email_personalization.sql` crea pacientes por consultorio, borradores versionados y una copia del contenido de cada envío. El primer correo se asigna a la primera cita confirmada registrada para el correo normalizado dentro de ese consultorio. Las citas pendientes de pago no cuentan; las siguientes citas confirmadas reciben la plantilla de reserva posterior. Los reintentos usan la copia guardada, y una cancelación detiene el reintento de bienvenida o reserva.

El panel permite entrar con un código enviado al correo de la doctora, analizar el sitio público, revisar la fuente de cada dato propuesto, editar identidad y cuatro plantillas, ver HTML y texto, recibir una prueba y aprobar una revisión. Una edición invalida la prueba anterior. Un análisis nuevo crea borradores sin modificar versiones aprobadas. Cada tipo permanece desactivado hasta que exista una versión aprobada y la doctora lo active.

Los perfiles iniciales usan provisionalmente `anabadillomora@gmail.com` y `fersuasmi.endo@gmail.com`, con `orkestalo.com` como dominio remitente y esos correos como `Reply-To`. Las dos cuentas y membresías se crearon sin envío de invitaciones; las doctoras pueden solicitar acceso desde `/consultorio/` y usar el código o el enlace que reciban según la plantilla de Supabase Auth. La URL exacta `https://www.orkestalo.com/consultorio/` está permitida como retorno en Supabase Auth y se verificó con un enlace generado sin enviarlo. Hay ocho borradores sin aprobación y todos los envíos siguen desactivados. Los sitios proponen nombre, correo y ubicación para ambas; el de Ana también ofrece agenda Cal.com y el de Fernanda ofrece color. Cada doctora debe revisar y aplicar esos datos antes de aprobar las plantillas.

Para completar la activación faltan las credenciales OAuth confidenciales de Cal.com, los ID y enlaces de tipos de cita de cada doctora, registrar ambos webhooks de Cal.com, el secreto del webhook de Resend y `SURVEY_TOKEN_SECRET` en Vercel. Después, cada doctora debe probar y aprobar sus cuatro plantillas. Probar reservas ficticias y la entrega en ambos consultorios antes de activar cualquier tipo de correo. No agregar credenciales al repositorio.

El panel privado está en `/consultorio/`; la encuesta pública de un solo uso está en `/encuesta/`. Ambos están excluidos de indexación. El piloto usa exclusivamente datos operativos: contacto, cita, tarea, entrega de mensajes y respuesta a encuesta. No cargar diagnósticos, expedientes ni notas clínicas.

## Activación de cada consultorio

1. Aplicar `supabase/migrations/20261119022617_consultorio_pilot.sql` al proyecto Supabase **orkestalo** (`ydgoutyckylbqtpyproy`). Las tablas tienen RLS, sin políticas públicas; solo las funciones con la clave secreta acceden a ellas. Verificar que las tablas estén vacías y que `anon` y `authenticated` no puedan leerlas.
2. Configurar en Vercel Production y Preview `SUPABASE_PUBLISHABLE_KEY` (clave pública del mismo proyecto), `CAL_OAUTH_CLIENT_ID` y `CAL_OAUTH_CLIENT_SECRET` (cliente **confidencial** aprobado por Cal.com), `RESEND_WEBHOOK_SECRET` (secreto del webhook de Resend) y `SURVEY_TOKEN_SECRET` (aleatorio de al menos 32 bytes). Conservar las variables existentes `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` y `CRON_SECRET`.
3. Crear las cuentas de las doctoras en Supabase Auth sin enviar invitaciones y permitir `https://www.orkestalo.com/consultorio/` como URL exacta de retorno en Auth. Crear una fila por consultorio en `clinics` y una fila por doctora en `clinic_memberships`. Generar `cal_webhook_secret` único y aleatorio para cada consultorio. Configurar `doctor_name`, `reply_to`, `sender_local_part`, `cal_event_type_id` gratuito, `cal_paid_event_type_id` con anticipo y `cal_booking_url` de ese tipo de pago. En el formulario del evento de pago, crear un campo oculto de texto con identificador `orkesta_invite`; el enlace lo rellena y el webhook lo devuelve en `responses`. Dejar `welcome_enabled` y `survey_enabled` en `false` hasta aprobar textos y avisos.
4. Registrar `https://www.orkestalo.com/api/consultorio?action=callback` como URI exacta de retorno del cliente OAuth de Cal.com. La doctora entra al panel y conecta su cuenta. Configurar un webhook de usuario o dos webhooks de tipo de cita para cubrir **ambos** eventos (gratis y con anticipo), con URL `https://www.orkestalo.com/api/consultorio-misc?route=cal&clinic=<id>`, el secreto de esa clínica y los eventos `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_REQUESTED`, `BOOKING_PAYMENT_INITIATED`, `BOOKING_PAID`, `BOOKING_REJECTED` y `BOOKING_NO_SHOW_UPDATED`. No usar una plantilla de payload personalizada. Probar el ping firmado de Cal.com.
5. Configurar en Resend el webhook `https://www.orkestalo.com/api/consultorio-misc?route=email` para entregas, fallos, rebotes y supresiones. El dominio `orkestalo.com` debe seguir verificado. Probar `reply_to` en ambos consultorios.
6. Revisar con cada doctora el aviso de privacidad, la autorización de encuestas y los textos de bienvenida y encuesta. Al aprobarlos, activar `welcome_enabled` y `survey_enabled` por clínica. La casilla de encuesta se registra por cita; las campañas tienen un consentimiento distinto y no están activas en este piloto.

## Pruebas del piloto

### Medición compartida

`/medicion/` y «Mis resultados» de `/consultorio/` usan las mismas vistas, seis indicadores y tablas para los últimos 30 días. El consultorio consulta únicamente el sitio vinculado en `clinic_measurement_links` y comprueba la membresía y el dominio en cada solicitud. Un sitio desactivado conserva su historial con «Medición inactiva»; un vínculo ausente o incorrecto muestra «Sin datos verificados».

Antes de integrar esta rama en `main`, comparar en Preview las seis cifras y cada tabla con Ana y Fernanda autenticadas, una cuenta sin membresía, una sesión vencida y el acceso del administrador con código y autenticador. Comprobar también sitio desactivado, vínculo y dominio incorrectos, ausencia de filas, más de 1 000 filas y caída de la fuente. La publicación sigue el PR a `main` y el despliegue automático de la integración Git de Vercel.

- Crear dos consultorios y dos cuentas. Confirmar que cada cuenta solo ve sus citas, pendientes y mensajes; una petición a la API con el ID de la otra clínica debe devolver 401.
- Conectar dos calendarios a Cal.com, bloquear un horario en uno y verificar que no se ofrezca allí. Crear cita sin anticipo y enviar a otra paciente el enlace de Cal.com con anticipo. La invitación figura como pendiente; se marca confirmada cuando Cal.com envía `BOOKING_PAID`. El horario que la doctora seleccionó inicialmente es orientativo: la paciente elige uno disponible en Cal.com al pagar.
- Reprogramar y cancelar en Cal.com; comprobar la actualización en el panel. Registrar una cita coordinada por WhatsApp, comprobar su pendiente y registrarla también en Cal.com con el mismo correo y hora para que se vinculen.
- Marcar una visita atendida con autorización de encuesta: recibir una sola encuesta, responder una sola vez, comprobar calificación y comentario. Fallar intencionalmente Resend, comprobar el estado fallido y el reintento diario.
- Durante el piloto, registrar citas confirmadas, cancelaciones, no asistencias y entregas para establecer una línea base. No atribuir cambios en ausencias hasta tener periodos comparables.

## Evolución prevista

La siguiente fase añadirá invitaciones de seguimiento con reglas por doctora y vínculo a la reserva resultante. Las campañas requerirán consentimiento por consultorio, baja y control de frecuencia, separados de los mensajes de cita. El reporte mensual empezará con cifras verificables y solo después añadirá un resumen con IA revisable. La suscripción se cobrará después del piloto gratuito.

## Referencias técnicas

- [Supabase Auth y RLS](https://supabase.com/docs/guides/auth)
- [OAuth de Cal.com](https://site.cal.com/integrate) y [webhooks firmados](https://site.cal.com/features/webhooks)
- [Webhooks de Resend](https://resend.com/features/webhooks)
