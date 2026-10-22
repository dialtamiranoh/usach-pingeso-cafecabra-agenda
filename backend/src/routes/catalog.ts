import { Hono } from 'hono';
import type { CatalogEvent } from '@cafecabra/shared';
import type { AppBindings } from '../config/bindings';

export const catalogRoutes = new Hono<{ Bindings: AppBindings }>();

export async function listEvents(database: D1Database, localPreview: boolean): Promise<CatalogEvent[]> {
  // Los cupos corresponden al evento completo, no a cada jornada.
  const { results: events } = await database.prepare(`
    SELECT e.id, e.nombre, e.descripcion, e.estado, e.precio, e.cupo_maximo,
      e.controla_cupo, e.incluye, e.incluye_certificado, t.nombre AS tipo,
      t.requiere_pago, u.nombre AS lugar, u.direccion,
      (SELECT valor FROM configuracion WHERE clave='evento:' || e.id || ':modalidad_fechas') AS modalidad_fechas,
      (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND
        (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND
        (r.expira_en IS NULL OR r.expira_en > unixepoch())))) AS ocupados,
      (SELECT m.url FROM evento_media m WHERE m.evento_id=e.id AND m.tipo='IMAGEN'
        ORDER BY m.es_principal DESC, m.orden, m.id LIMIT 1) AS imagen
    FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id
    JOIN ubicaciones u ON u.id=e.ubicacion_id
    WHERE ${localPreview ? "e.estado IN ('ABIERTO', 'BORRADOR')" : "e.estado='ABIERTO'"}
      AND t.activo=1 AND u.activo=1
      AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en > unixepoch())
    ORDER BY e.id
  `).all<{
    id: number; nombre: string; descripcion: string | null; estado: CatalogEvent['status'];
    precio: number; cupo_maximo: number | null; controla_cupo: number;
    incluye: string | null; incluye_certificado: number; tipo: string; requiere_pago: number;
    lugar: string; direccion: string | null; ocupados: number; imagen: string | null;
    modalidad_fechas: string | null;
  }>();
  if (!events.length) return [];
  const ids = events.map(event => event.id);
  const placeholders = ids.map(() => '?').join(',');
  const [dates, teachers] = await Promise.all([
    database.prepare(`SELECT id, evento_id, fecha, horario FROM fechas WHERE evento_id IN (${placeholders}) ORDER BY fecha, id`).bind(...ids)
      .all<{ id: number; evento_id: number; fecha: string; horario: string | null }>(),
    database.prepare(`SELECT ei.evento_id, i.nombre FROM evento_instructores ei JOIN instructores i ON i.id=ei.instructor_id WHERE ei.evento_id IN (${placeholders}) ORDER BY i.nombre`).bind(...ids)
      .all<{ evento_id: number; nombre: string }>(),
  ]);
  return events.map(event => ({
    id: String(event.id), title: event.nombre, description: event.descripcion ?? '',
    type: event.tipo, status: event.estado, price: event.precio, capacity: event.cupo_maximo,
    remainingSeats: !event.controla_cupo || event.cupo_maximo === null ? null : Math.max(0, event.cupo_maximo - event.ocupados),
    requiresPayment: Boolean(event.requiere_pago), location: [event.lugar, event.direccion].filter(Boolean).join(' · '),
    instructors: teachers.results.filter(row => row.evento_id === event.id).map(row => row.nombre),
    includes: event.incluye ?? '', certificate: Boolean(event.incluye_certificado), image: event.imagen,
    dateMode: event.modalidad_fechas === 'CONJUNTAS' ? 'CONJUNTAS' : 'INDEPENDIENTES',
    dates: dates.results.filter(row => row.evento_id === event.id).map(row => ({ id: String(row.id), date: row.fecha, schedule: row.horario })),
  }));
}

// Local y desarrollo permiten previsualizar cursos con información pendiente.
// Producción solo muestra eventos abiertos.
catalogRoutes.get('/catalogo', async c => c.json({
  events: await listEvents(c.env.cafe_cabra_agenda_db, ['local', 'staging'].includes(c.env.APP_ENV)),
}));
