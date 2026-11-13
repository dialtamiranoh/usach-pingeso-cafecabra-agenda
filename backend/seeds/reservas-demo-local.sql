-- SOLO LOCAL. Datos ficticios para demostración; no incluir en despliegues.
-- Idempotente por código. No modifica reservas existentes ni genera/envía correos.
-- Las pendientes nuevas duran 72 horas desde esta carga; repetir no renueva su plazo.
WITH personas(codigo,nombre,correo,edicion,estado,banco,ultimos,preferencia) AS (
 VALUES
 ('DEMO-LOCAL-001','Camila Rojas','camila.rojas@example.com','fecha-1','RESERVADO','Banco de Chile','1001','vegetarian'),
 ('DEMO-LOCAL-002','Matías González','matias.gonzalez@example.com','fecha-5','RESERVADO','BancoEstado','1002',''),
 ('DEMO-LOCAL-003','Valentina Muñoz','valentina.munoz@example.com','evento-2','RESERVADO','Banco Santander','1003','vegan'),
 ('DEMO-LOCAL-004','Sebastián Pérez','sebastian.perez@example.com','fecha-10','CONFIRMADO','','',''),
 ('DEMO-LOCAL-005','Francisca Soto','francisca.soto@example.com','fecha-10','CONFIRMADO','','',''),
 ('DEMO-LOCAL-006','Diego Araya','diego.araya@example.com','fecha-1','CANCELADO','BancoEstado','1006',''),
 ('DEMO-LOCAL-007','Javiera Torres','javiera.torres@example.com','evento-2','CANCELADO','Banco de Chile','1007',''),
 ('DEMO-LOCAL-008','Nicolás Herrera','nicolas.herrera@example.com','fecha-5','EXPIRADO','Banco Santander','1008',''),
 ('DEMO-LOCAL-009','Antonia Silva','antonia.silva@example.com','evento-2','EXPIRADO','BancoEstado','1009',''),
 ('DEMO-LOCAL-010','Tomás Contreras','tomas.contreras@example.com','fecha-1','EN_ESPERA','Banco de Chile','1010','')
)
INSERT OR IGNORE INTO reservas (
 evento_id,edicion_id,codigo,reservado_por_nombre,reservado_por_correo,
 reservado_para_nombre,banco_origen,cuenta_origen,observaciones,estado,
 monto_esperado,expira_en,origen_confirmacion,confirmado_en,creado_en
)
SELECT e.id,d.id,p.codigo,p.nombre,p.correo,p.nombre,
 NULLIF(p.banco,''),NULLIF(p.ultimos,''),
 json_object('version',1,'demoLocal',json('true'),
 'notes','Datos ficticios para demostración local. No corresponde a una transferencia real.',
 'dietaryPreference',p.preferencia,'allergyStatus','no','tipoCuentaOrigen',CASE WHEN e.precio>0 THEN 'Cuenta corriente' ELSE '' END),
 p.estado,CAST(e.precio AS INTEGER),
 CASE WHEN p.estado='RESERVADO' THEN unixepoch()+72*3600 WHEN p.estado='EXPIRADO' THEN unixepoch()-3600 ELSE NULL END,
 CASE WHEN p.estado='CONFIRMADO' THEN 'SISTEMA' ELSE NULL END,
 CASE WHEN p.estado='CONFIRMADO' THEN unixepoch() ELSE NULL END,unixepoch()
FROM personas p JOIN ediciones d ON d.id=p.edicion JOIN eventos e ON e.id=d.evento_id
WHERE p.estado NOT IN ('RESERVADO','CONFIRMADO') OR e.controla_cupo=0 OR d.cupo_maximo IS NULL
 OR d.cupo_maximo-(SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
 AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
 >= (SELECT COUNT(*) FROM personas q WHERE q.edicion=p.edicion AND q.estado IN ('RESERVADO','CONFIRMADO'));
