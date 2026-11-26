import { Resend } from 'resend';
import { REMITENTE, esc, fechaLarga, layout, encabezado, dataCard, callout, signoffCliente, textoAParrafo } from './plantilla';


export type DecisionEmailSender = (mail: { to: string; subject: string; text: string; html?: string; key: string }) => Promise<string>;

interface DecisionData {
  accion: string;
  motivo: string | null;
  code: string;
  attendee: string;
  event: string;
  dates: { date: string; schedule: string | null }[];
}

// Arma el correo de decisión con las mismas tarjetas que el resto (fechas, reserva, motivo).
function decisionHtml(d: DecisionData): string {
  const confirm = d.accion === 'CONFIRMAR';
  const head = encabezado(`¡Hola ${esc(d.attendee)}! 🐐`,
    confirm
      ? `Tu pago fue validado y tu inscripción en <strong style="color:#111111;">${esc(d.event)}</strong> quedó <strong style="color:#111111;">confirmada</strong>.`
      : `Tu reserva para <strong style="color:#111111;">${esc(d.event)}</strong> fue cancelada.`);
  const fechas = d.dates.length
    ? dataCard('Fechas de tu inscripción', d.dates.map(x => [fechaLarga(x.date), x.schedule ?? 'Horario por confirmar']))
    : '';
  const reserva = dataCard('Tu reserva', [['Código', d.code]]);
  const motivo = !confirm && d.motivo ? dataCard('Motivo de la cancelación', [['Motivo', d.motivo]]) : '';
  const aviso = confirm
    ? callout('¡Te esperamos! ☕ Guarda tu código de reserva por si necesitas contactarnos.')
    : callout('Si necesitas aclarar esta decisión, comunícate con Café Cabra.');
  return layout(`${head}${fechas}${reserva}${motivo}${aviso}${signoffCliente}`);
}

// Reconsulta los datos estructurados de la decisión para reconstruir el correo con tarjetas,
// sin tocar la cola (notificaciones_reserva sigue guardando solo el texto plano).
async function cargarDatosDecision(db: D1Database, id: string): Promise<DecisionData | null> {
  const base = await db.prepare(`SELECT d.accion AS accion, d.motivo AS motivo, r.codigo AS code,
      r.reservado_para_nombre AS attendee, e.nombre AS event, r.edicion_id AS edicionId
    FROM reserva_decisiones d JOIN reservas r ON r.id=d.reserva_id JOIN eventos e ON e.id=r.evento_id
    WHERE d.id=?`).bind(id).first<{ accion: string; motivo: string | null; code: string; attendee: string; event: string; edicionId: number | null }>();
  if (!base) return null;
  const dates = base.edicionId
    ? (await db.prepare(`SELECT fecha AS date, horario AS schedule FROM fechas WHERE edicion_id=? ORDER BY fecha, id`)
        .bind(base.edicionId).all<{ date: string; schedule: string | null }>()).results
    : [];
  return { accion: base.accion, motivo: base.motivo, code: base.code, attendee: base.attendee, event: base.event, dates };
}

export async function sendDecisionNotification(db: D1Database, id: string, apiKey?: string, testSender?: DecisionEmailSender) {
  // Sin clave, el mensaje permanece pendiente; nunca se simula un envío exitoso.
  if (!apiKey && !testSender) return;
  const mail = await db.prepare(`UPDATE notificaciones_reserva SET estado='ENVIANDO',bloqueado_en=unixepoch(),intentos=intentos+1
    WHERE id=? AND (estado IN ('PENDIENTE','ERROR') OR (estado='ENVIANDO' AND bloqueado_en<unixepoch()-300))
    RETURNING destinatario,asunto,mensaje,intentos`).bind(id).first<{ destinatario: string; asunto: string; mensaje: string; intentos: number }>();
  if (!mail) return;
  try {
    // Versión con tarjetas reconstruida desde la base; si no se puede, se envuelve el texto.
    const datos = await cargarDatosDecision(db, id);
    const html = datos ? decisionHtml(datos) : layout(textoAParrafo(mail.mensaje));
    const sender: DecisionEmailSender = testSender ?? (async input => {
      const result = await new Resend(apiKey).emails.send({ from: REMITENTE, to: [input.to], subject: input.subject, text: input.text, html: input.html }, { idempotencyKey: input.key });
      if (result.error || !result.data?.id) throw new Error('El proveedor no aceptó el correo');
      return result.data.id;
    });
    const providerId = await sender({ to: mail.destinatario, subject: mail.asunto, text: mail.mensaje, html, key: `reserva-decision-${id}` });
    await db.prepare("UPDATE notificaciones_reserva SET estado='ENVIADO',enviado_en=unixepoch(),proveedor_id=?,bloqueado_en=NULL WHERE id=? AND intentos=? AND estado='ENVIANDO'").bind(providerId, id, mail.intentos).run();
  } catch {
    await db.prepare("UPDATE notificaciones_reserva SET estado='ERROR',bloqueado_en=NULL WHERE id=? AND intentos=? AND estado='ENVIANDO'").bind(id, mail.intentos).run();
    console.error('No se pudo enviar la notificación de decisión de reserva.');
  }
}