# Orkesta

Para revisar una rama en local:

```bash
npm ci
npm run dev
```

Abre [http://localhost:3000/](http://localhost:3000/). La página de Buen Fin de esta rama está en [http://localhost:3000/buen-fin-2026/](http://localhost:3000/buen-fin-2026/).

El comando usa Vercel CLI para aplicar las rutas, redirecciones y el middleware de `vercel.json`. Instala la CLI con `npm i -g vercel@latest` y vincula el proyecto localmente si aún no lo está. Reinicia el servidor después de cambiar de rama. Para comprobar la compilación y las pruebas, ejecuta `npm test`.
