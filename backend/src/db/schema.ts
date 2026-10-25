/**
 * Esquema de base de datos — Café Cabra (Cloudflare D1 + Drizzle ORM)
 *
 * Fuente: diagramas MVP2_Entidad_Relacion.puml y MVP2_Clases.puml, y el
 * documento de reglas de negocio (RN-01..RN-34).
 *
 * Decisión de arquitectura (ver README): la autenticación la gestiona
 * Better Auth con sus propias tablas (`user`, `session`, `account`,
 * `verification`). Por eso la tabla `usuarios` y `sesiones` del diagrama se
 * materializan como la tabla `user` (extendida con `activo` y `creado_por`)
 * y `session` de Better Auth. Las FKs de auditoría (`creado_por`,
 * `actualizado_por`) apuntan a `user.id` (texto).
 */
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/* ────────────────────────────────────────────────────────────────────────
   AUTENTICACIÓN — tablas gestionadas por Better Auth
   (nombres y columnas base según el esquema estándar de Better Auth;
    `activo` y `creado_por` son campos adicionales propios)
   ──────────────────────────────────────────────────────────────────────── */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  // Campos adicionales del dominio Café Cabra:
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  creadoPor: text("creado_por").references((): AnySQLiteColumn => user.id),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});
export const rateLimit = sqliteTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key"),
  count: integer("count"),
  lastRequest: integer("last_request"),
});

/* ────────────────────────────────────────────────────────────────────────
   CONFIGURACIÓN GLOBAL (RN-29)
   ──────────────────────────────────────────────────────────────────────── */

export const configuracion = sqliteTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor"),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
});

/* ────────────────────────────────────────────────────────────────────────
   MANTENEDORES (RN-01, RN-02)
   ──────────────────────────────────────────────────────────────────────── */

