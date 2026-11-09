# Orkesta

Para revisar una rama en local:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000/](http://localhost:3000/). La página de Buen Fin de esta rama está en [http://localhost:3000/buen-fin-2026/](http://localhost:3000/buen-fin-2026/).

El comando usa Vercel CLI para aplicar las rutas, redirecciones y el middleware de `vercel.json`. Instala la CLI con `npm i -g vercel@latest` y vincula el proyecto localmente si aún no lo está. Reinicia el servidor después de cambiar de rama. Para comprobar la compilación y las pruebas, ejecuta `npm test`.

## Formularios y compra de Buen Fin

Las rutas de servidor en `api/` usan las variables privadas de `.env.example`. Configúralas en Vercel para el proyecto Orkestalo; nunca uses el prefijo `NEXT_PUBLIC_`. Aplica `supabase/migrations/20261109171839_initial_commerce.sql` solo al nuevo proyecto de Orkestalo. Las tablas se consultan en Supabase Studio; los roles del navegador no tienen acceso.

Configura Checkout Pro de Mercado Pago mediante Orders API con el webhook del evento Order en `https://www.orkestalo.com/api/mercado-pago-webhook`. Usa la firma secreta de esa aplicación. Valida el cupón `BFINMP` en una sesión elegible real de Checkout Pro antes de publicar. Verifica el dominio de envío en Resend y configura `ORKESTA_EMAIL_FROM` con una dirección de ese dominio; los avisos llegan a `info@orkestalo.com`.

La campaña acepta pedidos nuevos del 13 de noviembre a las 00:00 hasta el 17 a las 23:59:59, hora de Ciudad de México. Primero guarda el pedido y bloquea Checkout Pro si Supabase o la configuración no responden. La página de estado consulta a Mercado Pago desde el servidor; el regreso del checkout por sí solo no confirma el pago. `ORKESTA_CHECKOUT_ENABLED` permanece en `0` hasta aprobar términos, aviso de privacidad y cupón; cámbiala a `1` antes de integrar el PR a `main`.

Configura `CRON_SECRET` como valor aleatorio privado en Vercel. La tarea diaria de `vercel.json` reintenta los avisos de correo pendientes; no reenvía los que ya tienen `email_sent_at`. Las notificaciones de pago también se reintentan por webhook de Mercado Pago. Revisa las tablas `inquiries` y `orders` en Supabase Studio si un aviso sigue pendiente.
