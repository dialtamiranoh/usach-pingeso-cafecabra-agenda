import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { and, eq, like, sql } from 'drizzle-orm';
import type { AppBindings } from '../config/bindings';
import type { TransferDetails } from '@cafecabra/shared';
import { createDb } from '../db';
import { configuracion, eventos, reservas, tipoEvento } from '../db/schema';
import { sendEnrollmentEmails } from '../integrations/email/enrollment';

type DB = ReturnType<typeof createDb>;

export const enrollmentRoutes = new Hono<{ Bindings: AppBindings }>();

// Validación de RUT chileno (módulo 11), misma lógica que el frontend.
function isValidRut(value: string): boolean {
  const compact = value.trim().replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(compact)) return false;
  const body = compact.slice(0, -1);
  if (Number(body) === 0) return false;
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const verifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return compact.at(-1) === verifier;
}

// Date (modo timestamp de Drizzle) -> epoch en segundos, como lo espera el correo.
function toEpoch(value: Date | null): number {
  return value ? Math.floor(value.getTime() / 1000) : 0;
}

// Lee los datos de la cuenta destino (SumUp) desde configuracion (RN-29).
async function readTransfer(db: DB, monto: number, expiraEn: number): Promise<TransferDetails> {
  const rows = await db.select({ clave: configuracion.clave, valor: configuracion.valor })
    .from(configuracion).where(like(configuracion.clave, 'pago:%'));
  const cfg: Record<string, string> = {};
  for (const row of rows) cfg[row.clave] = row.valor ?? '';
  return {
    titular: cfg['pago:titular'] ?? '',
    rut: cfg['pago:rut'] ?? '',
    banco: cfg['pago:banco'] ?? '',
    tipoCuenta: cfg['pago:tipo_cuenta'] ?? '',
    numeroCuenta: cfg['pago:numero_cuenta'] ?? '',
    correo: cfg['pago:correo_notificacion'] ?? '',
    monto,
    expiraEn,
  };
}

// Destinatario del aviso al admin: configuracion (editable por el panel) o la variable por entorno.
async function readAdminEmail(db: DB, fallback: string): Promise<string> {
  const row = await db.select({ valor: configuracion.valor }).from(configuracion)
    .where(eq(configuracion.clave, 'notificaciones:admin_email')).get();
  return row?.valor?.trim() || fallback;
}

