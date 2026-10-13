import { Hono } from 'hono';
import type { HealthResponse } from '@cafecabra/shared';
import { receivePaymentEmail } from './integrations/email/payments';
const app = new Hono<{ Bindings: CloudflareEnv & { RESEND_API_KEY?: string } }>();
app.get('/api/health', c => c.json({status:'ok'} satisfies HealthResponse));
app.post('/api/email/pagos', async c => {
  if (!c.env.RESEND_API_KEY) return c.json({error:'Servicio de correo no configurado'},503);
  return receivePaymentEmail(c.req.raw,c.env.RESEND_API_KEY);
});
app.notFound(c => c.json({error:'Ruta no encontrada'},404));
app.onError((error,c) => { console.error('Error de API',error.message); return c.json({error:'Error interno'},500); });
export default app;
