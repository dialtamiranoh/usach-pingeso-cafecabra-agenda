# Ediciones e inscripciones

Un evento representa el curso o actividad del catálogo. Una edición representa una oportunidad concreta de inscribirse, con sus propios cupos y una o varias jornadas. Cada fecha pertenece a una edición y cada nueva reserva guarda la edición elegida.

- Master Class el 14 y el 21: dos ediciones independientes. Reservar el 14 ocupa un cupo únicamente de esa edición.
- Barista intensivo el 7 y el 8: una edición con dos jornadas. La inscripción incluye ambas y ocupa un solo cupo.

`ediciones` guarda el evento, el cupo máximo y el estado. `fechas.edicion_id` agrupa las jornadas. `reservas.edicion_id` conserva la selección. El backend comprueba que la edición pertenezca al evento, esté abierta y tenga horarios válidos. La escritura controla cupos de forma atómica, incluyendo reservas vigentes y confirmadas. Cancelar libera el cupo de esa edición.

El catálogo, el calendario, la revisión, el detalle administrativo y los correos usan las jornadas de la edición seleccionada. Un reintento no cambia la edición ni el importe original de la reserva.

## Registros anteriores

La migración `0004_far_ogun.sql` crea las ediciones y agrupa las fechas iniciales usando la configuración anterior `CONJUNTAS` cuando corresponde. Esa configuración sirve para la conversión inicial; las relaciones con ediciones pasan a definir la agrupación.

Una reserva anterior solo se enlaza automáticamente si su evento tiene una única edición. Si existen varias alternativas, queda sin asignar. En **Inscritos**, el administrador debe verificar la selección con la persona y usar **Asignar edición** antes de confirmar. No se permite cambiar una edición ya asignada mediante ese formulario.

Mientras una reserva activa antigua no tenga edición, se descuenta conservadoramente de cada alternativa de su evento para evitar ofrecer cupos que podrían estar ocupados. Asignarla elimina esa incertidumbre.

## Trabajo local y validación

Aplicar migraciones con `npm run db:migrate:local --workspace backend`. Si se insertan fechas mediante los seeds anteriores después de migrar, ejecutar `npm run db:editions:local --workspace backend`; los comandos de carga local de cursos y del evento de ejemplo ya incluyen esa inicialización. Es idempotente y no sobrescribe cupos existentes.

`node scripts/check-editions.mjs` utiliza D1 temporal y comprueba fechas alternativas, jornadas conjuntas, persistencia, cupos, concurrencia, cancelación, reintentos, mensajes y asignación de reservas anteriores. No envía correos reales ni modifica Cloudflare.