enrollmentRoutes.use('/inscripciones', bodyLimit({ maxSize: 12000, onError: c => c.json({ error: 'El formulario es demasiado extenso.' }, 413) }));
enrollmentRoutes.post('/inscripciones', async c => {
  // Primera integración de prueba: solo en local y desarrollo.
  if (!['local', 'staging'].includes(c.env.APP_ENV)) return c.json({ error: 'Ruta no encontrada' }, 404);
  if (!c.req.header('content-type')?.includes('application/json')) return c.json({ error: 'Formato de solicitud inválido.' }, 415);
  let input: Record<string, unknown>;
  try {
    const body = await c.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    input = body;
  } catch { return c.json({ error: 'El formulario no es válido.' }, 400); }

  // --- Campos comunes (gratis y pagado) ---
  const limits: Record<string, number> = { eventId: 15, requestId: 36, name: 120, email: 254, phone: 25, instagram: 31, dietaryPreference: 20, dietaryOther: 300, allergyStatus: 20, allergyDetails: 500, notes: 1000 };
  const data: Record<string, string> = {};
  for (const [field, max] of Object.entries(limits)) {
    if (typeof input[field] !== 'string' || input[field].length > max) return c.json({ error: 'Revisa los campos del formulario.' }, 400);
    data[field] = input[field].trim();
  }
  const { eventId, requestId, name, phone, instagram, dietaryPreference, dietaryOther, allergyStatus, allergyDetails, notes } = data;
  const email = data.email.toLowerCase();
  const igHandle = instagram.replace(/^@/, '');
  if (!/^[1-9]\d*$/.test(eventId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
      name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15 ||
      (instagram && !/^@?[a-zA-Z0-9._]{1,30}$/.test(instagram)) || !['', 'none', 'vegan', 'vegetarian', 'other'].includes(dietaryPreference) ||
      (dietaryPreference === 'other' && !dietaryOther) || !['', 'no', 'yes', 'undisclosed'].includes(allergyStatus) || (allergyStatus === 'yes' && !allergyDetails) || input.confirmed !== true) {
    return c.json({ error: 'Revisa tus datos y confirma que son correctos.' }, 400);
  }

  const db = createDb(c.env.cafe_cabra_agenda_db);
  const eventIdNum = Number(eventId);

  // Metadatos del evento para decidir la modalidad (gratis vs pagado) y titular el correo.
  const evento = await db.select({
    titulo: eventos.nombre, precio: eventos.precio,
    requierePago: tipoEvento.requierePago, tipo: tipoEvento.nombre,
  }).from(eventos).innerJoin(tipoEvento, eq(tipoEvento.id, eventos.tipoEventoId))
    .where(eq(eventos.id, eventIdNum)).get();
  if (!evento) return c.json({ error: 'El evento no existe o no está disponible.' }, 404);
  const { titulo, precio } = evento;
  const esPagado = evento.requierePago || precio > 0;

  const code = `CC-${requestId.toUpperCase()}`;

  // Reintento idempotente: si el código ya existe y coincide, devolvemos su estado actual (sin reenviar correos).
  const existing = await db.select({
    eventoId: reservas.eventoId, correo: reservas.reservadoPorCorreo,
    estado: reservas.estado, expiraEn: reservas.expiraEn,
  }).from(reservas).where(eq(reservas.codigo, code)).get();
  if (existing) {
    if (String(existing.eventoId) !== eventId || existing.correo !== email || !['CONFIRMADO', 'RESERVADO'].includes(existing.estado)) {
      return c.json({ error: 'La solicitud ya fue utilizada.' }, 409);
    }
    if (existing.estado === 'RESERVADO') {
      return c.json({ code, status: 'RESERVADO', eventId, transfer: await readTransfer(db, precio, toEpoch(existing.expiraEn)) });
    }
    return c.json({ code, status: 'CONFIRMADO', eventId });
  }

  // Las columnas no modeladas se conservan en observaciones como JSON versionado.
  const details = JSON.stringify({ version: 1, notes, instagram: igHandle,
    ...(evento.tipo === 'Curso' ? { dietaryPreference, dietaryOther: dietaryPreference === 'other' ? dietaryOther : '', allergyStatus, allergyDetails: allergyStatus === 'yes' ? allergyDetails : '' } : {}),
  });

  // Envía los correos sin bloquear la respuesta si el servicio de correo falla o no está configurado.
  async function notify(opts: { paid: boolean; transfer?: TransferDetails; payer?: { rut: string; bank: string; account: string } }) {
    if (!c.env.RESEND_API_KEY) return;
    try {
      const adminEmail = await readAdminEmail(db, c.env.ADMIN_EMAIL);
      await sendEnrollmentEmails({
        apiKey: c.env.RESEND_API_KEY, adminEmail, clientEmail: email, clientName: name,
        courseTitle: titulo, code, phone, instagram: igHandle, paid: opts.paid, transfer: opts.transfer, payer: opts.payer,
      });
    } catch (error) {
      console.error('Error enviando correos de inscripción', error instanceof Error ? error.message : String(error));
    }
  }

  if (!esPagado) {
    // ---- Flujo GRATIS: nace CONFIRMADO (INSERT atómico, sin sobreventa) ----
    const inserted = await db.all<{ id: number }>(sql`
      INSERT OR IGNORE INTO reservas (evento_id, codigo, reservado_por_nombre, reservado_por_correo,
        reservado_por_telefono, reservado_para_nombre, observaciones, estado, origen_confirmacion, confirmado_en)
      SELECT e.id, ${code}, ${name}, ${email}, ${phone}, ${name}, ${details}, 'CONFIRMADO', 'SISTEMA', unixepoch()
      FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id JOIN ubicaciones u ON u.id=e.ubicacion_id
      WHERE e.id=${eventIdNum} AND e.estado='ABIERTO' AND t.requiere_pago=0 AND e.precio=0 AND t.activo=1 AND u.activo=1
        AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en>unixepoch())
        AND EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id)
        AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.evento_id=e.id
          AND LOWER(TRIM(r.reservado_por_correo))=${email} AND LOWER(TRIM(r.reservado_para_nombre))=LOWER(${name})
          AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
        AND (e.controla_cupo=0 OR e.cupo_maximo IS NULL OR e.cupo_maximo >
          (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND
          (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
      RETURNING id
    `);
    if (inserted.length === 0) {
      const replay = await db.select({ id: reservas.id }).from(reservas)
        .where(and(eq(reservas.codigo, code), eq(reservas.eventoId, eventIdNum), eq(reservas.reservadoPorCorreo, email))).get();
      if (replay) return c.json({ code, status: 'CONFIRMADO', eventId });
      return c.json({ error: 'No pudimos inscribirte: el evento no está disponible, no quedan cupos o ya existe una inscripción con tus datos.' }, 409);
    }
    await notify({ paid: false });
    return c.json({ code, status: 'CONFIRMADO', eventId }, 201);
  }

  // ---- Flujo PAGADO: nace RESERVADO con plazo de pago (12 h) ----
  const payerRut = typeof input.payerRut === 'string' ? input.payerRut.trim() : '';
  const bankName = typeof input.bankName === 'string' ? input.bankName.trim() : '';
  const accountRaw = typeof input.accountNumber === 'string' ? input.accountNumber.trim() : '';
  const accountNumber = accountRaw.replace(/[\s.-]/g, '');
  if (payerRut.length > 12 || bankName.length < 2 || bankName.length > 60 || !isValidRut(payerRut) || !/^[0-9]{5,20}$/.test(accountNumber)) {
    return c.json({ error: 'Revisa los datos bancarios: RUT del titular, banco y número de cuenta.' }, 400);
  }

  const inserted = await db.all<{ id: number; expira_en: number }>(sql`
    INSERT OR IGNORE INTO reservas (evento_id, codigo, reservado_por_nombre, reservado_por_correo,
      reservado_por_telefono, reservado_por_rut, reservado_para_nombre, reservado_para_rut,
      banco_origen, cuenta_origen, observaciones, estado, expira_en)
    SELECT e.id, ${code}, ${name}, ${email}, ${phone}, ${payerRut}, ${name}, ${payerRut}, ${bankName}, ${accountNumber}, ${details}, 'RESERVADO',
      unixepoch() + COALESCE((SELECT CAST(valor AS INTEGER) FROM configuracion WHERE clave='pago:plazo_horas'), 12) * 3600
    FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id JOIN ubicaciones u ON u.id=e.ubicacion_id
    WHERE e.id=${eventIdNum} AND e.estado='ABIERTO' AND t.requiere_pago=1 AND e.precio>0 AND t.activo=1 AND u.activo=1
      AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en>unixepoch())
      AND EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id)
      AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.evento_id=e.id
        AND LOWER(TRIM(r.reservado_por_correo))=${email} AND LOWER(TRIM(r.reservado_para_nombre))=LOWER(${name})
        AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
      AND (e.controla_cupo=0 OR e.cupo_maximo IS NULL OR e.cupo_maximo >
        (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND
        (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
    RETURNING id, expira_en
  `);

  if (inserted.length === 0) {
    const replay = await db.select({ expiraEn: reservas.expiraEn }).from(reservas)
      .where(and(eq(reservas.codigo, code), eq(reservas.eventoId, eventIdNum), eq(reservas.reservadoPorCorreo, email), eq(reservas.estado, 'RESERVADO'))).get();
    if (replay) return c.json({ code, status: 'RESERVADO', eventId, transfer: await readTransfer(db, precio, toEpoch(replay.expiraEn)) });
    return c.json({ error: 'No pudimos crear tu reserva: el evento no está disponible, no quedan cupos o ya existe una inscripción con tus datos.' }, 409);
  }

  const transfer = await readTransfer(db, precio, inserted[0].expira_en);
  await notify({ paid: true, transfer, payer: { rut: payerRut, bank: bankName, account: accountNumber } });
  return c.json({ code, status: 'RESERVADO', eventId, transfer }, 201);
});