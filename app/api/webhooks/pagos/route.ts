import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("svix-signature");
    if (!signature) {
      return NextResponse.json({ error: "Sin firma" }, { status: 401 });
    }

    const body = await request.text();
    const payload = JSON.parse(body);

    if (payload.type !== "email.received") {
      return NextResponse.json({ ok: true });
    }

    const email = payload.data;
    const emailId = email.email_id;

    const resendResponse = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });

    if (!resendResponse.ok) {
      console.error("Error obteniendo correo de Resend:", resendResponse.status);
      return NextResponse.json({ error: "Error obteniendo correo" }, { status: 500 });
    }

    const fullEmail = await resendResponse.json() as {
      from: string;
      subject: string;
      text: string | null;
      html: string | null;
    };

    // Usar texto plano si existe, sino extraer del HTML
    const contenido = fullEmail.text ??
      (fullEmail.html ? convert(fullEmail.html, { wordwrap: false }) : "");

    console.log("=== CORREO RECIBIDO ===");
    console.log("De:", fullEmail.from);
    console.log("Asunto:", fullEmail.subject);
    console.log("--- CONTENIDO ---");
    console.log(contenido);
    console.log("--- FIN ---");

    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error("Error procesando webhook:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}