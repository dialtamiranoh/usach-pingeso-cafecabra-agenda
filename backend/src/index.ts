import { Hono } from 'hono';
import { receivePaymentEmail } from './integrations/email/payments';
import { createAuth } from './auth';
import { checkHealth } from './routes/health';
import type { AppBindings } from './config/bindings';
import { catalogRoutes } from './routes/catalog';
import { enrollmentRoutes } from './routes/enrollments';
const app = new Hono<{ Bindings: AppBindings }>();
app.route('/api', catalogRoutes);
app.route('/api', enrollmentRoutes);
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
app.notFound(c => c.json({error:'Ruta no encontrada'},404));
app.onError((error,c) => { console.error('Error de API',error.message); return c.json({error:'Error interno'},500); });
export default app;
