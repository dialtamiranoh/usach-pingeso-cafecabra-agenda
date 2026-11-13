# Confirmación manual de inscripciones

Implementación de trabajo local, sin push ni despliegue remoto. Entrar a `/admin` con la cuenta local y elegir **Inscritos** en el menú.

## Flujo

El listado tiene búsqueda por nombre, correo, actividad o código; filtro por estado y paginación de 20 registros. `RESERVADO` se muestra como **Pendiente de pago**. Una reserva cuyo plazo ya venció se presenta como expirada aunque el cron todavía no haya actualizado físicamente el estado.

En **Ver detalle** se muestran participante, contacto, monto esperado, vencimiento y los datos declarados para reconocer la transferencia. Son una referencia; el sistema no consulta el banco ni demuestra que el pago haya ocurrido.

- **Confirmar pago:** disponible en reservas pagadas pendientes y vigentes. Requiere marcar que se revisaron transferencia y monto. Cambia a `CONFIRMADO`, con origen `MANUAL` y fecha de confirmación.
- **Cancelar reserva:** disponible en reservas pendientes vigentes o en espera. Requiere un motivo de hasta 500 caracteres. Cambia a `CANCELADO`, deja de ocupar cupo e incluye el motivo en el correo.
- Las reservas confirmadas, canceladas o expiradas quedan de consulta; no se reabren ni se confirman por este flujo. Una inscripción gratuita ya nace confirmada.

La sesión aporta automáticamente `actualizado_por`; no hay selector de administrador ni campos extra para el dueño.

## Persistencia

La migración `0003_petite_lady_ursula.sql` añade:

- `reservas.monto_esperado`: precio acordado al crear la inscripción. Las gratuitas guardan cero. Las reservas anteriores mantienen NULL y muestran una advertencia de que el precio original no fue registrado; no se inventa un precio histórico.
- `reserva_decisiones`: acción terminal, motivo, fecha y usuario de sesión. Una decisión por reserva, con identificador de solicitud para reintentos.
- `notificaciones_reserva`: destinatario, asunto, texto y estado del correo.

La decisión, la actualización de la reserva y la creación de la notificación se ejecutan en una única transacción D1. Se valida la vigencia dentro de esa escritura. Dos pestañas o el proceso de expiración no pueden confirmar y cancelar la misma reserva simultáneamente. Un reintento con el mismo identificador no crea otra decisión ni otro mensaje.

Las nuevas inscripciones guardan el precio original; cambiar después el precio del curso no altera ese importe. El correo de instrucciones de pago también conserva ese precio en los reintentos de la solicitud.

## Notificación

Se notifica al correo guardado en `reservado_por_correo`. Confirmación y cancelación tienen mensajes distintos. El detalle permite revisar el mensaje, su estado y **Reintentar envío**.

El correo se intenta después de guardar la decisión. Si no hay `RESEND_API_KEY`, queda **Pendiente de envío** y no se simula éxito. Si Resend falla, queda **Error de envío**, sin deshacer la decisión. Cuando Resend acepta el mensaje queda **Aceptada por el servicio de correo**; esto no prueba que el destinatario lo haya leído o que se haya entregado a su bandeja.

Una marca de envío evita reenvíos normales y se utiliza una clave de idempotencia del proveedor para proteger reintentos cercanos. El bloqueo de un intento se puede recuperar tras cinco minutos. No se promete entrega exactamente una vez ante fallos prolongados fuera de la ventana de idempotencia del proveedor. En esta versión el reintento es manual desde el detalle.

La configuración local actual no tiene clave de Resend: las notificaciones de prueba quedan pendientes y pueden previsualizarse, sin enviar correos reales. No se copiaron claves de Cloudflare.

## Pruebas

```sh
npm run db:migrate:local --workspace backend
node scripts/check-manual-reservations.mjs
npm run typecheck
npm run build
```

El script usa D1 temporal y correos simulados. Comprueba sesión, origen, validaciones, expiración, filtros, conservación del monto, reintentos, acciones concurrentes, rollback si falla la escritura del correo y reenvío sin duplicación normal.

También se probaron los botones en el navegador local, con tres registros ficticios identificados como **Prueba manual**: uno confirmado, uno cancelado y uno pendiente para pruebas del usuario. Consumen dos cupos locales mientras la pendiente siga vigente.

## Edición y fechas de la reserva

Las nuevas reservas guardan `edicion_id`. El detalle y las notificaciones muestran solo las jornadas de esa edición, y los cupos se controlan por edición. La migración 0004 enlaza las reservas antiguas automáticamente solo cuando existe una única edición posible. Si hay varias, el administrador debe verificar la fecha y asignarla desde el detalle antes de confirmar. No se adivina la selección anterior. Véase [Ediciones e inscripciones](ediciones-inscripciones.md).
