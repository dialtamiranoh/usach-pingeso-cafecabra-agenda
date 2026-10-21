# Infraestructura propuesta para Café Cabra

Estado: estructura base reorganizada localmente en frontend, backend y shared con npm workspaces. El esquema y Better Auth del equipo se integraron el 21 de octubre de 2026; ver integracion-esquema.md. Las pantallas continúan utilizando datos de ejemplo.

## Selección tecnológica propuesta

Mantener un repositorio GitHub con dos paquetes independientes, administrados mediante npm workspaces, y un paquete pequeño para contratos compartidos.

| Parte | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, React Router y Tailwind CSS | Interfaz y navegación |
| Backend | TypeScript y Hono en Cloudflare Workers | API HTTP y lógica de aplicación |
| Herramientas | Node.js en una versión LTS compatible, npm y Wrangler | Instalación, desarrollo, compilación y despliegue |
| Persistencia | D1 y Drizzle ORM | Acceso a D1 y esquema Drizzle del equipo |
| Almacenamiento | R2 | Archivos privados; separación por ambiente pendiente |
| Correo | Resend; recepción pendiente de decisión | Integración encapsulada en el backend |
| Entrega | GitHub Actions y Workers Static Assets | Validar, compilar y publicar |

Esta propuesta reemplaza vinext para obtener un frontend React independiente y una API explícita. El documento tecnológico entregado selecciona React, TypeScript, vinext, Workers, Drizzle y D1; por tanto, Vite como base del frontend y Hono para la API son cambios propuestos, no decisiones ya aprobadas por todo el equipo.

Workers es el runtime de producción. Node.js se utiliza para las herramientas y las APIs compatibles que necesite el código; no se debe describir este despliegue como un proceso Node persistente. Express también puede adaptarse a Workers mediante la integración HTTP documentada por Cloudflare. Se recomienda Hono por su integración directa con el runtime y los bindings. Si el equipo exige un servidor Node convencional, habrá que reconsiderar alojamiento y acceso a D1.

## Carpetas objetivo

```text
frontend/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  public/
  src/
    main.tsx
    App.tsx
    routes/                  # Navegación
    pages/                   # Pantallas
    components/              # UI reutilizable y layouts
    features/                # Componentes y hooks por funcionalidad
    services/                # Cliente HTTP; acceso a /api
    styles/
  tests/
backend/
  package.json
  wrangler.jsonc             # Worker y recursos por ambiente
  tsconfig.json
  drizzle.config.ts
  worker-configuration.d.ts  # Generado desde Wrangler
  src/
    index.ts                 # Entrada del Worker y montaje de rutas
    routes/                  # Adaptadores HTTP
    middleware/              # Autorización, validación y errores
    modules/                 # Servicios y repositorios por funcionalidad
    integrations/
      email/
      storage/
    db/
      client.ts
      schema.ts              # Modelo Drizzle del equipo
    config/                  # Acceso tipado a bindings/configuración
  migrations/                # SQL y snapshots originales del equipo
  tests/
shared/
  package.json
  src/
    contracts/               # Tipos de solicitudes/respuestas, a definir
    validation/              # Validaciones aptas para cliente y servidor
    index.ts
 docs/                       # Arquitectura y procedimientos del equipo
.github/workflows/
package.json                 # Workspaces y comandos del conjunto
package-lock.json            # Un lockfile compartido
.gitignore
```

`frontend`, `backend` y `shared` tienen dependencias y configuración propias. El paquete raíz coordina los comandos. `shared` no contiene consultas, secretos, SDK de Cloudflare ni lógica privada. El frontend nunca importa módulos internos del backend.

El backend organiza cada funcionalidad en rutas HTTP, servicios y repositorios. Las rutas traducen HTTP; los servicios ejecutan casos de uso; los repositorios encapsulan D1/Drizzle. Las rutas de salud y autenticación están integradas; los módulos de negocio se implementarán sobre el esquema del equipo.

## Publicación y comunicación

Separar carpetas no exige separar despliegues. Se propone un Worker por ambiente que ejecuta el backend y sirve el resultado estático de `frontend/dist` mediante Workers Static Assets.

```text
Navegador → dominio de agenda
              ├─ páginas y assets → frontend React compilado
              └─ /api/*          → backend Worker → D1 / R2 / correo
```

