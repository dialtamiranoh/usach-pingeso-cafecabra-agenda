CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `configuracion` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text,
	`actualizado_por` text,
	`actualizado_en` integer,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evento_instructores` (
	`evento_id` integer NOT NULL,
	`instructor_id` integer NOT NULL,
	PRIMARY KEY(`evento_id`, `instructor_id`),
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instructor_id`) REFERENCES `instructores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evento_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evento_id` integer NOT NULL,
	`url` text NOT NULL,
	`tipo` text DEFAULT 'IMAGEN' NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`es_principal` integer DEFAULT false NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evento_opciones_alimentarias` (
	`evento_id` integer NOT NULL,
	`opcion_id` integer NOT NULL,
	PRIMARY KEY(`evento_id`, `opcion_id`),
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opcion_id`) REFERENCES `opciones_alimentarias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `eventos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo_evento_id` integer NOT NULL,
	`ubicacion_id` integer NOT NULL,
	`evento_padre_id` integer,
	`nombre` text NOT NULL,
	`descripcion` text,
	`precio` real DEFAULT 0 NOT NULL,
	`cupo_maximo` integer,
	`controla_cupo` integer DEFAULT true NOT NULL,
	`incluye_certificado` integer DEFAULT false NOT NULL,
	`incluye` text,
	`estado` text DEFAULT 'BORRADOR' NOT NULL,
	`cierre_inscripcion_en` integer,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tipo_evento_id`) REFERENCES `tipo_evento`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicaciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evento_padre_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fechas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evento_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`horario` text,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `instructores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`bio` text,
	`foto_url` text,
	`email` text,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notificaciones_pago` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reserva_id` integer,
	`email_id` text,
	`monto` real,
	`banco_origen` text,
	`cuenta_origen` text,
	`asunto` text,
	`remitente` text,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`recibido_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `opciones_alimentarias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reservas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evento_id` integer NOT NULL,
	`opcion_alimentaria_id` integer,
	`codigo` text NOT NULL,
	`reservado_por_nombre` text NOT NULL,
	`reservado_por_correo` text NOT NULL,
	`reservado_por_telefono` text,
	`reservado_por_rut` text,
	`reservado_para_nombre` text NOT NULL,
	`reservado_para_rut` text,
	`banco_origen` text,
	`cuenta_origen` text,
	`observaciones` text,
	`estado` text DEFAULT 'RESERVADO' NOT NULL,
	`origen_confirmacion` text,
	`confirmado_en` integer,
	`expira_en` integer,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`evento_id`) REFERENCES `eventos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opcion_alimentaria_id`) REFERENCES `opciones_alimentarias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservas_codigo_unique` ON `reservas` (`codigo`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reserva_evento_por_para` ON `reservas` (`evento_id`,`reservado_por_correo`,`reservado_para_rut`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `tipo_evento` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`requiere_pago` integer DEFAULT false NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ubicaciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`direccion` text,
	`referencia` text,
	`activo` integer DEFAULT true NOT NULL,
	`actualizado_por` text,
	`actualizado_en` integer,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actualizado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_por` text,
	FOREIGN KEY (`creado_por`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
