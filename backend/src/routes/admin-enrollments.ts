import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppBindings } from '../config/bindings';
import { getAdminSession } from './admin';
import { DecisionError, decideReservation, assignReservationEdition, enrollmentDetail, listEnrollments, type DecisionInput } from '../services/reservation-decisions';
import { sendDecisionNotification } from '../integrations/email/reservation-decision';
import { publicarEvento } from '../realtime/publish';

export const adminEnrollmentRoutes = new Hono<{ Bindings: AppBindings; Variables: { adminId: string } }>();
adminEnrollmentRoutes.use('/admin/inscritos*', bodyLimit({ maxSize: 4000, onError: c => c.json({ error: 'Solicitud demasiado extensa.' }, 413) }));
adminEnrollmentRoutes.use('/admin/inscritos*', async (c, next) => {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  if (!session) return c.json({ error: 'Debes iniciar sesión como administrador.' }, 401);
  const active = await c.env.cafe_cabra_agenda_db.prepare('SELECT activo FROM user WHERE id=?').bind(session.user.id).first<{ activo: number }>();
  if (!active?.activo) return c.json({ error: 'Cuenta inactiva.' }, 401);
  c.set('adminId', session.user.id);
  await next();
});
adminEnrollmentRoutes.onError((error, c) => {
  if (error instanceof DecisionError) return c.json({ error: error.message }, error.status);
  console.error('Error en gestión de inscritos', error.message);
  return c.json({ error: 'No pudimos completar la operación. Intenta nuevamente.' }, 500);
});

function validId(value: string) {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) throw new DecisionError('Inscripción inválida.', 400);
  return id;
}
function checkJson(type?: string) {
  if (!type?.includes('application/json')) throw new DecisionError('Formato de solicitud inválido.', 400);
}

adminEnrollmentRoutes.get('/admin/inscritos', async c => {
  const page = Number(c.req.query('page') ?? '1');
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new DecisionError('Página inválida.', 400);
  return c.json(await listEnrollments(c.env.cafe_cabra_agenda_db, c.req.query('estado') ?? '', (c.req.query('q') ?? '').trim().slice(0, 120), page));
});
adminEnrollmentRoutes.get('/admin/inscritos/:id', async c => c.json(await enrollmentDetail(c.env.cafe_cabra_agenda_db, validId(c.req.param('id')))));
adminEnrollmentRoutes.post('/admin/inscritos/:id/edicion', async c => {
  checkJson(c.req.header('content-type'));
  if (c.req.header('origin') && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(value => value.trim()).includes(c.req.header('origin')!)) return c.json({ error: 'Origen no autorizado.' }, 403);
  let input: { editionId?: unknown };
  try { input = await c.req.json(); } catch { throw new DecisionError('Solicitud inválida.', 400); }
  if (!input || typeof input.editionId !== 'string') throw new DecisionError('Selecciona una edición.', 400);
  const detail = await assignReservationEdition(c.env.cafe_cabra_agenda_db, validId(c.req.param('id')), input.editionId, c.get('adminId'));
  await publicarEvento(c.env, { tipo: 'CUPO_CAMBIO', ts: Date.now() });
  return c.json(detail);
});
adminEnrollmentRoutes.post('/admin/inscritos/:id/decision', async c => {
  checkJson(c.req.header('content-type'));
  // Las cookies de sesión no autorizan peticiones de otros sitios.
  if (c.req.header('origin') && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(value => value.trim()).includes(c.req.header('origin')!)) return c.json({ error: 'Origen no autorizado.' }, 403);
  let input: DecisionInput;
  try {
    input = await c.req.json();
    if (!input || typeof input !== 'object') throw new Error();
  } catch { throw new DecisionError('Solicitud inválida.', 400); }
  const id = validId(c.req.param('id'));
  const result = await decideReservation(c.env.cafe_cabra_agenda_db, id, c.get('adminId'), input);
  if (result.changed) await publicarEvento(c.env, { tipo: 'CUPO_CAMBIO', ts: Date.now() });
  if (result.detail.notification) await sendDecisionNotification(c.env.cafe_cabra_agenda_db, result.detail.notification.id, c.env.RESEND_API_KEY);
  return c.json(await enrollmentDetail(c.env.cafe_cabra_agenda_db, id));
});
adminEnrollmentRoutes.post('/admin/inscritos/:id/notificacion', async c => {
  checkJson(c.req.header('content-type'));
  if (c.req.header('origin') && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(value => value.trim()).includes(c.req.header('origin')!)) return c.json({ error: 'Origen no autorizado.' }, 403);
  const id = validId(c.req.param('id'));
  const detail = await enrollmentDetail(c.env.cafe_cabra_agenda_db, id);
  if (!detail.notification) throw new DecisionError('Esta inscripción no tiene una notificación manual.');
  await sendDecisionNotification(c.env.cafe_cabra_agenda_db, detail.notification.id, c.env.RESEND_API_KEY);
  return c.json(await enrollmentDetail(c.env.cafe_cabra_agenda_db, id));
});
