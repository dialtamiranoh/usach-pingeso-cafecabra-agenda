import { loadEditions } from './editions';
import type { AdminEnrollment, AdminEnrollmentDetail, ReservationStatus } from '@cafecabra/shared';

export class DecisionError extends Error {
  constructor(message: string, public status: 400 | 404 | 409 = 409) { super(message); }
}
const ROW = `SELECT r.id, r.evento_id AS eventId, r.edicion_id AS editionId, r.codigo AS code, r.reservado_para_nombre AS attendee,
  r.reservado_por_nombre AS contact, r.reservado_por_correo AS email, e.nombre AS event,
  CASE WHEN r.estado='RESERVADO' AND r.expira_en IS NOT NULL AND r.expira_en<=unixepoch()
    THEN 'EXPIRADO' ELSE r.estado END AS status,
  r.creado_en AS createdAt, r.expira_en AS expiresAt, COALESCE(r.monto_esperado,e.precio) AS amount,
  r.monto_esperado IS NOT NULL AS amountRecorded,
  (t.requiere_pago=1 OR COALESCE(r.monto_esperado,e.precio)>0) AS paid,
  r.reservado_por_telefono AS phone, r.reservado_por_rut AS payerRut,
  r.banco_origen AS bank, r.cuenta_origen AS accountSuffix, r.observaciones
  FROM reservas r JOIN eventos e ON e.id=r.evento_id JOIN tipo_evento t ON t.id=e.tipo_evento_id`;
type Row = Omit<AdminEnrollmentDetail, 'amountRecorded' | 'paid' | 'notes' | 'accountType' | 'dates' | 'decision' | 'notification' | 'canConfirm' | 'canCancel' | 'dateMode'> & { amountRecorded: number; paid: number; observaciones: string | null; eventId: number };
function mapRow(row: Row) {
  return { ...row, paid: Boolean(row.paid), amountRecorded: Boolean(row.amountRecorded) };
}

export async function listEnrollments(db: D1Database, status: string, search: string, page: number) {
  const statuses = ['RESERVADO', 'CONFIRMADO', 'CANCELADO', 'EXPIRADO', 'EN_ESPERA'];
  if (status && !statuses.includes(status)) throw new DecisionError('Estado inválido.', 400);
  const filter = ` WHERE (?='' OR status=?) AND (?='' OR instr(lower(attendee),lower(?))>0 OR instr(lower(email),lower(?))>0 OR instr(lower(event),lower(?))>0 OR instr(lower(code),lower(?))>0)`;
  const values = [status, status, search, search, search, search, search];
  const count = await db.prepare(`SELECT COUNT(*) AS total FROM (${ROW})${filter}`).bind(...values).first<{ total: number }>();
  const { results } = await db.prepare(`SELECT * FROM (${ROW})${filter} ORDER BY createdAt DESC,id DESC LIMIT 20 OFFSET ?`).bind(...values, (page - 1) * 20).all<Row>();
  // El listado no expone los datos bancarios ni las observaciones del detalle.
  const editions = await loadEditions(db, [...new Set(results.map(row => row.eventId))]);
  const items: AdminEnrollment[] = results.map(row => {
    const { phone, payerRut, bank, accountSuffix, observaciones, eventId, ...item } = mapRow(row);
    return { ...item, dates: (editions.get(row.eventId) ?? []).find(edition => edition.id === row.editionId)?.dates ?? [] };
  });
  return { items, total: count?.total ?? 0, page, pageSize: 20 };
}

