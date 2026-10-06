import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";
import { simpleParser } from "mailparser";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const fromHeader = request.headers.get("X-Email-From");
    const toHeader = request.headers.get("X-Email-To");

    if (toHeader && !toHeader.toLowerCase().includes("pagos@cafecabra.cl")) {
      console.log(`[IGNORADO] Correo recibido para ${toHeader}, no corresponde a pagos.`);
      return NextResponse.json(
        { message: "Correo ignorado: el destinatario no es pagos@cafecabra.cl" },
        { status: 200 }
      );
    }

    const rawEmail = await request.arrayBuffer();
    const parsed = await simpleParser(Buffer.from(rawEmail));
    const contenido = parsed.text ?? (parsed.html ? convert(parsed.html, { wordwrap: false }) : "");

    const senderEmail = parsed.from?.value[0]?.address || fromHeader;
    const senderName = parsed.from?.value[0]?.name || "Cliente";
    const asunto = parsed.subject || "Comprobante de Pago";

    console.log("=== CORREO RECIBIDO VIA CLOUDFLARE EMAIL ROUTING ===");
    console.log("De:", senderEmail);
    console.log("Asunto:", asunto);

    const imageAttachments = parsed.attachments?.filter(att =>
      att.contentType.startsWith('image/')
    ) ?? [];

    const attachmentPlaceholder = imageAttachments.length > 0
      ? `
        <div style="background:#fff8e7;border:1px solid #f0c040;border-radius:6px;padding:12px;margin-top:16px;">
          <p style="margin:0;font-size:13px;color:#7a5c00;">
            📎 Este correo incluye ${imageAttachments.length} imagen(es) adjunta(s) — revisa los archivos adjuntos de este correo.
          </p>
        </div>
      `
      : '';

    const emailTasks = [];

    // 1. Notificación al admin
    emailTasks.push(
      resend.emails.send({
        from: "Café Cabra <no-reply@cafecabra.cl>",
        to: ["reservas@cafecabra.cl"],
        subject: `⚠️ Comprobante / Transferencia Recibida: ${asunto}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <h2 style="color: #4a2c11; margin-top: 0;">Nuevo comprobante recibido en pagos@cafecabra.cl</h2>
            <p><strong>Remitente:</strong> ${senderName} (${senderEmail})</p>
            <p><strong>Asunto:</strong> ${asunto}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <pre style="background-color: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${contenido}</pre>
            ${attachmentPlaceholder}
          </div>
        `,
        attachments: parsed.attachments?.map(att => ({
          filename: att.filename ?? 'adjunto',
          content: att.content,
        })) ?? [],
      })
    );

    // 2. Respuesta automática al cliente
    if (senderEmail) {
      emailTasks.push(
        resend.emails.send({
          from: "Café Cabra <no-reply@cafecabra.cl>",
          to: [senderEmail],
          subject: `Confirmación de Recepción - ${asunto}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
              <h2 style="color: #4a2c11; margin-top: 0;">¡Hola ${senderName}!</h2>
              <p style="color: #334155; font-size: 16px; line-height: 1.5;">
                Hemos recibido tu comprobante de transferencia o notificación de pago.
              </p>
              <p style="color: #334155; font-size: 14px;">
                Nuestro equipo se encuentra validando los datos para confirmar tu reserva.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
            </div>
          `,
        })
      );
    }

    const results = await Promise.allSettled(emailTasks);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error enviando correo ${index === 0 ? 'al admin' : 'al cliente'}:`, result.reason);
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando email:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}