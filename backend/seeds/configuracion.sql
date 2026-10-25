-- Configuración de negocio: cuenta destino (SumUp), plazo de pago y correo del admin.
-- Idempotente: inserta solo lo que falta. La puede editar el admin sin tocar código (RN-29).
INSERT INTO configuracion (clave,valor) SELECT 'pago:titular','CAFE CABRA SpA' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:titular');
INSERT INTO configuracion (clave,valor) SELECT 'pago:rut','77.144.117-3' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:rut');
INSERT INTO configuracion (clave,valor) SELECT 'pago:banco','SumUp' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:banco');
INSERT INTO configuracion (clave,valor) SELECT 'pago:tipo_cuenta','Cuenta Vista' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:tipo_cuenta');
INSERT INTO configuracion (clave,valor) SELECT 'pago:numero_cuenta','1188100117' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:numero_cuenta');
INSERT INTO configuracion (clave,valor) SELECT 'pago:correo_notificacion','pagos@cafecabra.cl' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:correo_notificacion');
INSERT INTO configuracion (clave,valor) SELECT 'pago:plazo_horas','12' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='pago:plazo_horas');
INSERT INTO configuracion (clave,valor) SELECT 'notificaciones:admin_email','cafecabrachile@gmail.com' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='notificaciones:admin_email');