export async function enrollmentDetail(db: D1Database, id: number): Promise<AdminEnrollmentDetail> {
  const row = await db.prepare(`${ROW} WHERE r.id=?`).bind(id).first<Row>();
  if (!row) throw new DecisionError('La inscripción no existe.', 404);
  let info: Record<string, unknown> = {};
  try { info = JSON.parse(row.observaciones ?? '{}') ?? {}; } catch { /* Observaciones antiguas de texto libre. */ }
  const [editions, decision, notification] = await Promise.all([
    loadEditions(db, [row.eventId]),
    db.prepare('SELECT accion AS action,motivo AS reason,creado_en AS date FROM reserva_decisiones WHERE reserva_id=?').bind(id).first<AdminEnrollmentDetail['decision']>(),
    db.prepare(`SELECT n.id,n.estado AS status,n.intentos AS attempts,n.asunto AS subject,n.mensaje AS message,n.enviado_en AS sentAt
      FROM notificaciones_reserva n JOIN reserva_decisiones d ON d.id=n.decision_id WHERE d.reserva_id=?`).bind(id).first<AdminEnrollmentDetail['notification']>(),

  ]);
  const { observaciones, eventId, ...item } = mapRow(row);
  const editionOptions = editions.get(row.eventId) ?? [];
  const selectedEdition = editionOptions.find(edition => edition.id === row.editionId);
  return { ...item, notes: typeof info.notes === 'string' ? info.notes : observaciones && !observaciones.trim().startsWith('{') ? observaciones : '',
    accountType: typeof info.tipoCuentaOrigen === 'string' ? info.tipoCuentaOrigen : '',
    canConfirm: !decision && row.status === 'RESERVADO' && Boolean(row.paid) && Boolean(selectedEdition && selectedEdition.status !== 'CANCELADO'),
    canCancel: !decision && ['RESERVADO', 'EN_ESPERA'].includes(row.status),
    dates: selectedEdition?.dates ?? [], dateMode: selectedEdition && selectedEdition.dates.length > 1 ? 'CONJUNTAS' : 'INDEPENDIENTES', editionOptions, needsEdition: !selectedEdition, decision, notification };
}

export interface DecisionInput { requestId: string; action: 'CONFIRMAR' | 'CANCELAR'; reason: string; paymentVerified: boolean }

// Corrección controlada de reservas antiguas cuya edición no se pudo deducir.
// No permite trasladar una reserva ya vinculada ni cambiar otras actividades.
export async function assignReservationEdition(db: D1Database, id: number, editionId: string, actor: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(editionId)) throw new DecisionError('Edición inválida.', 400);
  const before = await enrollmentDetail(db, id);
  if (before.editionId) {
    if (before.editionId === editionId) return before;
    throw new DecisionError('Esta reserva ya tiene una edición asignada.');
  }
  const result = await db.prepare(`UPDATE reservas SET edicion_id=?,actualizado_por=?,actualizado_en=unixepoch()
    WHERE id=? AND edicion_id IS NULL AND EXISTS (
      SELECT 1 FROM ediciones d JOIN eventos e ON e.id=d.evento_id
      WHERE d.id=? AND d.evento_id=reservas.evento_id
      AND EXISTS (SELECT 1 FROM fechas f WHERE f.edicion_id=d.id AND f.evento_id=d.evento_id)
      AND (reservas.estado NOT IN ('CONFIRMADO','RESERVADO') OR (reservas.estado='RESERVADO' AND reservas.expira_en IS NOT NULL AND reservas.expira_en<=unixepoch())
        OR e.controla_cupo=0 OR d.cupo_maximo IS NULL OR d.cupo_maximo > (
          SELECT COUNT(*) FROM reservas r WHERE r.id!=reservas.id AND r.evento_id=d.evento_id AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
          AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
      AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.id!=reservas.id AND r.edicion_id=d.id
        AND lower(r.reservado_por_correo)=lower(reservas.reservado_por_correo)
        AND (r.reservado_para_rut=reservas.reservado_para_rut OR (r.reservado_para_rut IS NULL AND reservas.reservado_para_rut IS NULL AND lower(r.reservado_para_nombre)=lower(reservas.reservado_para_nombre)))
        AND r.estado IN ('CONFIRMADO','RESERVADO','EN_ESPERA'))
    ) RETURNING id`).bind(editionId, actor, id, editionId).first();
  if (!result) throw new DecisionError('No se pudo asignar: revisa la actividad, sus cupos o una inscripción duplicada.');
  return enrollmentDetail(db, id);
}

