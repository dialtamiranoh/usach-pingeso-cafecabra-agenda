import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppBindings } from '../config/bindings';
import type { AdminPanelResponse, AdminEventoProximo, AdminInscripcionReciente, AdminSemana } from '@cafecabra/shared';
import { createDb } from '../db';

export const adminRoutes = new Hono<{ Bindings: AppBindings }>();

// Reserva "activa": confirmada, o reservada dentro de su plazo de pago. Misma lógica que el
// flujo de inscripción, para que los conteos del panel no incluyan reservas vencidas.
const RESERVA_ACTIVA = sql`(estado='CONFIRMADO' OR (estado='RESERVADO' AND (expira_en IS NULL OR expira_en>unixepoch())))`;

// Traduce el estado almacenado a la etiqueta que muestra el panel (y que usa estadoClase en el front).
function etiquetaEstadoReserva(estado: string): string {
  const mapa: Record<string, string> = {
    RESERVADO: 'Reservado', EN_ESPERA: 'En espera', CONFIRMADO: 'Confirmado',
    EXPIRADO: 'Expirado', CANCELADO: 'Cancelado',
  };
  return mapa[estado] ?? estado;
}

function etiquetaEstadoEvento(estado: string): string {
  const mapa: Record<string, string> = {
    BORRADOR: 'Borrador', ABIERTO: 'Abierto', CERRADO: 'Cerrado', CANCELADO: 'Cancelado',
  };
  return mapa[estado] ?? estado;
}

// Arma el texto de cupos: "ocupados / total" cuando el evento controla cupo, o "Sin límite".
function textoCupos(controlaCupo: number, cupoMaximo: number | null, ocupados: number): string {
  if (!controlaCupo || cupoMaximo === null) return 'Sin límite';
  return `${ocupados} / ${cupoMaximo}`;
}

adminRoutes.get('/admin/panel', async c => {
  // Panel de evaluación: disponible solo en local y staging, nunca en producción.
  if (!['local', 'staging'].includes(c.env.APP_ENV)) return c.json({ error: 'Ruta no encontrada' }, 404);

  const db = createDb(c.env.cafe_cabra_agenda_db);

  // --- Tarjetas resumen (una sola consulta con subconsultas) ---
  const resumenRows = await db.all<{
    eventos_activos: number; cursos_activos: number; catas_activos: number;
    inscritos_mes: number; reservas_pendientes: number; monto_reservado_mes: number;
  }>(sql`
    SELECT
      (SELECT COUNT(*) FROM eventos WHERE estado='ABIERTO') AS eventos_activos,
      (SELECT COUNT(*) FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id WHERE e.estado='ABIERTO' AND t.nombre='Curso') AS cursos_activos,
      (SELECT COUNT(*) FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id WHERE e.estado='ABIERTO' AND t.nombre='Cata') AS catas_activos,
      (SELECT COUNT(*) FROM reservas WHERE strftime('%Y-%m', creado_en, 'unixepoch')=strftime('%Y-%m','now') AND ${RESERVA_ACTIVA}) AS inscritos_mes,
      (SELECT COUNT(*) FROM reservas WHERE estado='RESERVADO' AND (expira_en IS NULL OR expira_en>unixepoch())) AS reservas_pendientes,
      (SELECT COALESCE(SUM(e.precio),0) FROM reservas r JOIN eventos e ON e.id=r.evento_id
         WHERE strftime('%Y-%m', r.creado_en, 'unixepoch')=strftime('%Y-%m','now')
           AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))) AS monto_reservado_mes
  `);
  const r = resumenRows[0];

  // --- Próximos eventos (abiertos o cerrados, por fecha más cercana) ---
  const eventoRows = await db.all<{
    id: number; nombre: string; tipo: string; estado: string;
    cupo_maximo: number | null; controla_cupo: number; proxima_fecha: string | null; ocupados: number;
  }>(sql`
    SELECT e.id, e.nombre, t.nombre AS tipo, e.estado, e.cupo_maximo, e.controla_cupo,
      (SELECT MIN(f.fecha) FROM fechas f WHERE f.evento_id=e.id AND f.fecha>=date('now')) AS proxima_fecha,
      (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND ${RESERVA_ACTIVA}) AS ocupados
    FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id
    WHERE e.estado IN ('ABIERTO','CERRADO')
    ORDER BY proxima_fecha IS NULL, proxima_fecha ASC
    LIMIT 6
  `);
  const proximosEventos: AdminEventoProximo[] = eventoRows.map(e => ({
    id: e.id, nombre: e.nombre, tipo: e.tipo,
    fecha: e.proxima_fecha, cupos: textoCupos(e.controla_cupo, e.cupo_maximo, e.ocupados),
    estado: etiquetaEstadoEvento(e.estado),
  }));

  // --- Últimas inscripciones ---
  const inscripcionRows = await db.all<{ id: number; alumno: string; evento: string; estado: string; creado_en: number }>(sql`
    SELECT r.id, r.reservado_para_nombre AS alumno, e.nombre AS evento, r.estado, r.creado_en AS creado_en
    FROM reservas r JOIN eventos e ON e.id=r.evento_id
    ORDER BY r.creado_en DESC, r.id DESC
    LIMIT 6
  `);
  const inscripcionesRecientes: AdminInscripcionReciente[] = inscripcionRows.map(i => ({
    id: i.id, alumno: i.alumno, evento: i.evento,
    estado: etiquetaEstadoReserva(i.estado), creadoEn: i.creado_en,
  }));

  // --- Inscripciones por semana (últimas 4 semanas, 0 = semana en curso) ---
  const semanaRows = await db.all<{ semana_offset: number; total: number }>(sql`
    SELECT CAST((julianday('now') - julianday(creado_en, 'unixepoch')) / 7 AS INTEGER) AS semana_offset, COUNT(*) AS total
    FROM reservas
    WHERE creado_en >= unixepoch('now','-28 days')
    GROUP BY semana_offset
  `);
  const porOffset = new Map<number, number>();
  for (const fila of semanaRows) porOffset.set(fila.semana_offset, fila.total);
  // Se ordena de la más antigua (Sem 1) a la actual (Sem 4), la última marcada con acento.
  const inscripcionesPorSemana: AdminSemana[] = [3, 2, 1, 0].map((offset, indice) => ({
    label: `Sem ${indice + 1}`, valor: porOffset.get(offset) ?? 0, acento: offset === 0,
  }));

  const payload: AdminPanelResponse = {
    stats: {
      eventosActivos: r.eventos_activos,
      cursosActivos: r.cursos_activos,
      catasActivos: r.catas_activos,
      inscritosMes: r.inscritos_mes,
      reservasPendientes: r.reservas_pendientes,
      montoReservadoMes: r.monto_reservado_mes,
    },
    proximosEventos,
    inscripcionesRecientes,
    inscripcionesPorSemana,
  };
  return c.json(payload);
});