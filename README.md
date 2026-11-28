# Orkesta

Para revisar una rama en local:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000/](http://localhost:3000/).

El comando usa Vercel CLI para aplicar las rutas, redirecciones y el middleware de `vercel.json`. Instala la CLI con `npm i -g vercel@latest` y vincula el proyecto localmente si aún no lo está. Reinicia el servidor después de cambiar de rama. Para comprobar la compilación y las pruebas, ejecuta `npm test`.

## Formularios y pedidos anteriores

Las funciones en `api/` usan las variables privadas de `.env.example`. Configúralas en Vercel para el proyecto Orkestalo; nunca uses el prefijo `NEXT_PUBLIC_`. `SUPABASE_SECRET_KEY` debe ser la clave secreta del proyecto Orkestalo y permanecer en el servidor. Las tablas `inquiries` y `orders` se consultan en Supabase Studio; los roles del navegador no tienen acceso.

La compra de Buen Fin 2026 terminó. No se crean pedidos nuevos. La página `/pedido/` y `/api/order-status` siguen consultando el estado de pedidos anteriores a Mercado Pago. El webhook `/api/mercado-pago-webhook` y la tarea diaria de avisos también siguen activos. Para ellos se conservan `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `RESEND_API_KEY` y `ORKESTA_EMAIL_FROM` en las variables privadas de Vercel. El dominio `orkestalo.com` está verificado en Resend y los avisos llegan a `info@orkestalo.com`.

La copia interna de los [términos aceptados durante la campaña](docs/archivo/terminos-buen-fin-2026.html) está versionada para consulta. Su URL pública anterior y la página de campaña responden 410.

Configura `CRON_SECRET` como valor aleatorio privado en Vercel. La tarea diaria de `vercel.json` reintenta los avisos de correo pendientes; no reenvía los que ya tienen `email_sent_at`. Las notificaciones de pago también se reintentan por webhook de Mercado Pago. Revisa las tablas `inquiries` y `orders` en Supabase Studio si un aviso sigue pendiente. La casilla opcional de propuestas futuras solo registra consentimiento; no dispara campañas. El trabajo posterior está en [docs/comunicaciones-futuras.md](docs/comunicaciones-futuras.md).

## Seguimiento

Las comprobaciones pendientes de reserva, pago y capturas de Ana están en [docs/seguimiento-medicion.md](docs/seguimiento-medicion.md).

CAMI se registra como `engranes-cami` con el origen exacto `https://www.engranescami.com`, 90 días de retención y captura inactiva. El panel `/medicion/` permite a Orkéstalo invitar y revocar correos para consultar solo CAMI; cada consulta verifica de nuevo el correo, la invitación y el segundo factor, y filtra los datos en el servidor. Las invitaciones se habilitan cuando el registro está activo y su aviso de privacidad está aprobado. Los indicadores «borradores preparados» y «clics para abrir» expresan pasos del sitio, no solicitudes recibidas. El histórico anterior sigue en Vercel Analytics para quienes ya tienen acceso al proyecto.

La activación queda pendiente de nombre legal, domicilio y correo de CAMI para el aviso, validación del dominio y revisión del aviso publicado. Después se activa el registro de base de datos y la variable pública de CAMI, se verifica la captura consentida y se invita el correo designado. Google Ads y Search Console permanecen pendientes de conexión autorizada.

## Piloto de consultorios

El panel privado, las integraciones y la activación por clínica están documentados en [docs/consultorios-piloto.md](docs/consultorios-piloto.md). Hasta configurar las credenciales, conectar Cal.com y aprobar textos y avisos con las doctoras, el panel queda inactivo para pacientes reales.

La biblioteca de marca, ficha de presencia, solicitudes, resultados verificados y scorecard del piloto están descritos en [docs/brand-presence-pilot.md](docs/brand-presence-pilot.md).