export async function decideReservation(db: D1Database, id: number, actor: string, input: DecisionInput) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId) ||
      !['CONFIRMAR', 'CANCELAR'].includes(input.action) || typeof input.reason !== 'string' || input.reason.length > 500 ||
      (input.action === 'CANCELAR' && !input.reason.trim()) || (input.action === 'CONFIRMAR' && input.paymentVerified !== true)) {
    throw new DecisionError('Confirma la revisión del pago o indica el motivo de cancelación.', 400);
  }
  const before = await enrollmentDetail(db, id);
  const previous = await db.prepare('SELECT reserva_id,accion,motivo FROM reserva_decisiones WHERE id=?').bind(input.requestId).first<{ reserva_id: number; accion: string; motivo: string }>();
  const reason = input.action === 'CANCELAR' ? input.reason.trim() : '';
  if (previous) {
    if (previous.reserva_id !== id || previous.accion !== input.action || previous.motivo !== reason) throw new DecisionError('La solicitud ya fue utilizada.');
    return { detail: before, changed: false };
  }
  const confirm = input.action === 'CONFIRMAR';
  if (confirm ? !before.canConfirm : !before.canCancel) throw new DecisionError('La reserva cambió de estado, venció o ya fue revisada. Actualiza el detalle.');
  const target: ReservationStatus = confirm ? 'CONFIRMADO' : 'CANCELADO';
  const subject = `${confirm ? 'Inscripción confirmada' : 'Reserva cancelada'} — ${before.event} | Café Cabra`;
  const dateLines = before.dates.map(day => `${new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))} · ${day.schedule ?? 'Horario por confirmar'}`).join('\n');
  const message = `Hola ${before.attendee},\n\n${confirm ? `Tu pago fue validado y tu inscripción en ${before.event} está confirmada.` : `Tu reserva para ${before.event} fue cancelada.\nMotivo: ${reason}`}\n\n${dateLines ? `Fechas de tu inscripción:\n${dateLines}\n\n` : ''}Código de reserva: ${before.code}\n${confirm ? '¡Te esperamos!' : 'Si necesitas aclarar esta decisión, comunícate con Café Cabra.'}\n\nCafé Cabra Escuela`;
  // La primera sentencia valida vigencia bajo el mismo bloqueo de escritura que la
  // decisión, el cambio de estado y el correo. El cron y dos pestañas no pueden ganar a la vez.
  const batch = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO reserva_decisiones(id,reserva_id,accion,motivo,monto_esperado,administrador_id)
      SELECT ?,r.id,?,?,r.monto_esperado,? FROM reservas r JOIN eventos e ON e.id=r.evento_id JOIN tipo_evento t ON t.id=e.tipo_evento_id
      WHERE r.id=? AND (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()) ${confirm ? '' : "OR r.estado='EN_ESPERA'"})
      ${confirm ? "AND (t.requiere_pago=1 OR COALESCE(r.monto_esperado,e.precio)>0) AND EXISTS (SELECT 1 FROM ediciones ed WHERE ed.id=r.edicion_id AND ed.evento_id=r.evento_id AND ed.estado!='CANCELADO')" : ''}`)
      .bind(input.requestId, input.action, reason, actor, id),
    db.prepare(`UPDATE reservas SET estado=?,origen_confirmacion=CASE WHEN ?='CONFIRMADO' THEN 'MANUAL' ELSE origen_confirmacion END,
      confirmado_en=CASE WHEN ?='CONFIRMADO' THEN (SELECT creado_en FROM reserva_decisiones WHERE id=?) ELSE confirmado_en END,
      actualizado_por=(SELECT administrador_id FROM reserva_decisiones WHERE id=?),actualizado_en=(SELECT creado_en FROM reserva_decisiones WHERE id=?)
      WHERE id=? AND EXISTS (SELECT 1 FROM reserva_decisiones WHERE id=? AND reserva_id=? AND accion=? AND motivo=? AND administrador_id=?)`)
      .bind(target, target, target, input.requestId, input.requestId, input.requestId, id, input.requestId, id, input.action, reason, actor),
    db.prepare(`INSERT OR IGNORE INTO notificaciones_reserva(id,decision_id,destinatario,asunto,mensaje)
      SELECT ?,id,?,?,? FROM reserva_decisiones WHERE id=? AND reserva_id=?`)
      .bind(input.requestId, before.email, subject, message, input.requestId, id),
  ]);
  if (!batch[0].meta.changes) {
    const replay = await db.prepare('SELECT reserva_id,accion,motivo,administrador_id FROM reserva_decisiones WHERE id=?').bind(input.requestId).first<{ reserva_id: number; accion: string; motivo: string; administrador_id: string }>();
    if (replay?.reserva_id === id && replay.accion === input.action && replay.motivo === reason && replay.administrador_id === actor) return { detail: await enrollmentDetail(db, id), changed: false };
    throw new DecisionError('Otra acción ya procesó la reserva o venció su plazo. Actualiza el detalle.');
  }
  return { detail: await enrollmentDetail(db, id), changed: true };
}
