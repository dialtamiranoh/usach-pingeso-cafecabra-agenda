import { env } from "cloudflare:workers";

export async function GET() {
  const body: Record<string, unknown> = {
    status: "ok",
    service: "cafe-cabra-agenda",
    time: new Date().toISOString(),
  };

  try {
    const { results } = await env.cafe_cabra_agenda_db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
         ORDER BY name`,
      )
      .all<{ name: string }>();
    body.database = "ok";
    body.tables = results.map((r) => r.name);
    body.tableCount = results.length;

    // Marcador de entorno: fila 'entorno' en configuracion
    const marca = await env.cafe_cabra_agenda_db
      .prepare(`SELECT valor FROM configuracion WHERE clave = 'entorno'`)
      .first<{ valor: string }>();
    body.entorno = marca?.valor ?? null;
  } catch (err) {
    body.status = "degraded";
    body.database = "error";
    body.error = err instanceof Error ? err.message : String(err);
  }

  return Response.json(body, { status: body.status === "ok" ? 200 : 503 });
}