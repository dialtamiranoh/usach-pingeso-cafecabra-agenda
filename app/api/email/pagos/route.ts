import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";
import { simpleParser } from "mailparser";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const R2_PUBLIC_URL = "https://pub-6fc1f2fb2aec478bb0722992c847da9a.r2.dev";

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

    // Subir imágenes a R2 y generar URLs públicas
    const r2 = (request as any).env?.R2_PAGOS;
    const imageAttachments = parsed.attachments?.filter(att =>
      att.contentType.startsWith('image/')
    ) ?? [];

    const imageUrls: string[] = [];
    if (r2) {
      for (const att of imageAttachments) {
        const key = `comprobantes/${Date.now()}-${att.filename ?? 'imagen'}`;
        await r2.put(key, att.content, {
          httpMetadata: { contentType: att.contentType }
        });
        imageUrls.push(`${R2_PUBLIC_URL}/${key}`);
      }
    }

    const imagesHtml = imageUrls.map(url =>
      `<img src="${url}" style="max-width:100%;border-radius:6px;margin-top:12px;" />`
    ).join('');

    const emailTasks = [];

    // 1. Respuesta automática al cliente
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

    // 2. Notificación al admin
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
            ${parsed.html
              ? `<div>${parsed.html}</div>`
              : `<pre style="background-color: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${contenido}</pre>`
            }
            ${imagesHtml}
          </div>
        `,
        attachments: parsed.attachments
          ?.filter(att => !att.contentType.startsWith('image/'))
          .map(att => ({
            filename: att.filename ?? 'adjunto',
            content: att.content,
          })) ?? [],
      })
    );

    await Promise.all(emailTasks);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando email:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}