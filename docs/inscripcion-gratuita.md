# Inscripción gratuita en D1 local

La cata de ejemplo permite completar el recorrido cliente → backend → D1. No requiere permisos nuevos ni datos de transferencia. Esta primera escritura está habilitada con `APP_ENV=local` o `APP_ENV=staging`; los cursos de pago conservan su formulario de demostración.

1. Ejecutar `npm run dev` en la raíz.
2. Abrir el evento de ejemplo desde el inicio.
3. Elegir el día y seleccionar el horario.
4. Completar datos personales y, opcionalmente, Instagram y observaciones. Los eventos no solicitan preferencias alimentarias ni alergias; esos campos corresponden a cursos.
5. Marcar la confirmación de datos y pulsar **Revisar inscripción**.
6. En la revisión, pulsar **Confirmar inscripción gratuita**.

La pantalla de éxito muestra la confirmación y el resumen. El código se conserva internamente en la base, sin mostrarse al cliente. Volver al inicio recarga el catálogo para consultar los cupos actualizados. No se envían correos.

## Datos guardados

`POST /api/inscripciones` guarda una fila en `reservas`: evento, código, nombre, correo, teléfono, nombre del asistente, estado `CONFIRMADO`, origen `SISTEMA` y fecha de confirmación. La inscripción abarca todas las jornadas del evento.

Sin cambiar el esquema del equipo, Instagram y comentarios se guardan provisionalmente como JSON versionado en `observaciones`. Los eventos no guardan preferencias ni alergias; si se trata de un curso, esos campos adicionales sí se conservan. No se asocian automáticamente a las opciones alimentarias ofrecidas por un evento: una preferencia declarada no confirma que se pueda atender. La estructura definitiva de estos campos queda para el acuerdo de modelo de datos.

La API valida datos y longitudes, evento abierto/gratuito, cierre de inscripción y cupos. Un `INSERT ... SELECT` comprueba cupos y duplicados en una única escritura. La misma combinación de evento, correo y nombre de asistente no puede tener dos inscripciones activas en este flujo. `requestId` permite reintentar la solicitud sin crear otra reserva.

Para consultar en un visor SQLite:

```sql
SELECT r.id, e.nombre AS evento, r.codigo, r.reservado_por_nombre,
       r.reservado_por_correo, r.estado, r.observaciones
FROM reservas r JOIN eventos e ON e.id = r.evento_id
ORDER BY r.id DESC;
```

La comprobación del recorrido real dejó una inscripción ficticia con correo `prueba-inscripcion@example.com`, identificada como prueba técnica en sus observaciones. Consume un cupo local.

## Verificación

`node scripts/check-enrollments.mjs` crea una D1 temporal con las migraciones reales y comprueba validación, guardado, datos adicionales, reintentos, duplicados, último cupo con solicitudes concurrentes y rechazo de pagos y producción, y disponibilidad en desarrollo. No modifica la base local del proyecto.