El frontend llama a rutas relativas `/api`. Configurar el Worker para ejecutar primero las rutas `/api/*` y servir la SPA para rutas de páginas. Una API inexistente debe responder un error HTTP de API, no el HTML de React. Este esquema mantiene el mismo origen y evita configurar CORS entre dominios de frontend y backend.

En local, Vite sirve el frontend y Wrangler ejecuta el backend con D1/R2 locales. Vite debe reenviar `/api` al puerto local de Wrangler. Los dos procesos se coordinan mediante un comando raíz durante la futura implementación.

Si más adelante necesitan despliegues independientes, se puede publicar el frontend y la API por separado. Eso exigiría acordar dominios, CORS, cookies y configuración del cliente HTTP; no es necesario para la separación de carpetas solicitada.

## Ambientes y entrega

| Ambiente | Rama o contexto | Recursos |
| --- | --- | --- |
| Local | Rama de trabajo | D1/R2 locales y correo de prueba |
| Desarrollo compartido | `dev`, ambiente Wrangler `staging` | Worker `-dev`, D1 dev, R2 dev y secretos propios |
| Producción | `main`, configuración de producción | Worker principal, D1 prod, R2 prod y secretos propios |

Mantener los nombres de Worker y D1 existentes durante la transición. Mantener el mismo nombre de binding por recurso en todos los ambientes. El repositorio actual comparte el bucket R2 entre dev y producción; su separación es una tarea pendiente.

GitHub Actions debe instalar con `npm ci`, validar tipos de ambos paquetes, compilar el frontend y validar el backend. Las PR validan; los cambios integrados en `dev` despliegan a staging y los de `main` a producción. El despliegue debe usar explícitamente `backend/wrangler.jsonc`, el ambiente correspondiente y el directorio de assets correcto. Desde la integración del 21 de octubre, el workflow conserva la aplicación automática de migraciones por ambiente que aportó el compañero; el trabajo diario utiliza migraciones locales.

Los secretos de correo y webhooks pertenecen al backend y al ambiente correspondiente. Las variables públicas de Vite nunca deben contener credenciales. Mantener un lockfile raíz y versiones verificadas; documentar npm como gestor único.

## Lectura de los diagramas entregados

El diagrama general representa ramas `dev`/`main`, Workers y D1 por ambiente, además de un proxy de agenda en otra cuenta Cloudflare. La propuesta conserva esa separación de ambientes. El proxy y el dominio de agenda deben verificarse con sus responsables antes de cambiar el destino; el diagrama no demuestra su configuración actual.

Los diagramas de pagos presentan dos alternativas distintas:

- Resend Inbound recibe el correo y envía un webhook con un identificador; el backend consulta el contenido en Resend.
- Cloudflare Email Routing entrega el correo mediante una integración hacia el endpoint HTTP existente, con contenido RFC822.

No se combinan ni se seleccionan ahora. El segundo camino se aproxima al código HTTP presente en el repositorio, pero el handler de Email Routing o puente que hace el POST no aparece en los archivos revisados. Las rutas propuestas en los diagramas también difieren. Mantener la recepción en un adaptador `integrations/email` permite decidir ese mecanismo después sin mezclarlo con la organización general.

## Transición prevista

1. Crear paquetes y configuración básica de workspaces, React/Vite y backend Workers.
2. Migrar la integración HTTP de correo existente, adaptando sus dependencias de vinext al framework elegido y preservando el contrato hasta acordar el proveedor.
3. Mover configuración D1/R2 y generación de tipos al backend, conservando identificadores de recursos.
4. Ajustar build, assets, proxy local y GitHub Actions; verificar aislamiento de staging.
5. Validar rutas SPA, errores de API, compilación y funcionamiento local antes de publicar cambios.

La separación de paquetes, el traslado del endpoint de correo y la configuración local/CI ya se implementaron. El esquema y las migraciones ya están integrados. La conexión de las pantallas de ejemplo con operaciones reales, el aislamiento de R2 y los permisos administrativos siguen pendientes; ver integracion-esquema.md.

## Fuentes

Documento del equipo: CafeCabra_Seleccion_Tecnologica.docx. Diagramas: Sistema_Arquitectura.png, Pagos_Arquitectura.png, Pagos_Actividades.png y Pagos_Secuencia.png. Se utilizan como antecedentes de diseño, no como instrucciones de ejecución.

- Hono en Workers: https://hono.dev/docs/getting-started/cloudflare-workers
- Compatibilidad Node.js: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Express en Workers: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- Enrutamiento de assets: https://developers.cloudflare.com/workers/static-assets/routing/advanced/
