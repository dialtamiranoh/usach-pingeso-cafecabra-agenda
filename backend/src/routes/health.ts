import type { HealthResponse } from '@cafecabra/shared';
import type { AppBindings } from '../config/bindings';

export async function checkHealth(env: AppBindings): Promise<HealthResponse> {
  const body: HealthResponse = {
    status: 'ok', service: 'cafe-cabra-agenda', time: new Date().toISOString(), environment: env.APP_ENV,
  };
  try {
    const { results } = await env.cafe_cabra_agenda_db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name`,
    ).all<{ name: string }>();
    body.database = 'ok';
    body.tables = results.map(row => row.name);
    body.tableCount = results.length;
    const marker = await env.cafe_cabra_agenda_db.prepare(
      `SELECT valor FROM configuracion WHERE clave = 'entorno'`,
    ).first<{ valor: string }>();
    body.entorno = marker?.valor ?? null;
  } catch (error) {
    body.status = 'degraded';
    body.database = 'error';
    // Conserva el diagnóstico en los logs sin exponer detalles SQL al público.
    console.error('Health: error consultando D1', error instanceof Error ? error.message : String(error));
    body.error = 'No se pudo verificar la base de datos';
  }
  return body;
}
