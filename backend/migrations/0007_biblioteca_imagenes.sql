CREATE TABLE `biblioteca_imagenes` (
	`id` text PRIMARY KEY NOT NULL,
	`clave` text NOT NULL,
	`nombre` text NOT NULL,
	`peso` integer NOT NULL,
	`ancho` integer NOT NULL,
	`alto` integer NOT NULL,
	`estado` text DEFAULT 'ACTIVA' NOT NULL,
	`creado_por` text,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`creado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `biblioteca_imagenes_clave_unique` ON `biblioteca_imagenes` (`clave`);--> statement-breakpoint
ALTER TABLE `evento_media` ADD `imagen_id` text REFERENCES biblioteca_imagenes(id);
--> statement-breakpoint
CREATE TRIGGER biblioteca_imagen_valida_insert BEFORE INSERT ON evento_media
WHEN NEW.imagen_id IS NOT NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM biblioteca_imagenes WHERE id=NEW.imagen_id AND estado='ACTIVA')
   OR NEW.tipo!='IMAGEN' OR NEW.url!='/api/imagenes/' || NEW.imagen_id
   THEN RAISE(ABORT,'Imagen no disponible en la biblioteca') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM evento_media WHERE evento_id=NEW.evento_id AND tipo='IMAGEN')>=3
   OR EXISTS(SELECT 1 FROM evento_media WHERE evento_id=NEW.evento_id AND imagen_id=NEW.imagen_id)
   THEN RAISE(ABORT,'Hasta tres imagenes diferentes por evento') END;
END;
--> statement-breakpoint
CREATE TRIGGER biblioteca_imagen_valida_update BEFORE UPDATE ON evento_media
WHEN NEW.imagen_id IS NOT NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM biblioteca_imagenes WHERE id=NEW.imagen_id AND estado='ACTIVA')
   OR NEW.tipo!='IMAGEN' OR NEW.url!='/api/imagenes/' || NEW.imagen_id
   THEN RAISE(ABORT,'Imagen no disponible en la biblioteca') END;
 SELECT CASE WHEN (SELECT COUNT(*) FROM evento_media WHERE evento_id=NEW.evento_id AND tipo='IMAGEN' AND id!=OLD.id)>=3
   OR EXISTS(SELECT 1 FROM evento_media WHERE evento_id=NEW.evento_id AND imagen_id=NEW.imagen_id AND id!=OLD.id)
   THEN RAISE(ABORT,'Hasta tres imagenes diferentes por evento') END;
END;
