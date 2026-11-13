import { Hono } from 'hono';
import { receivePaymentEmail } from './integrations/email/payments';
import { createAuth } from './auth';
import { checkHealth } from './routes/health';
import type { AppBindings } from './config/bindings';
import { catalogRoutes } from './routes/catalog';
import { enrollmentRoutes } from './routes/enrollments';
import { expireReservations } from './jobs/expire';
import { adminRoutes } from './routes/admin';
import { adminEnrollmentRoutes } from './routes/admin-enrollments';
export { AgendaHub } from './realtime/AgendaHub';
import { mantenedorRoutes } from './routes/mantenedores';


const app = new Hono<{ Bindings: AppBindings }>();
app.route('/api', catalogRoutes);
app.route('/api', enrollmentRoutes);
app.route('/api', adminRoutes);
app.route('/api', mantenedorRoutes);
app.route('/api', adminEnrollmentRoutes);

app.get('/api/health', async c => {
  const body = await checkHealth(c.env);
  return c.json(body, body.status === 'ok' ? 200 : 503);
});

app.on(['GET', 'POST'], '/api/auth/*', async c => {
  if (!c.env.BETTER_AUTH_SECRET) return c.json({ error: 'Autenticación no configurada' }, 503);
  return createAuth(c.env).handler(c.req.raw);
});
app.post('/api/email/pagos', async c => {
  if (!c.env.RESEND_API_KEY) return c.json({error:'Servicio de correo no configurado'},503);
  return receivePaymentEmail(c.req.raw,c.env.RESEND_API_KEY);
});

// Tiempo real: el panel abre un WebSocket aquí. Requiere sesión de administrador; se reenvía
// la conexión al Durable Object (hub Pub/Sub).
app.get('/api/realtime', async c => {
  if (c.req.header('Upgrade') !== 'websocket') return c.json({ error: 'Se espera una conexión WebSocket' }, 426);
  const sesion = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!sesion) return c.json({ error: 'No autorizado' }, 401);
  const id = c.env.AGENDA_HUB.idFromName('agenda');
  return c.env.AGENDA_HUB.get(id).fetch(c.req.raw);
});

app.notFound(c => c.json({error:'Ruta no encontrada'},404));
app.onError((error,c) => { console.error('Error de API',error.message); return c.json({error:'Error interno'},500); });

// Cron Trigger (RF-11): expira reservas impagas vencidas y libera el cupo.
export default {
  fetch: (request: Request, env: AppBindings, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  async scheduled(_controller: ScheduledController, env: AppBindings, ctx: ExecutionContext) {
    ctx.waitUntil(expireReservations(env).catch(error => console.error('Error en cron de expiración', error)));
  },
};
