# Cursos reales para pruebas locales

La carga usa el esquema existente, sin crear tablas ni modificar Cloudflare. Se asumió noviembre de **2026**, consistente con los sábados indicados.

Desde la raíz del repositorio:

```sh
npm run db:migrate:local --workspace backend
npm run db:seed:local --workspace backend
npm run db:courses:local --workspace backend
```

El archivo `backend/seeds/cursos-ejemplo.sql` inserta el tipo Curso, la ubicación Café Cabra, dos docentes, tres eventos y cuatro fechas. El intensivo es un único evento con dos jornadas; los cuatro cupos corresponden al curso completo.

| Curso | Precio CLP | Fechas | Cupos | Estado de prueba |
| --- | --- | --- | --- | --- |
| Master Class de Latte Art | 65.000 | 14/11/2026 | Por confirmar | BORRADOR |
| Barista Integral Intensivo | 220.000 | 07 y 08/11/2026, 09:00–15:30 | 4 | ABIERTO |
| Latte Art Personalizado | 150.000 | 21/11/2026 | 4 | BORRADOR |

Los estados son decisiones para la prueba local, no estados comerciales confirmados. Faltan horario y cupo de la Master Class, y horario y duración del personalizado. La Master Class también tiene el certificado pendiente de confirmar; el campo booleano queda en falso, sin prometerlo, y su descripción señala que está pendiente. No se inventaron direcciones ni opciones alimentarias. Se reutilizan las fotos provisionales anteriores de Latte Art y preparación de café; no son fotos oficiales.

La carga puede repetirse: comprueba los nombres y relaciones existentes antes de insertar. No actualiza registros ya presentes; editar el SQL y ejecutarlo otra vez no cambia cursos cargados anteriormente. Los cambios posteriores requieren una actualización explícita.

El listado devuelve cuatro filas porque el intensivo tiene dos fechas. Incluye una comprobación de claves foráneas: un resultado vacío de `foreign_key_check` significa que no detectó referencias inválidas.

El catálogo de React consulta `GET /api/catalogo`. En local muestra los tres cursos en el inicio, con los borradores señalados como próximos y sin permitir su inscripción. En remoto mantiene el filtro de eventos abiertos. Se retiraron la vista de gestión y su API; la gestión del administrador se desarrollará más adelante. Una inscripción al intensivo incluye ambas jornadas; su formulario todavía no guarda reservas.

## Evento ficticio adicional

`npm run db:seed:event:local --workspace backend` agrega solamente una cata de ejemplo de tipo Evento, sin volver a cargar los cursos. Nombre: Cata de café de especialidad · Evento de ejemplo. Datos ficticios: 28/11/2026, 16:00–18:00, 12 cupos, entrada liberada. La tarjeta usa la foto provisional de preparación de café y el botón Ver evento. No se inventó un docente real para la actividad.

Los cursos pueden haberse editado manualmente en SQLite; no repetir su carga para agregar eventos. La carga de cursos reconoce también los nombres abreviados actuales, pero no es un mecanismo general de actualización ni identifica renombres arbitrarios.

## Fechas alternativas y jornadas conjuntas

Por defecto cada registro de fechas es una alternativa independiente. La Master Class permite elegir el 14 o el 21 por separado; el resumen y el formulario conservan únicamente la fecha seleccionada.

Para el intensivo de Barista se configura explícitamente `CONJUNTAS` en la tabla existente `configuracion`, clave `evento:<id>:modalidad_fechas`. Ejecutar `npm run db:dates:local --workspace backend` después de la carga inicial de cursos para registrar esa configuración sin sobrescribirla ni volver a insertar cursos. La API entrega `dateMode`; no se deduce la modalidad a partir del número de fechas ni del nombre en el frontend.

`node scripts/check-date-selection.mjs` verifica ambas alternativas de la Master Class, la selección conjunta del intensivo y el resumen antes de elegir una fecha. Requiere los servidores locales en ejecución y estas fechas de prueba.

La inscripción de cursos de pago sigue siendo una demostración. La persistencia de reservas por edición y los cupos independientes por edición deben resolverse al conectar esos cursos al backend; el esquema actual de reservas solo referencia el evento, no una fecha.
