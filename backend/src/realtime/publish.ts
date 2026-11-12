import type { AppBindings } from '../config/bindings';
import type { RealtimeEvento } from '@cafecabra/shared';

// Publica un evento en el hub de tiempo real. Best-effort: si falla, se registra y no
// interrumpe la operación principal (la fuente de verdad sigue siendo la base de datos).
export async function publicarEvento(env: AppBindings, evento: RealtimeEvento): Promise<void> {
  try {
    const id = env.AGENDA_HUB.idFromName('agenda');
    const stub = env.AGENDA_HUB.get(id);
    await stub.fetch('https://agenda-hub/publish', { method: 'POST', body: JSON.stringify(evento) });
  } catch (error) {
    console.error('Error publicando evento de tiempo real', error instanceof Error ? error.message : String(error));
  }
}