import { Resend } from 'resend';

export type DecisionEmailSender = (mail: { to: string; subject: string; text: string; key: string }) => Promise<string>;

export async function sendDecisionNotification(db: D1Database, id: string, apiKey?: string, testSender?: DecisionEmailSender) {
  // Sin clave, el mensaje permanece pendiente; nunca se simula un envío exitoso.
  if (!apiKey && !testSender) return;
  const mail = await db.prepare(`UPDATE notificaciones_reserva SET estado='ENVIANDO',bloqueado_en=unixepoch(),intentos=intentos+1
    WHERE id=? AND (estado IN ('PENDIENTE','ERROR') OR (estado='ENVIANDO' AND bloqueado_en<unixepoch()-300))
    RETURNING destinatario,asunto,mensaje,intentos`).bind(id).first<{ destinatario: string; asunto: string; mensaje: string; intentos: number }>();
  if (!mail) return;
  try {
    const sender: DecisionEmailSender = testSender ?? (async input => {
      const result = await new Resend(apiKey).emails.send({ from: 'Café Cabra <no-reply@cafecabra.cl>', to: [input.to], subject: input.subject, text: input.text }, { idempotencyKey: input.key });
      if (result.error || !result.data?.id) throw new Error('El proveedor no aceptó el correo');
      return result.data.id;
    });
    const providerId = await sender({ to: mail.destinatario, subject: mail.asunto, text: mail.mensaje, key: `reserva-decision-${id}` });
    await db.prepare("UPDATE notificaciones_reserva SET estado='ENVIADO',enviado_en=unixepoch(),proveedor_id=?,bloqueado_en=NULL WHERE id=? AND intentos=? AND estado='ENVIANDO'").bind(providerId, id, mail.intentos).run();
  } catch {
    await db.prepare("UPDATE notificaciones_reserva SET estado='ERROR',bloqueado_en=NULL WHERE id=? AND intentos=? AND estado='ENVIANDO'").bind(id, mail.intentos).run();
    console.error('No se pudo enviar la notificación de decisión de reserva.');
  }
}