export const ubicaciones = sqliteTable("ubicaciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  direccion: text("direccion"),
  referencia: text("referencia"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const tipoEvento = sqliteTable("tipo_evento", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  requierePago: integer("requiere_pago", { mode: "boolean" })
    .notNull()
    .default(false),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const instructores = sqliteTable("instructores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  bio: text("bio"),
  fotoUrl: text("foto_url"),
  email: text("email"),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const opcionesAlimentarias = sqliteTable("opciones_alimentarias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ────────────────────────────────────────────────────────────────────────
   EVENTOS (RN-03..RN-07, RN-30..RN-33)
   ──────────────────────────────────────────────────────────────────────── */

export const eventos = sqliteTable("eventos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipoEventoId: integer("tipo_evento_id")
    .notNull()
    .references(() => tipoEvento.id),
  ubicacionId: integer("ubicacion_id")
    .notNull()
    .references(() => ubicaciones.id),
  eventoPadreId: integer("evento_padre_id").references(
    (): AnySQLiteColumn => eventos.id,
  ),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  precio: real("precio").notNull().default(0),
  cupoMaximo: integer("cupo_maximo"), // NULL = sin límite (RN-04)
  // true = la reserva descuenta cupo (con lista de espera si hay tope).
  // false = evento de "entrada liberada": el registro es informativo, NO
  //         descuenta cupo y la inscripción es opcional.
  controlaCupo: integer("controla_cupo", { mode: "boolean" })
    .notNull()
    .default(true),
  incluyeCertificado: integer("incluye_certificado", { mode: "boolean" })
    .notNull()
    .default(false),
  incluye: text("incluye"),
  // RN-06: BORRADOR | ABIERTO | CERRADO | CANCELADO
  estado: text("estado", {
    enum: ["BORRADOR", "ABIERTO", "CERRADO", "CANCELADO"],
  })
    .notNull()
    .default("BORRADOR"),
  // Cierre automático de inscripciones (fecha/hora de inicio del evento).
  // También se cierra al completarse el cupo.
  cierreInscripcionEn: integer("cierre_inscripcion_en", { mode: "timestamp" }),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// N:M evento ↔ instructor (RN-02)
export const eventoInstructores = sqliteTable(
  "evento_instructores",
  {
    eventoId: integer("evento_id")
      .notNull()
      .references(() => eventos.id, { onDelete: "cascade" }),
    instructorId: integer("instructor_id")
      .notNull()
      .references(() => instructores.id),
  },
  (t) => [primaryKey({ columns: [t.eventoId, t.instructorId] })],
);

// N:M evento ↔ opción alimentaria (RN-02)
export const eventoOpcionesAlimentarias = sqliteTable(
  "evento_opciones_alimentarias",
  {
    eventoId: integer("evento_id")
      .notNull()
      .references(() => eventos.id, { onDelete: "cascade" }),
    opcionId: integer("opcion_id")
      .notNull()
      .references(() => opcionesAlimentarias.id),
  },
  (t) => [primaryKey({ columns: [t.eventoId, t.opcionId] })],
);

// Carrusel de media del evento: imágenes y/o video (RN-30, RN-31). El
// contenido audiovisual se almacena en R2; `url` apunta al objeto.
export const eventoMedia = sqliteTable("evento_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventoId: integer("evento_id")
    .notNull()
    .references(() => eventos.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  // IMAGEN (default) o VIDEO. El catálogo admite varias fotos + un video.
  tipo: text("tipo", { enum: ["IMAGEN", "VIDEO"] }).notNull().default("IMAGEN"),
  orden: integer("orden").notNull().default(0),
  esPrincipal: integer("es_principal", { mode: "boolean" })
    .notNull()
    .default(false),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Fechas del evento (RN-08, RN-09). fecha/horario como texto (día y rango).
export const fechas = sqliteTable("fechas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventoId: integer("evento_id")
    .notNull()
    .references(() => eventos.id, { onDelete: "cascade" }),
  fecha: text("fecha").notNull(), // ISO 'YYYY-MM-DD'
  horario: text("horario"), // ej. '09:00-15:30'
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  creadoEn: integer("creado_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ────────────────────────────────────────────────────────────────────────
   RESERVAS (RN-10..RN-16, RN-34)
   ──────────────────────────────────────────────────────────────────────── */

export const reservas = sqliteTable(
  "reservas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventoId: integer("evento_id")
      .notNull()
      .references(() => eventos.id),
    opcionAlimentariaId: integer("opcion_alimentaria_id").references(
      () => opcionesAlimentarias.id,
    ), // nullable (RN-34)
    codigo: text("codigo").notNull().unique(),

    // Reservado POR: quien inscribe / paga. Recibe las comunicaciones.
    reservadoPorNombre: text("reservado_por_nombre").notNull(),
    reservadoPorCorreo: text("reservado_por_correo").notNull(),
    reservadoPorTelefono: text("reservado_por_telefono"),
    reservadoPorRut: text("reservado_por_rut"),

    // Reservado PARA: quien asiste. Es el nombre que va en el certificado.
    reservadoParaNombre: text("reservado_para_nombre").notNull(),
    reservadoParaRut: text("reservado_para_rut"),

    // Datos de la transferencia declarada (conciliación: monto + banco + cuenta).
    // Nullable: sólo aplican cuando el evento requiere pago.
    bancoOrigen: text("banco_origen"),
    cuentaOrigen: text("cuenta_origen"),
    observaciones: text("observaciones"),

    // RN-10: RESERVADO | EN_ESPERA | CONFIRMADO | EXPIRADO | CANCELADO
    estado: text("estado", {
      enum: ["RESERVADO", "EN_ESPERA", "CONFIRMADO", "EXPIRADO", "CANCELADO"],
    })
      .notNull()
      .default("RESERVADO"),
    // RN-23: MANUAL | SISTEMA
    origenConfirmacion: text("origen_confirmacion", {
      enum: ["MANUAL", "SISTEMA"],
    }),
    confirmadoEn: integer("confirmado_en", { mode: "timestamp" }),
    expiraEn: integer("expira_en", { mode: "timestamp" }),
    actualizadoPor: text("actualizado_por").references(() => user.id),
    actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
    creadoEn: integer("creado_en", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    // No se permite la misma dupla (reservado por, reservado para) dos veces
    // en el mismo evento. Un mismo "por" sí puede inscribir a varios "para".
    // Índice parcial: la dupla es única solo entre reservas ACTIVAS. Una reserva
    // EXPIRADO o CANCELADO no bloquea volver a inscribirse (RN-11, RN-12).
    uniqueIndex("uq_reserva_evento_por_para")
      .on(t.eventoId, t.reservadoPorCorreo, t.reservadoParaRut)
      .where(sql`estado IN ('RESERVADO', 'EN_ESPERA', 'CONFIRMADO')`),
  ],
);

/* ────────────────────────────────────────────────────────────────────────
   NOTIFICACIONES DE PAGO (RN-18..RN-22)
   ──────────────────────────────────────────────────────────────────────── */

export const notificacionesPago = sqliteTable("notificaciones_pago", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Nullable hasta conciliar (RN-21). Un pago = una reserva (RN-21).
  reservaId: integer("reserva_id").references(() => reservas.id),
  emailId: text("email_id"),
  monto: real("monto"),
  bancoOrigen: text("banco_origen"),
  cuentaOrigen: text("cuenta_origen"),
  asunto: text("asunto"),
  remitente: text("remitente"),
  // RN-22: PENDIENTE | CONCILIADO
  estado: text("estado", { enum: ["PENDIENTE", "CONCILIADO"] })
    .notNull()
    .default("PENDIENTE"),
  actualizadoPor: text("actualizado_por").references(() => user.id),
  actualizadoEn: integer("actualizado_en", { mode: "timestamp" }),
  recibidoEn: integer("recibido_en", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/* ────────────────────────────────────────────────────────────────────────
   Tipos inferidos (para uso en el resto del back)
   ──────────────────────────────────────────────────────────────────────── */
export type Usuario = typeof user.$inferSelect;
export type Evento = typeof eventos.$inferSelect;
export type NuevoEvento = typeof eventos.$inferInsert;
export type EventoMedia = typeof eventoMedia.$inferSelect;
export type Reserva = typeof reservas.$inferSelect;
export type NuevaReserva = typeof reservas.$inferInsert;
export type NotificacionPago = typeof notificacionesPago.$inferSelect;