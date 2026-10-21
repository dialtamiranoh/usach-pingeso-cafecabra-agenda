# Café Cabra — Agenda

Repositorio con frontend React/Vite y backend Hono/Cloudflare Workers separados mediante npm workspaces. Modelo de datos pendiente de la reunión del equipo.

## Carpetas

- `frontend/`: interfaz React, estilos y recursos públicos.
- `backend/`: API, integración de correo, configuración Cloudflare y acceso a datos.
- `shared/`: contratos públicos compartidos.
- `docs/`: decisiones y procedimientos.

## Desarrollo

Usar Node.js 22.16 o posterior compatible con las dependencias y npm.

```sh
npm ci
npm run build
npm run dev
```

Vite muestra su dirección local (normalmente http://localhost:5173). Wrangler ejecuta la API en http://localhost:8787. Vite reenvía `/api` al backend. `GET /api/health` verifica la conexión. El frontend implementa catálogo, detalle de actividad, agenda e inscripción de demostración. React Router conecta las vistas; el encabezado y pie se comparten desde SiteLayout. Los datos temporales están en frontend/src/features/catalog/catalog-data.ts y frontend/src/features/booking/booking-data.ts; las fotografías son provisionales y el logo oficial está en frontend/public/images/. El formulario valida y muestra una revisión, pero no registra reservas ni envía correos. No hay conexión de estas vistas a D1.

También se pueden ejecutar `npm run dev:frontend` y `npm run dev:backend` en terminales separadas. `npm run typecheck` valida ambos paquetes. `npm run build` compila React y empaqueta el Worker con un dry-run, sin publicar.

Con `npm run dev`, detener ambos servidores con **Ctrl+C** o **Q** en la terminal. El iniciador controla el teclado y cierra los procesos de frontend y backend juntos.

Para probar el correo, crear `backend/.dev.vars` con `RESEND_API_KEY`, usando una clave de prueba. El endpoint `POST /api/email/pagos` conserva el contrato RFC822 existente; sin clave responde 503. Esa integración puede enviar correos reales si se configura una clave real. Su autenticación y proveedor de recepción siguen pendientes de revisión.

## Cloudflare

`backend/wrangler.jsonc` conserva los nombres de Worker y los identificadores D1 existentes. El Worker sirve `frontend/dist`; `/api` y `/api/*` se ejecutan primero en el backend. Las rutas de páginas usan fallback de SPA.

- `npm run deploy:dev`: compila y publica al ambiente `staging`.
- `npm run deploy:prod`: compila y publica a producción.
- `npm run cf-typegen --workspace backend`: actualiza tipos desde Wrangler.

GitHub Actions valida PR a `dev` y `main`; los pushes a esas ramas despliegan sus respectivos ambientes. Las credenciales deben existir como secretos de GitHub/Cloudflare. El workflow conserva el secreto de correo existente; separar sus valores por ambiente requiere configurar los secretos del equipo. Dev y producción aún comparten el bucket R2 heredado: separar antes de trabajar con comprobantes reales.

Drizzle solo genera migraciones locales mediante `npm run db:generate --workspace backend`; el esquema está pendiente. No se configuró conexión directa de Drizzle a producción ni se ejecutaron migraciones.

La organización detallada está en `docs/arquitectura.md`.

## Recorrido de demostración

Desde el catálogo, elegir una actividad, abrir disponibilidad, seleccionar un día marcado y un horario, y continuar a inscripción. Las fechas de ejemplo son de octubre y noviembre de 2026. Los horarios sin cupos no son seleccionables.

Las rutas son /cursos/:courseId, /cursos/:courseId/agenda y /cursos/:courseId/inscripcion?sesion=:sessionId. La inscripción requiere una sesión válida de esa actividad. El estado del formulario se conserva en memoria al volver a la agenda; recargar la página borra los datos personales. No se utiliza localStorage ni se transmiten datos al backend.
