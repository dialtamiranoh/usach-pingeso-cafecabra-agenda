import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { convert } from "html-to-text";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const emailId = payload.data.email_id;

    // Obtener contenido completo del correo inbound
    const { data: fullEmail, error } = await (resend.emails as any).receiving.get(emailId);

    if (error || !fullEmail) {
      console.error("Error obteniendo correo:", error);
      return NextResponse.json({ error: "Error obteniendo correo" }, { status: 500 });
    }

    // Extraer contenido como texto plano
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