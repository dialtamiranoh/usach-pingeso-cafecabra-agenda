import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { and, eq, like, sql } from 'drizzle-orm';
import type { AppBindings } from '../config/bindings';
import type { TransferDetails } from '@cafecabra/shared';
import { createDb } from '../db';
import { configuracion, eventos, reservas, tipoEvento, ediciones } from '../db/schema';
import { sendEnrollmentEmails } from '../integrations/email/enrollment';
import { normalizarInstitucionFinanciera, normalizarTipoCuenta } from '@cafecabra/shared';
import { publicarEvento } from '../realtime/publish';

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
  const limits: Record<string, number> = { eventId: 15, editionId: 80, requestId: 36, name: 120, email: 254, phone: 25, instagram: 31, dietaryPreference: 20, dietaryOther: 300, allergyStatus: 20, allergyDetails: 500, notes: 1000 };
  const data: Record<string, string> = {};
  for (const [field, max] of Object.entries(limits)) {
    if (typeof input[field] !== 'string' || input[field].length > max) return c.json({ error: 'Revisa los campos del formulario.' }, 400);
    data[field] = input[field].trim();
  }
  const { eventId, editionId, requestId, name, phone, instagram, dietaryPreference, dietaryOther, allergyStatus, allergyDetails, notes } = data;
  const email = data.email.toLowerCase();
  const igHandle = instagram.replace(/^@/, '');
  if (!/^[1-9]\d*$/.test(eventId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(editionId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
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

  const edition = await db.select().from(ediciones).where(and(eq(ediciones.id, editionId), eq(ediciones.eventoId, eventIdNum))).get();
  if (!edition) return c.json({ error: 'La fecha seleccionada no pertenece a esta actividad.' }, 400);
  const selectedDates = await c.env.cafe_cabra_agenda_db.prepare('SELECT fecha,horario FROM fechas WHERE edicion_id=? AND evento_id=? ORDER BY fecha,id').bind(editionId, eventIdNum).all<{ fecha: string; horario: string | null }>();
  const code = `CC-${requestId.toUpperCase()}`;

  // Reintento idempotente: si el código ya existe y coincide, devolvemos su estado actual (sin reenviar correos).
  const existing = await db.select({
    eventoId: reservas.eventoId, edicionId: reservas.edicionId, correo: reservas.reservadoPorCorreo,
    estado: reservas.estado, expiraEn: reservas.expiraEn, montoEsperado: reservas.montoEsperado,
  }).from(reservas).where(eq(reservas.codigo, code)).get();
  if (existing) {
    if (existing.edicionId !== editionId || String(existing.eventoId) !== eventId || existing.correo !== email || !['CONFIRMADO', 'RESERVADO'].includes(existing.estado)) {
      return c.json({ error: 'La solicitud ya fue utilizada.' }, 409);
    }
    if (existing.estado === 'RESERVADO') {
      return c.json({ code, status: 'RESERVADO', eventId, editionId, transfer: await readTransfer(db, existing.montoEsperado ?? precio, toEpoch(existing.expiraEn)) });
    }
    return c.json({ code, status: 'CONFIRMADO', eventId, editionId });
  }

  if (edition.estado !== 'ABIERTO' || !selectedDates.results.length || selectedDates.results.some(day => !day.horario || !/^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/.test(day.horario) || day.horario.split(/\s*[-–]\s*/)[0] >= day.horario.split(/\s*[-–]\s*/)[1])) {
    return c.json({ error: 'La edición no está abierta o sus horarios están pendientes.' }, 409);
  }

  // Las columnas no modeladas se conservan en observaciones como JSON versionado.
  const details = JSON.stringify({ version: 1, notes, instagram: igHandle,
    ...(evento.tipo === 'Curso' ? { dietaryPreference, dietaryOther: dietaryPreference === 'other' ? dietaryOther : '', allergyStatus, allergyDetails: allergyStatus === 'yes' ? allergyDetails : '' } : {}),
  });

  // Envía los correos sin bloquear la respuesta si el servicio de correo falla o no está configurado.
  async function notify(opts: { paid: boolean; transfer?: TransferDetails; payer?: { rut: string; bank: string; accountType: string; account: string } }) {
    if (!c.env.RESEND_API_KEY) return;
    try {
      const adminEmail = await readAdminEmail(db, c.env.ADMIN_EMAIL);
      await sendEnrollmentEmails({
        apiKey: c.env.RESEND_API_KEY, adminEmail, clientEmail: email, clientName: name,
        courseTitle: titulo, dates: selectedDates.results.map(day => ({ date: day.fecha, schedule: day.horario! })), code, phone, instagram: igHandle, paid: opts.paid, transfer: opts.transfer, payer: opts.payer,
      });
    } catch (error) {
      console.error('Error enviando correos de inscripción', error instanceof Error ? error.message : String(error));
    }
  }

  if (!esPagado) {
    // ---- Flujo GRATIS: nace CONFIRMADO (INSERT atómico, sin sobreventa) ----
    const inserted = await db.all<{ id: number }>(sql`
      INSERT OR IGNORE INTO reservas (evento_id, codigo, reservado_por_nombre, reservado_por_correo,
        reservado_por_telefono, reservado_para_nombre, observaciones, estado, origen_confirmacion, confirmado_en, monto_esperado, edicion_id)
      SELECT e.id, ${code}, ${name}, ${email}, ${phone}, ${name}, ${details}, 'CONFIRMADO', 'SISTEMA', unixepoch(), 0, ${editionId}
      FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id JOIN ubicaciones u ON u.id=e.ubicacion_id JOIN ediciones d ON d.evento_id=e.id
      WHERE e.id=${eventIdNum} AND d.id=${editionId} AND d.estado='ABIERTO' AND e.estado='ABIERTO' AND t.requiere_pago=0 AND e.precio=0 AND t.activo=1 AND u.activo=1
        AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en>unixepoch())
        AND EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id AND f.edicion_id=d.id)
        AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.evento_id=e.id AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
          AND LOWER(TRIM(r.reservado_por_correo))=${email} AND LOWER(TRIM(r.reservado_para_nombre))=LOWER(${name})
          AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
        AND (e.controla_cupo=0 OR d.cupo_maximo IS NULL OR d.cupo_maximo >
          (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND (r.edicion_id=d.id OR r.edicion_id IS NULL) AND
          (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
      RETURNING id
    `);
    if (inserted.length === 0) {
      const replay = await db.select({ id: reservas.id }).from(reservas)
        .where(and(eq(reservas.codigo, code), eq(reservas.eventoId, eventIdNum), eq(reservas.edicionId, editionId), eq(reservas.reservadoPorCorreo, email))).get();
      if (replay) return c.json({ code, status: 'CONFIRMADO', eventId, editionId });
      return c.json({ error: 'No pudimos inscribirte: el evento no está disponible, no quedan cupos o ya existe una inscripción con tus datos.' }, 409);
    }
    await notify({ paid: false });
    await publicarEvento(c.env, { tipo: 'RESERVA_NUEVA', eventId, titulo, detalle: name, ts: Date.now() });
    return c.json({ code, status: 'CONFIRMADO', eventId, editionId }, 201);
  }

  // ---- Flujo PAGADO: nace RESERVADO con plazo de pago (12 h) ----
  // reservado_por = titular que paga; reservado_para = asistente (RN-37).
  const payerSameAsAttendee = input.payerSameAsAttendee === true;
  const payerName = typeof input.payerName === 'string' ? input.payerName.trim() : '';
  const payerRut = typeof input.payerRut === 'string' ? input.payerRut.trim() : '';
  // SCRUM-91: se guarda el nombre canónico del catálogo compartido cuando se reconoce la
  // institución, con el fin de facilitar la conciliación de pagos.
  const originBank = typeof input.originBank === 'string' ? normalizarInstitucionFinanciera(input.originBank) : '';
  // El tipo de cuenta se normaliza al nombre canónico; es informativo y no participa en la conciliación.
  const accountType = typeof input.accountType === 'string' ? normalizarTipoCuenta(input.accountType) : '';
  const accountLastFour = typeof input.accountLastFour === 'string' ? input.accountLastFour.trim() : '';
  const titular = payerSameAsAttendee ? name : payerName;
  if ((!payerSameAsAttendee && (titular.length < 3 || titular.length > 120)) ||
      !isValidRut(payerRut) || originBank.length < 2 || originBank.length > 80 ||
      accountType.length < 2 || accountType.length > 40 || !/^[0-9]{4}$/.test(accountLastFour)) {
    return c.json({ error: 'Revisa los datos de transferencia: titular, RUT, banco, tipo de cuenta y últimos 4 dígitos de la cuenta.' }, 400);
  }
  // El tipo de cuenta no tiene columna propia; se conserva en observaciones junto al resto de datos no modelados.
  const detailsPagado = JSON.stringify({ ...JSON.parse(details), tipoCuentaOrigen: accountType });

  const inserted = await db.all<{ id: number; expira_en: number }>(sql`
    INSERT OR IGNORE INTO reservas (evento_id, codigo, reservado_por_nombre, reservado_por_correo,
      reservado_por_telefono, reservado_por_rut, reservado_para_nombre, reservado_para_rut,
      banco_origen, cuenta_origen, observaciones, estado, expira_en, monto_esperado, edicion_id)
        SELECT e.id, ${code}, ${titular}, ${email}, ${phone}, ${payerRut}, ${name}, ${payerRut}, ${originBank}, ${accountLastFour}, ${detailsPagado}, 'RESERVADO',
      unixepoch() + COALESCE((SELECT CAST(valor AS INTEGER) FROM configuracion WHERE clave='pago:plazo_horas'), 12) * 3600, ${precio}, ${editionId}
    FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id JOIN ubicaciones u ON u.id=e.ubicacion_id JOIN ediciones d ON d.evento_id=e.id
    WHERE e.id=${eventIdNum} AND d.id=${editionId} AND d.estado='ABIERTO' AND e.estado='ABIERTO' AND t.requiere_pago=1 AND e.precio>0 AND t.activo=1 AND u.activo=1
      AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en>unixepoch())
      AND EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id AND f.edicion_id=d.id)
      AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.evento_id=e.id AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
                AND LOWER(TRIM(r.reservado_por_correo))=${email} AND r.reservado_para_rut=${payerRut}
        AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
      AND (e.controla_cupo=0 OR d.cupo_maximo IS NULL OR d.cupo_maximo >
        (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND (r.edicion_id=d.id OR r.edicion_id IS NULL) AND
        (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
    RETURNING id, expira_en
  `);

  if (inserted.length === 0) {
    const replay = await db.select({ expiraEn: reservas.expiraEn, montoEsperado: reservas.montoEsperado }).from(reservas)
      .where(and(eq(reservas.codigo, code), eq(reservas.eventoId, eventIdNum), eq(reservas.edicionId, editionId), eq(reservas.reservadoPorCorreo, email), eq(reservas.estado, 'RESERVADO'))).get();
    if (replay) return c.json({ code, status: 'RESERVADO', eventId, editionId, transfer: await readTransfer(db, replay.montoEsperado ?? precio, toEpoch(replay.expiraEn)) });
    return c.json({ error: 'No pudimos crear tu reserva: el evento no está disponible, no quedan cupos o ya existe una inscripción con tus datos.' }, 409);
  }

  const transfer = await readTransfer(db, precio, inserted[0].expira_en);
    await notify({ paid: true, transfer, payer: { rut: payerRut, bank: originBank, accountType, account: accountLastFour } });
  await publicarEvento(c.env, { tipo: 'RESERVA_NUEVA', eventId, titulo, detalle: name, ts: Date.now() });
  return c.json({ code, status: 'RESERVADO', eventId, editionId, transfer }, 201);
});