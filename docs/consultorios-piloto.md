# Piloto de consultorios

El panel privado está en `/consultorio/`; la encuesta pública de un solo uso está en `/encuesta/`. Ambos están excluidos de indexación. El piloto usa exclusivamente datos operativos: contacto, cita, tarea, entrega de mensajes y respuesta a encuesta. No cargar diagnósticos, expedientes ni notas clínicas.

## Activación de cada consultorio

1. Aplicar `supabase/migrations/20261119022617_consultorio_pilot.sql` al proyecto Supabase **orkestalo** (`ydgoutyckylbqtpyproy`). Las tablas tienen RLS, sin políticas públicas; solo las funciones con la clave secreta acceden a ellas. Verificar que las tablas estén vacías y que `anon` y `authenticated` no puedan leerlas.
2. Configurar en Vercel Production y Preview `SUPABASE_PUBLISHABLE_KEY` (clave pública del mismo proyecto), `CAL_OAUTH_CLIENT_ID` y `CAL_OAUTH_CLIENT_SECRET` (cliente **confidencial** aprobado por Cal.com), `RESEND_WEBHOOK_SECRET` (secreto del webhook de Resend) y `SURVEY_TOKEN_SECRET` (aleatorio de al menos 32 bytes). Conservar las variables existentes `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` y `CRON_SECRET`.
3. Crear las cuentas de las doctoras en Supabase Auth con contraseña individual. Crear una fila por consultorio en `clinics` y una fila por doctora en `clinic_memberships`. Generar `cal_webhook_secret` único y aleatorio para cada consultorio. Configurar `doctor_name`, `reply_to`, `sender_local_part`, `cal_event_type_id` gratuito, `cal_paid_event_type_id` con anticipo y `cal_booking_url` de ese tipo de pago. En el formulario del evento de pago, crear un campo oculto de texto con identificador `orkesta_invite`; el enlace lo rellena y el webhook lo devuelve en `responses`. Dejar `welcome_enabled` y `survey_enabled` en `false` hasta aprobar textos y avisos.
4. Registrar `https://www.orkestalo.com/api/consultorio?action=callback` como URI exacta de retorno del cliente OAuth de Cal.com. La doctora entra al panel y conecta su cuenta. Configurar un webhook de usuario o dos webhooks de tipo de cita para cubrir **ambos** eventos (gratis y con anticipo), con URL `https://www.orkestalo.com/api/consultorio-misc?route=cal&clinic=<id>`, el secreto de esa clínica y los eventos `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`, `BOOKING_REQUESTED`, `BOOKING_PAYMENT_INITIATED`, `BOOKING_PAID`, `BOOKING_REJECTED` y `BOOKING_NO_SHOW_UPDATED`. No usar una plantilla de payload personalizada. Probar el ping firmado de Cal.com.
5. Configurar en Resend el webhook `https://www.orkestalo.com/api/consultorio-misc?route=email` para entregas, fallos, rebotes y supresiones. El dominio `orkestalo.com` debe seguir verificado. Probar `reply_to` en ambos consultorios.
6. Revisar con cada doctora el aviso de privacidad, la autorización de encuestas y los textos de bienvenida y encuesta. Al aprobarlos, activar `welcome_enabled` y `survey_enabled` por clínica. La casilla de encuesta se registra por cita; las campañas tienen un consentimiento distinto y no están activas en este piloto.

## Pruebas del piloto

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
