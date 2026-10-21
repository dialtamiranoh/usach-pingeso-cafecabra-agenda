# Integración del esquema y las pantallas

Fecha: 21 de octubre de 2026.

Se combinaron los commits de `origin/dev` hasta `338728e` con la separación de frontend/backend y las pantallas locales, preservando el historial mediante un merge.

## Ubicación de los aportes del compañero

| Ruta original | Ruta actual |
| --- | --- |
| `src/db/schema.ts` | `backend/src/db/schema.ts` |
| `src/db/index.ts` | `backend/src/db/index.ts` |
| `migrations/` | `backend/migrations/` |
| `src/lib/auth.ts` | `backend/src/auth/index.ts` |
| `src/lib/auth-client.ts` | `frontend/src/services/auth-client.ts` |
| `app/api/auth/[...all]/route.ts` | montaje de `/api/auth/*` en `backend/src/index.ts` |
| `app/api/health/route.ts` | `backend/src/routes/health.ts` y montaje en el Worker |
| `wrangler.jsonc` y `wrangler.dev.jsonc` | `backend/wrangler.jsonc`, con root producción, `staging` desarrollo y `local` |

Las tablas, índices, referencias, SQL y snapshots originales se conservan. Drizzle confirmó que no hay diferencias entre el esquema y las migraciones existentes.

El acceso D1 se obtiene desde el binding de cada petición para respetar el ambiente en ejecución. Better Auth se monta directamente sobre Hono sin el adaptador Next.js. Se conservan las opciones de autenticación aportadas por el compañero. `sharp` y el ajuste de Vite de vinext no se incorporan porque no hay código que los utilice en la arquitectura React/Vite + Hono.

## Validación local

- Aplicación de ambas migraciones en D1 local.
- Verificación de las 17 tablas del esquema y el historial `d1_migrations` mediante `/api/health`.
- Better Auth: sesión anónima, alta de cuenta ficticia, consulta de sesión y cierre de sesión sobre D1 local.
- Respuesta 503 de autenticación sin configurar secreto.
- TypeScript y compilación de frontend/Worker.

No se importaron ni modificaron datos de las bases remotas durante estas pruebas. El push a `dev` activará las migraciones y el despliegue de desarrollo definidos en GitHub Actions.

## Trabajo posterior

El esquema ya puede utilizarse como base de desarrollo. El catálogo y el formulario siguen siendo demostraciones: falta implementar las operaciones de eventos/reservas, conectar esas pantallas a la API, implementar autenticación visual y definir permisos de administración con el equipo. También siguen pendientes el aislamiento de R2 y los secretos por ambiente.

Referencias de la adaptación: https://better-auth.com/docs/integrations/hono y https://developers.cloudflare.com/d1/reference/migrations/.
