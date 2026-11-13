CREATE TABLE `ediciones` (
	`id` text PRIMARY KEY NOT NULL,
	`evento_id` integer NOT NULL,
	`cupo_maximo` integer,
	`estado` text DEFAULT 'ABIERTO' NOT NULL,
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP INDEX `uq_reserva_evento_por_para`;--> statement-breakpoint
ALTER TABLE `reservas` ADD `edicion_id` text REFERENCES ediciones(id);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reserva_evento_por_para` ON `reservas` (`evento_id`,`edicion_id`,`reservado_por_correo`,`reservado_para_rut`) WHERE estado IN ('RESERVADO', 'EN_ESPERA', 'CONFIRMADO');--> statement-breakpoint
ALTER TABLE `fechas` ADD `edicion_id` text REFERENCES ediciones(id);
--> statement-breakpoint
-- Inicialización idempotente de fechas antiguas o de los seeds de demostración.
-- La configuración antigua solo se utiliza para agrupar esas fechas iniciales.
INSERT OR IGNORE INTO ediciones (id, evento_id, cupo_maximo)
SELECT CASE WHEN COALESCE(c.valor,'INDEPENDIENTES')='CONJUNTAS'
  THEN 'evento-' || e.id ELSE 'fecha-' || f.id END, e.id, e.cupo_maximo
FROM fechas f JOIN eventos e ON e.id=f.evento_id
LEFT JOIN configuracion c ON c.clave='evento:' || e.id || ':modalidad_fechas'
WHERE f.edicion_id IS NULL;
--> statement-breakpoint
UPDATE fechas SET edicion_id=(
  SELECT d.id FROM ediciones d WHERE d.evento_id=fechas.evento_id AND d.id=
    CASE WHEN COALESCE((SELECT valor FROM configuracion WHERE clave='evento:' || fechas.evento_id || ':modalidad_fechas'),'INDEPENDIENTES')='CONJUNTAS'
      THEN 'evento-' || fechas.evento_id ELSE 'fecha-' || fechas.id END
) WHERE edicion_id IS NULL;
--> statement-breakpoint
-- Solo es posible deducir la edición de una reserva anterior si existe exactamente una.
UPDATE reservas SET edicion_id=(SELECT MIN(d.id) FROM ediciones d WHERE d.evento_id=reservas.evento_id)
WHERE edicion_id IS NULL AND (SELECT COUNT(*) FROM ediciones d WHERE d.evento_id=reservas.evento_id)=1;
