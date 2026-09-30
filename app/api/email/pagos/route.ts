import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";
import { simpleParser } from "mailparser";

export async function POST(request: NextRequest) {
  try {
    const from = request.headers.get("X-Email-From");
    const to = request.headers.get("X-Email-To");

    // Validar destinatario
    if (to && !to.toLowerCase().includes("pagos@cafecabra.cl")) {
      console.log(`[IGNORADO] Correo recibido para ${to}, no corresponde a pagos.`);
      return NextResponse.json(
        { message: "Correo ignorado: el destinatario no es pagos@cafecabra.cl" },
        { status: 200 }
      );
    }

    const rawEmail = await request.arrayBuffer();

    // Parsear el correo RFC822
    const parsed = await simpleParser(Buffer.from(rawEmail));
    const contenido = parsed.text ?? (parsed.html ? convert(parsed.html, { wordwrap: false }) : "");

    // Normalizar 'from' y 'to' para evitar errores si son arreglos
    const fromText = Array.isArray(parsed.from)
      ? parsed.from.map((a) => a.text).join(", ")
      : parsed.from?.text;

    const toText = Array.isArray(parsed.to)
      ? parsed.to.map((a) => a.text).join(", ")
      : parsed.to?.text;

    console.log("=== CORREO RECIBIDO VIA CLOUDFLARE EMAIL ROUTING ===");
    console.log("De:", from ?? fromText);
    console.log("Para:", to ?? toText);
    console.log("Asunto:", parsed.subject);
    console.log("--- CONTENIDO ---");
    console.log(contenido);
    console.log("--- FIN ---");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error procesando email:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}