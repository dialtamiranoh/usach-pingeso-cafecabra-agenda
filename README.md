# Café Cabra — Agenda

Repositorio con frontend React/Vite y backend Hono/Cloudflare Workers separados mediante npm workspaces.

## Carpetas

- `frontend/`: pantallas React, navegación, estilos, logo oficial y cliente Better Auth.
- `backend/`: API, Better Auth, correos, configuración Cloudflare y acceso a D1.
- `backend/src/db/schema.ts`: esquema Drizzle aportado por el equipo.
- `backend/migrations/`: las dos migraciones originales y sus snapshots, trasladados sin modificar SQL.
- `shared/`: contratos públicos de cliente y servidor.
- `docs/`: arquitectura y procedimiento de integración.

## Desarrollo local

Utilizar Node.js 22 y npm. Desde la raíz:

```sh
npm ci
npm run db:migrate:local --workspace backend
npm run dev
```

La migración crea las tablas en D1 **local**. No copia los datos remotos de Cloudflare. Vite muestra la interfaz en http://localhost:5173 y reenvía `/api` al Worker en http://localhost:8787. `npm run dev:frontend` y `npm run dev:backend` permiten ejecutarlos por separado. Para detener el iniciador conjunto, presionar Ctrl+C o Q en su terminal.

`GET /api/health` verifica las tablas y el marcador `entorno` de D1. `environment` identifica el ambiente de configuración (`local`, `staging`, `production`); `entorno` identifica el marcador almacenado en la base y puede ser null en local. Devuelve 503 si no puede consultar el esquema.

El frontend contiene catálogo, detalle, calendario e inscripción. Consulta las actividades en D1 local mediante la API y permite guardar inscripciones gratuitas. Las actividades con pago siguen en modo de demostración.

## Autenticación y correo

La autenticación original se adaptó a `backend/src/auth/index.ts` y `/api/auth/*`, conservando la configuración de registro, sesiones y rate limiting de Better Auth. El cliente está en `frontend/src/services/auth-client.ts`; aún no hay pantallas de login ni permisos del panel implementados.

Para probar autenticación, crear `backend/.dev.vars` a partir de `.dev.vars.example` si no existe y configurar `BETTER_AUTH_SECRET` con un valor local aleatorio. Generar uno con:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No versionar ni compartir ese archivo. Sin secreto, la API de autenticación devuelve 503. El origen local configurado es http://localhost:5173. En remoto, cada ambiente tiene su propia URL y lista de orígenes en Wrangler.

La ruta `POST /api/email/pagos` conserva el procesamiento RFC822 y las plantillas del equipo. Sin `RESEND_API_KEY` responde 503. No utilizar una clave real para pruebas que puedan enviar correos a terceros.

## Validación y esquema

```sh
npm run typecheck
npm run build
npm run db:generate --workspace backend
```

La compilación genera `frontend/dist` y empaqueta el backend con un dry-run de staging, sin publicar. Drizzle genera SQL local y no contiene credenciales remotas. Para aplicar las migraciones pendientes en Cloudflare existen comandos explícitos:

- `npm run db:list:dev --workspace backend`: consulta migraciones de desarrollo.
- `npm run db:migrate:dev --workspace backend`: aplica a D1 de desarrollo.
- `npm run db:migrate:prod --workspace backend`: aplica a D1 de producción.

No utilizar los comandos remotos durante el trabajo diario. Wrangler mantiene el historial de migraciones en `d1_migrations`.

## Ambientes y GitHub Actions

La configuración única es `backend/wrangler.jsonc`:

| Ambiente | Worker | D1 |
| --- | --- | --- |
| Local | ejecución local (`env local`) | emulación local de la base dev |
| Desarrollo | `usach-pingeso-cafecabra-agenda-dev` (`env staging`) | `cafe-cabra-agenda-db-dev` |
| Producción | `usach-pingeso-cafecabra-agenda` (raíz) | `cafe-cabra-agenda-db` |

