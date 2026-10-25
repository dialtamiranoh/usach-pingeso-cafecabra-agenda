import { sql } from 'drizzle-orm';
import { createDb } from '../db';
import type { AppBindings } from '../config/bindings';

// RF-11: pasa a EXPIRADO las reservas RESERVADO cuyo plazo de pago venció,
// liberando el cupo (una reserva EXPIRADO no cuenta como ocupada).
export async function expireReservations(env: AppBindings): Promise<void> {
  const db = createDb(env.cafe_cabra_agenda_db);
  await db.run(sql`
    UPDATE reservas SET estado='EXPIRADO', actualizado_en=unixepoch()
    WHERE estado='RESERVADO' AND expira_en IS NOT NULL AND expira_en <= unixepoch()
  `);
}