import { NextRequest, NextResponse } from "next/server";
import { convert } from "html-to-text";
import { simpleParser } from "mailparser";

export async function POST(request: NextRequest) {
  try {
    const from = request.headers.get("X-Email-From");
    const to = request.headers.get("X-Email-To");
    const rawEmail = await request.arrayBuffer();
    
    // Parsear el correo RFC822
    const parsed = await simpleParser(Buffer.from(rawEmail));
    
    const contenido = parsed.text ?? 
      (parsed.html ? convert(parsed.html, { wordwrap: false }) : "");

    console.log("=== CORREO RECIBIDO VIA CLOUDFLARE EMAIL ROUTING ===");
    console.log("De:", from ?? parsed.from?.text);
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