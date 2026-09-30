import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar que viene de Resend
    const signature = request.headers.get("svix-signature");
    if (!signature) {
      return NextResponse.json({ error: "Sin firma" }, { status: 401 });
    }

    // 2. Obtener el body raw
    const body = await request.text();
    const payload = JSON.parse(body);

    // 3. Solo procesar eventos de correo recibido
    if (payload.type !== "email.received") {
      return NextResponse.json({ ok: true });
    }

    const email = payload.data;

    // 4. Extraer datos del correo
    console.log("=== CORREO RECIBIDO ===");
    console.log("De:", email.from);
    console.log("Asunto:", email.subject);
    console.log("--- HTML O TEXTO PLANO ---");
    console.log(email.html ? email.html : email.text);
    console.log("--- FIN ---");

    // 5. Por ahora solo loguear — sin base de datos todavía
    return NextResponse.json({ ok: true }, { status: 200 });

  } catch (error) {
    console.error("Error procesando webhook:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}