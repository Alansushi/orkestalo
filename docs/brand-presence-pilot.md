# Piloto de marca y presencia

Este módulo complementa el panel privado. El servicio piloto de 30 días es gratuito, no se renueva automáticamente y no publica precios. Incluye configuración inicial, una revisión de presencia y una actualización menor. La producción física y trabajos adicionales se cotizan fuera del panel. No se ofrecen Cal.com, Resend ni pagos como parte de la promesa hasta terminar sus pruebas reales.

## Preparación

1. Integrar primero la rama base `feat/consultorio-self-serve`. Aplicar después `20261120014059_brand_presence_pilot.sql` al proyecto Supabase de Orkéstalo. El bucket `clinic-brand` queda privado, limitado a 2 MB por archivo. No añadir políticas públicas de Storage ni de las nuevas tablas.
2. Asignar explícitamente una membresía `clinic_memberships` con `role='admin'` a una cuenta verificada de Orkesta en **cada** consultorio que administrará. Las membresías existentes conservan `role='doctor'`. La API exige membresía activa y comprueba el rol en cada operación.
3. Cargar al menos una versión por consultorio. Describir usos, licencia y restricciones. Si la licencia impide redistribuir una fuente o archivo comercial, elegir **Solo referencia** y no subir el archivo. La doctora aprueba cada borrador; la versión aprobada anterior sigue disponible hasta entonces.
4. Documentar enlaces oficiales, checklist, evidencia, fecha y próxima acción en la ficha. Pedir a cada doctora que la revise en el panel. El piloto solo puede iniciarse cuando hay material aprobado y la ficha fue revisada por la doctora.
5. Vincular manualmente cada consultorio a su sitio de medición. La API exige que el sitio esté activo y que su origen autorizado coincida con el origen del sitio configurado en el consultorio. Hasta verificarlo, **Mis resultados** muestra «Sin datos verificados». El reporte interno de sitios no se expone al panel.

Las descargas se autorizan por versión y consultorio. El servidor emite una URL firmada de cinco minutos. Una URL emitida puede continuar funcionando hasta vencer aunque la persona cierre sesión; el cierre de sesión impide emitir URLs nuevas.

Cada movimiento de solicitud deja una fila de historial. El aviso a Orkesta o a la doctora tiene estado propio; si Resend falla, el cron existente de consultorios lo reintenta con una clave de idempotencia ligada al movimiento. La solicitud permanece visible durante el fallo.

## Aceptación antes de integrar en main

Probar con cuenta administradora, Ana, Fernanda, una cuenta sin membresía y una sesión vencida:

- Biblioteca: borrador propio visible solo en el consultorio correspondiente, aprobación solo por la doctora, descarga de versión aprobada y bloqueo de borrador/archivo ajeno. Comprobar caducidad de URL firmada a los cinco minutos.
- Presencia: edición solo por Orkesta, revisión por la doctora, evidencia y próxima acción visibles. Confirmar que la revisión de un consultorio no altera el otro.
- Solicitudes: creación, avisos, responsable, cuatro estados en orden e historial con fecha y actor. Probar acceso cruzado y que una cuenta sin membresía no pueda leer ni cambiar solicitudes.
- Resultados: vincular sitios correctos e intentar vincular el de la otra doctora. Comparar visitas, clics, formularios, solicitudes de reserva y citas confirmadas con la fuente para un periodo conocido. Probar el estado sin datos verificados.
- Sesión vencida: todas las peticiones privadas devuelven 401; ninguna genera nuevas URL de descarga.

Registrar en el scorecard las horas de **alta** y las de **soporte recurrente** por separado, solicitudes recibidas/completadas, uso real, tareas que dejaron de coordinar por otros canales y costo de atención. Al día 30, presentar una propuesta con alcance y precio concretos y registrar si cada doctora la contrataría a ese precio. Documentar dos bibliotecas aprobadas, dos fichas revisadas y ausencia de atribución cruzada. Antes de lanzar una suscripción general, repetir la validación con al menos un consultorio sin relación comercial previa.

Publicar solo mediante commit, push, PR hacia `main`, integración y despliegue automático de Vercel. Verificar el despliegue producido por Git.
