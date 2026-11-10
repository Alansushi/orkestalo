# Orkesta

Para revisar una rama en local:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000/](http://localhost:3000/). La página de Buen Fin de esta rama está en [http://localhost:3000/buen-fin-2026/](http://localhost:3000/buen-fin-2026/).

El comando usa Vercel CLI para aplicar las rutas, redirecciones y el middleware de `vercel.json`. Instala la CLI con `npm i -g vercel@latest` y vincula el proyecto localmente si aún no lo está. Reinicia el servidor después de cambiar de rama. Para comprobar la compilación y las pruebas, ejecuta `npm test`.

## Formularios y compra de Buen Fin

Las rutas de servidor en `api/` usan las variables privadas de `.env.example`. Configúralas en Vercel para el proyecto Orkestalo; nunca uses el prefijo `NEXT_PUBLIC_`. `SUPABASE_SECRET_KEY` debe ser la clave `sb_secret_…` del proyecto nuevo y permanecer como variable secreta de servidor. Las migraciones de `supabase/migrations/`, incluida la de consentimiento comercial, están aplicadas al proyecto Supabase `ydgoutyckylbqtpyproy`. Las tablas se consultan en Supabase Studio; los roles del navegador no tienen acceso.

La cuenta vendedora de Mercado Pago es la de Alan. Configura Checkout Pro mediante Orders API con el webhook del evento Order en `https://www.orkestalo.com/api/mercado-pago-webhook`. Alan coloca directamente en Vercel el access token de esa aplicación como `MERCADO_PAGO_ACCESS_TOKEN` y su firma de webhook como `MERCADO_PAGO_WEBHOOK_SECRET`, ambas de tipo Secret. Valida el cupón `BFINMP` en una sesión elegible real de Checkout Pro antes de publicar. El dominio `orkestalo.com` está verificado en Resend; usa una clave con permiso Sending access limitada a ese dominio como `RESEND_API_KEY`. `ORKESTA_EMAIL_FROM` es `Orkesta <avisos@orkestalo.com>` y los avisos llegan a `info@orkestalo.com`.

La campaña acepta pedidos nuevos del 13 de noviembre a las 00:00 hasta el 17 a las 23:59:59, hora de Ciudad de México. Primero guarda el pedido y bloquea Checkout Pro si Supabase o la configuración no responden. La página de estado consulta a Mercado Pago desde el servidor; el regreso del checkout por sí solo no confirma el pago. La oferta puede publicarse con WhatsApp mientras `ORKESTA_CHECKOUT_ENABLED=0`. Solo cambia el indicador a `1` después de verificar integralmente el checkout y el webhook en un entorno de prueba; el servidor seguirá restringiendo las fechas.

Configura `CRON_SECRET` como valor aleatorio privado en Vercel. La tarea diaria de `vercel.json` reintenta los avisos de correo pendientes; no reenvía los que ya tienen `email_sent_at`. Las notificaciones de pago también se reintentan por webhook de Mercado Pago. Revisa las tablas `inquiries` y `orders` en Supabase Studio si un aviso sigue pendiente. La casilla opcional de propuestas futuras solo registra consentimiento; no dispara campañas. El trabajo posterior está en [docs/comunicaciones-futuras.md](docs/comunicaciones-futuras.md).
