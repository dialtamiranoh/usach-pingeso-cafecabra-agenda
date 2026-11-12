import { sql } from 'drizzle-orm';
import { createDb } from '../db';
import type { AppBindings } from '../config/bindings';
import { publicarEvento } from '../realtime/publish';

// RF-11: pasa a EXPIRADO las reservas RESERVADO cuyo plazo de pago venció,
// liberando el cupo (una reserva EXPIRADO no cuenta como ocupada).
export async function expireReservations(env: AppBindings): Promise<void> {
  const db = createDb(env.cafe_cabra_agenda_db);
  const resultado = await db.run(sql`
    UPDATE reservas SET estado='EXPIRADO', actualizado_en=unixepoch()
    WHERE estado='RESERVADO' AND expira_en IS NOT NULL AND expira_en <= unixepoch()
  `);
  // Si se liberó al menos un cupo, se avisa a los paneles para que refresquen en vivo.
  if ((resultado.meta?.changes ?? 0) > 0) {
    await publicarEvento(env, { tipo: 'RESERVA_EXPIRADA', ts: Date.now() });
  }
}