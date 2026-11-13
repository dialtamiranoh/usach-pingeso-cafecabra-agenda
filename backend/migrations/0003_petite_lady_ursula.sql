CREATE TABLE `notificaciones_reserva` (
	`id` text PRIMARY KEY NOT NULL,
	`decision_id` text NOT NULL,
	`destinatario` text NOT NULL,
	`asunto` text NOT NULL,
	`mensaje` text NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`intentos` integer DEFAULT 0 NOT NULL,
	`bloqueado_en` integer,
	`enviado_en` integer,
	`proveedor_id` text,
	FOREIGN KEY (`decision_id`) REFERENCES `reserva_decisiones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notificaciones_reserva_decision_id_unique` ON `notificaciones_reserva` (`decision_id`);--> statement-breakpoint
CREATE TABLE `reserva_decisiones` (
	`id` text PRIMARY KEY NOT NULL,
	`reserva_id` integer NOT NULL,
	`accion` text NOT NULL,
	`motivo` text DEFAULT '' NOT NULL,
	`monto_esperado` integer,
	`administrador_id` text NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`administrador_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reserva_decisiones_reserva_id_unique` ON `reserva_decisiones` (`reserva_id`);--> statement-breakpoint
ALTER TABLE `reservas` ADD `monto_esperado` integer;