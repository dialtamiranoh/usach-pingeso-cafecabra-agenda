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

    const contenidoEscapado = contenido
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const contenidoHtml = parsed.html
      ? `<div style="margin-top:12px;">${parsed.html}</div>`
      : contenidoEscapado.trim()
        ? `<pre style="background-color: #f8fafc; padding: 12px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 13px;">${contenidoEscapado}</pre>`
        : `<p style="color:#94a3b8;font-size:13px;font-style:italic;">Sin contenido de texto en el correo original.</p>`;
        
    const senderEmail = parsed.from?.value[0]?.address || fromHeader;
    const senderName = parsed.from?.value[0]?.name || "Cliente";
    const asunto = parsed.subject || "Comprobante de Pago";

    console.log("=== CORREO RECIBIDO VIA CLOUDFLARE EMAIL ROUTING ===");
    console.log("De:", senderEmail);
    console.log("Asunto:", asunto);

    const allAttachments = parsed.attachments ?? [];

    const attachmentPlaceholder = allAttachments.length > 0
      ? `
        <div style="background:#fff8e7;border:1px solid #f0c040;border-radius:6px;padding:12px;margin-top:16px;">
          <p style="margin:0;font-size:13px;color:#7a5c00;">
            📎 Este correo incluye ${allAttachments.length} archivo(s) adjunto(s) — revisa los archivos adjuntos de este correo.
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
        subject: `[Nueva transferencia] ${asunto} | Café Cabra`,
        html: `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
          <tr>
            <td align="center" style="padding:32px 16px;">

              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

                <!-- HEADER -->
                <tr>
                  <td style="background:#111111;padding:32px 40px;text-align:center;">
                    <img src="https://pub-6fc1f2fb2aec478bb0722992c847da9a.r2.dev/CAFE%20CABRA%20ESCUELA%20BLANCO.png"
                        alt="Café Cabra Escuela" width="200"
                        style="height:auto;display:block;margin:0 auto;border:0;">
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="padding:40px 40px 32px;">

                    <h2 style="font-size:20px;color:#111111;margin:0 0 10px 0;">Nuevo comprobante recibido 💳</h2>
                    <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">
                      Se recibió un comprobante de transferencia en <strong style="color:#111111;">pagos@cafecabra.cl</strong>. Revisa los datos y valida el pago.
                    </p>

                    <!-- REMITENTE -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#999999;margin:0 0 14px 0;">Remitente</p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size:13px;color:#999999;padding:6px 0;width:42%;vertical-align:top;">Nombre</td>
                              <td style="font-size:13px;color:#111111;font-weight:500;padding:6px 0;vertical-align:top;">${senderName}</td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#999999;padding:6px 0;vertical-align:top;">Email</td>
                              <td style="font-size:13px;color:#111111;font-weight:500;padding:6px 0;vertical-align:top;">${senderEmail}</td>
                            </tr>
                            <tr>
                              <td style="font-size:13px;color:#999999;padding:6px 0;vertical-align:top;">Asunto</td>
                              <td style="font-size:13px;color:#111111;font-weight:500;padding:6px 0;vertical-align:top;">${asunto}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- MENSAJE -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#999999;margin:0 0 14px 0;">Mensaje</p>
                          <div style="font-size:13px;color:#111111;line-height:1.6;">
                            ${contenidoHtml}
                          </div>
                          ${attachmentPlaceholder}
                        </td>
                      </tr>
                    </table>

                    <!-- CALLOUT -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background:#fff8e7;border-left:4px solid #f3b228;border-radius:4px;padding:14px 18px;font-size:13px;color:#666666;line-height:1.6;">
                          Este correo puede incluir <strong style="color:#111111;">archivos adjuntos</strong> con el comprobante de transferencia.
                        </td>
                      </tr>
                    </table>

                    <p style="font-size:14px;color:#666666;line-height:1.7;margin:0;">
                      <strong style="color:#111111;">Café Cabra Escuela</strong>
                    </p>

                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background:#111111;padding:20px 40px;text-align:center;">
                    <p style="font-size:11px;color:#777777;margin:0;">
                      <a href="https://cafecabra.cl" style="color:#aaaaaa;text-decoration:none;">cafecabra.cl</a>
                      <span style="color:#444444;margin:0 8px;">·</span>
                      <a href="https://www.instagram.com/cafecabra/" style="color:#aaaaaa;text-decoration:none;">@cafecabra</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>

        </body>
        </html>`,
        attachments: allAttachments.map(att => ({
          filename: att.filename ?? 'adjunto',
          content: att.content,
        })),
      })
    );

    // 2. Respuesta automática al cliente
    if (senderEmail) {
      emailTasks.push(
        resend.emails.send({
          from: "Café Cabra <no-reply@cafecabra.cl>",
          to: [senderEmail],
          subject: `¡Recibimos tu comprobante! | Café Cabra`,
          html: `<!DOCTYPE html>
          <html>
          <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
            <tr>
              <td align="center" style="padding:32px 16px;">

                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:#111111;padding:32px 40px;text-align:center;">
                      <img src="https://pub-6fc1f2fb2aec478bb0722992c847da9a.r2.dev/CAFE%20CABRA%20ESCUELA%20BLANCO.png"
                          alt="Café Cabra Escuela" width="200"
                          style="height:auto;display:block;margin:0 auto;border:0;">
                    </td>
                  </tr>

                  <!-- BODY -->
                  <tr>
                    <td style="padding:40px 40px 32px;">

                      <h2 style="font-size:20px;color:#111111;margin:0 0 10px 0;">¡Hola ${senderName}! 🐐</h2>
                      <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">
                        Recibimos tu comprobante de transferencia. Nuestro equipo está validando el pago para confirmar tu reserva.
                      </p>

                      <!-- CALLOUT -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                        <tr>
                          <td style="background:#fff8e7;border-left:4px solid #f3b228;border-radius:4px;padding:14px 18px;font-size:13px;color:#666666;line-height:1.6;">
                            Te contactaremos a la brevedad para confirmar tu cupo una vez que validemos la transferencia.
                          </td>
                        </tr>
                      </table>

                      <p style="font-size:14px;color:#666666;line-height:1.7;margin:0;">
                        ¡Nos vemos pronto! ☕<br>
                        <strong style="color:#111111;">Café Cabra Escuela</strong>
                      </p>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#111111;padding:20px 40px;text-align:center;">
                      <p style="font-size:11px;color:#777777;margin:0;">
                        Este es un mensaje automático, por favor no respondas a este correo.<br><br>
                        <a href="https://cafecabra.cl" style="color:#aaaaaa;text-decoration:none;">cafecabra.cl</a>
                        <span style="color:#444444;margin:0 8px;">·</span>
                        <a href="https://www.instagram.com/cafecabra/" style="color:#aaaaaa;text-decoration:none;">@cafecabra</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

          </body>
          </html>`,
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