import { convert } from "html-to-text";
import { simpleParser } from "mailparser";
import { Resend } from "resend";
import { REMITENTE, esc, asunto, layout, encabezado, dataCard, callout, signoffCliente, signoffAdmin } from "./plantilla";

export async function receivePaymentEmail(request: Request, apiKey: string) {
  const resend = new Resend(apiKey);
  try {
    const fromHeader = request.headers.get("X-Email-From");
    const toHeader = request.headers.get("X-Email-To");

    if (toHeader && !toHeader.toLowerCase().includes("pagos@cafecabra.cl")) {
      console.log(`[IGNORADO] Correo recibido para ${toHeader}, no corresponde a pagos.`);
      return Response.json(
        { message: "Correo ignorado: el destinatario no es pagos@cafecabra.cl" },
        { status: 200 }
      );
    }

    const rawEmail = await request.arrayBuffer();
    const parsed = await simpleParser(Buffer.from(rawEmail));
    const contenido = parsed.text ?? (parsed.html ? convert(parsed.html, { wordwrap: false }) : "");
    const contenidoEscapado = esc(contenido);

    const contenidoHtml = parsed.html
      ? `<div style="margin-top:12px;">${parsed.html}</div>`
      : contenidoEscapado.trim()
        ? `<pre style="background-color: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${contenidoEscapado}</pre>`
        : `<p style="color:#94a3b8;font-size:13px;font-style:italic;">Sin contenido de texto en el correo original.</p>`;

    const senderEmail = parsed.from?.value[0]?.address || fromHeader;
    const senderName = parsed.from?.value[0]?.name || "Cliente";
    const asuntoRecibido = parsed.subject || "Comprobante de Pago";

    console.log("=== CORREO RECIBIDO VIA CLOUDFLARE EMAIL ROUTING ===");
    console.log("De:", senderEmail);
    console.log("Asunto:", asuntoRecibido);

    const allAttachments = parsed.attachments ?? [];
    const attachmentPlaceholder = allAttachments.length > 0
      ? callout(`📎 Este correo incluye ${allAttachments.length} archivo(s) adjunto(s). Revisa los adjuntos de este correo.`)
      : '';

    const emailTasks = [];

    // 1. Notificación al admin, con el comprobante y los datos del remitente.
    const adminBody = `${encabezado('Nuevo comprobante recibido 💳',
      'Se recibió un comprobante de transferencia en <strong style="color:#111111;">pagos@cafecabra.cl</strong>. Revisa los datos y valida el pago.')}
      ${dataCard('Remitente', [
        ['Nombre', senderName],
        ['Email', senderEmail ?? '-'],
        ['Asunto', asuntoRecibido],
      ])}
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:20px;">
        <tr><td style="padding:20px 24px;">
          <p style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#999999;margin:0 0 14px 0;">Mensaje</p>
          <div style="font-size:13px;color:#111111;line-height:1.6;">${contenidoHtml}</div>
        </td></tr>
      </table>
      ${attachmentPlaceholder}
      ${signoffAdmin}`;

    emailTasks.push(
      resend.emails.send({
        from: REMITENTE,
        to: ["reservas@cafecabra.cl"],
        subject: asunto(`Nueva transferencia: ${asuntoRecibido}`),
        html: layout(adminBody),
        attachments: allAttachments.map(att => ({
          filename: att.filename ?? 'adjunto',
          content: att.content,
        })),
      })
    );

    // 2. Respuesta automática al cliente que envió el comprobante.
    if (senderEmail) {
      const clienteBody = `${encabezado(`¡Hola ${esc(senderName)}! 🐐`,
        'Recibimos tu comprobante de transferencia. Nuestro equipo está validando el pago para confirmar tu reserva.')}
        ${callout('Te contactaremos a la brevedad para confirmar tu cupo una vez que validemos la transferencia.')}
        ${signoffCliente}`;
      emailTasks.push(
        resend.emails.send({
          from: REMITENTE,
          to: [senderEmail],
          subject: asunto('¡Recibimos tu comprobante!'),
          html: layout(clienteBody),
        })
      );
    }

    const results = await Promise.allSettled(emailTasks);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error enviando correo ${index === 0 ? 'al admin' : 'al cliente'}:`, result.reason);
      }
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando email:", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}