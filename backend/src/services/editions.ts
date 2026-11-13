import type { CatalogEdition } from '@cafecabra/shared';

export type EditionRow = { id: string; evento_id: number; cupo_maximo: number | null; controla_cupo: number; estado: CatalogEdition['status']; ocupados: number };
export async function loadEditions(db: D1Database, eventIds: number[]) {
  if (!eventIds.length) return new Map<number, CatalogEdition[]>();
  const marks = eventIds.map(() => '?').join(',');
  const [editions, dates] = await Promise.all([
    db.prepare(`SELECT d.id,d.evento_id,d.cupo_maximo,d.estado,e.controla_cupo,
      (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=d.evento_id
        AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
        AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))) AS ocupados
      FROM ediciones d JOIN eventos e ON e.id=d.evento_id WHERE d.evento_id IN (${marks}) ORDER BY d.id`).bind(...eventIds).all<EditionRow>(),
    db.prepare(`SELECT f.id,f.edicion_id,f.fecha,f.horario FROM fechas f JOIN ediciones d ON d.id=f.edicion_id AND d.evento_id=f.evento_id
      WHERE f.evento_id IN (${marks}) ORDER BY f.fecha,f.id`).bind(...eventIds).all<{ id: number; edicion_id: string; fecha: string; horario: string | null }>(),
  ]);
  const groups = new Map<number, CatalogEdition[]>();
  for (const row of editions.results) {
    const edition: CatalogEdition = { id: row.id, status: row.estado, capacity: row.cupo_maximo,
      remainingSeats: !row.controla_cupo || row.cupo_maximo === null ? null : Math.max(0, row.cupo_maximo - row.ocupados),
      dates: dates.results.filter(day => day.edicion_id === row.id).map(day => ({ id: String(day.id), date: day.fecha, schedule: day.horario })),
    };
    groups.set(row.evento_id, [...(groups.get(row.evento_id) ?? []), edition]);
  }
  for (const values of groups.values()) values.sort((a, b) => (a.dates[0]?.date ?? '').localeCompare(b.dates[0]?.date ?? '') || a.id.localeCompare(b.id));
  return groups;
}
