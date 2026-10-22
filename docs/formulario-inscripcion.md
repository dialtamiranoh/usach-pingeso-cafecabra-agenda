# Datos adicionales de inscripción

Formulario local: los eventos gratuitos ya guardan inscripciones al confirmar; los de pago siguen en demostración. Ver `inscripcion-gratuita.md`.

## Campos

- Preferencia alimentaria opcional: sin preferencia, vegana, vegetariana u otra. Si se elige otra, se pide el detalle.
- Alergias o intolerancias opcionales: no, sí o prefiero no informar. No responder se conserva como no informado, no como ausencia de alergias. Si responde sí, se pide el detalle para revisión del equipo.
- Instagram opcional: usuario con o sin @; no se solicitan credenciales ni enlaces.
- Para actividades de pago: banco de origen y nombre/RUT del titular que transferirá. Puede ser una persona distinta de quien completa el formulario. Si paga la misma persona se reutiliza su nombre, pero se solicita el RUT del titular.
- Últimos cuatro dígitos de la cuenta de origen, opcionales. No se solicita la cuenta completa, tarjetas ni claves.

El RUT se valida por formato y dígito verificador. Eso no acredita identidad ni pago. En los datos ficticios actuales ambas actividades se marcan como de pago; al conectar la API, esta condición debe provenir de tipo_evento.requiere_pago y validarse en el servidor.

## Conciliación pendiente

Banco, nombre y RUT son datos declarados de referencia. El cruce debe utilizar monto, fecha y datos del ordenante que realmente estén disponibles en la notificación bancaria. Si no hay coincidencia única, debe quedar para revisión manual. Un código de reserva en el mensaje de transferencia puede servir como referencia adicional cuando el banco lo incluya en su notificación. No se implementa confirmación automática con este cambio.

## Relación con el esquema actual

Ya existen opciones_alimentarias, la relación con eventos y reservas.opcion_alimentaria_id. Al conectar el formulario se deben cargar opciones reales permitidas para el evento y traducirlas a sus IDs; los códigos de la demo no son IDs de D1.

El esquema no tiene campos específicos para Instagram, alergias o el detalle libre de otra preferencia. Se debe acordar su persistencia y una migración posterior. Como solución provisional explícita para las inscripciones gratuitas locales, los datos adicionales se guardan como JSON versionado en observaciones, según `inscripcion-gratuita.md`; no hay migración de esquema.

Existen banco_origen, cuenta_origen y datos de reservado_por, pero no se debe confundir la persona que reserva con un titular bancario distinto. Los últimos cuatro dígitos no equivalen a cuenta_origen completa ni permiten reconstruirla. Definir campos de titular y sufijo de cuenta al implementar el backend, sin sobrescribir los datos de contacto de quien reserva.

Antes de confirmar, los valores se mantienen en memoria durante la navegación; no se utiliza localStorage. En los eventos gratuitos, al confirmar se envían al backend y se guardan en D1 local. En los de pago siguen solo en memoria. No se envían correos ni datos a terceros.

## Separación de pantallas

La inscripción se divide en dos pasos para actividades de pago. /inscripcion muestra datos personales, Instagram, observaciones y termina con preferencias y alergias. Solo valida esos datos antes de avanzar. /transferencia muestra los datos de quien pagará y la confirmación antes de revisar. Se conserva el borrador en memoria al volver entre pantallas. Sin un borrador personal válido, el acceso directo a transferencia vuelve a inscripción. Las actividades gratuitas omiten transferencia.