El Worker sirve los assets de React y ejecuta `/api` primero. Se conservan los nombres e IDs remotos existentes. El bucket `cafecabra-pagos` todavía es compartido por dev y producción: su separación sigue pendiente.

Las PR a `dev`/`main` instalan, validan tipos y compilan. Un push a `dev` aplica migraciones pendientes y despliega **solo desarrollo**; un push a `main` hace lo mismo en producción. Se conserva el comportamiento de migraciones del workflow aportado por el compañero, adaptado a workspaces y a la configuración explícita de cada ambiente. La concurrencia serializa ejecuciones por rama.

Se requieren los secretos de GitHub `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `RESEND_API_KEY` y `BETTER_AUTH_SECRET`. El workflow conserva los secretos del repositorio que usaba el equipo; separar sus valores por ambiente es una mejora pendiente. Los secretos no están dentro de los archivos versionados.

`npm run deploy:dev` y `npm run deploy:prod` compilan y publican, pero no aplican migraciones automáticamente fuera de CI.

El formulario también incluye preferencias alimentarias, alergias, Instagram y datos declarados de quien transferirá en actividades de pago. Los eventos gratuitos permiten persistencia local; los de pago siguen en demostración. Ver docs/formulario-inscripcion.md para validaciones y campos pendientes de acordar en D1.

## Cursos de ejemplo en D1 local

Después de aplicar las migraciones locales, ejecutar `npm run db:seed:local --workspace backend` para cargar los tres cursos reales de noviembre de 2026. Consultarlos con `npm run db:courses:local --workspace backend`. Estos comandos solo utilizan D1 local y no publican cambios. Ver `docs/cursos-ejemplo.md` para fechas, estados y datos pendientes. El catálogo del frontend consulta estos datos mediante la API.

### Consulta desde la aplicación

El catálogo ya consulta D1 mediante `GET /api/catalogo`; muestra eventos abiertos cuyo tipo y ubicación están activos y cuyo cierre de inscripción no ha vencido. Incluye las jornadas, docentes, precio y cupos restantes del evento completo. En local también previsualiza los borradores como próximos cursos, sin habilitar su inscripción. La carga agrega las fotografías provisionales usadas anteriormente; los cursos sin imagen muestran un bloque de marca. Hay estados de carga, error con reintento y catálogo vacío.

Con `npm run dev`, visitar `http://localhost:5173/` para ver los tres cursos en el inicio. Se retiró el listado de gestión y su API; la ruta antigua `/gestion/cursos` redirige al catálogo. La gestión del administrador queda para una etapa posterior.

Con ambos servidores en ejecución y la carga local original sin reservas, `node scripts/check-catalog.mjs` verifica el recorrido frontend → API → D1 y que el intensivo tenga dos jornadas dentro de un solo evento. El formulario gratuito guarda al confirmar; el formulario de pago mantiene los datos en memoria. No se envían correos. No se modificó el esquema para esta consulta.

## Inscripción gratuita local

El evento de ejemplo ya permite guardar una inscripción confirmada con código en D1 local mediante `POST /api/inscripciones`. Incluye revisión previa, validación de cupos y prevención de duplicados. No envía correos. Los cursos con pago siguen en modo de demostración. Los campos adicionales se conservan provisionalmente en `reservas.observaciones` como JSON, sin cambios de esquema. Ver `docs/inscripcion-gratuita.md` para el flujo, consultas y pruebas (`node scripts/check-enrollments.mjs`).

## Revisión compartida en dev

El avance se publica en `dev` con GitHub Actions: aplica migraciones, carga `backend/seeds/catalogo-dev.sql` y despliega solo el Worker de desarrollo. La carga no sobrescribe registros existentes ni copia reservas locales. La inscripción gratuita está habilitada en local y staging; producción conserva la escritura deshabilitada. Ver `docs/pruebas-desarrollo.md` para la URL y el flujo de prueba. `node scripts/check-dev-seed.mjs` valida la carga en una D1 temporal.
