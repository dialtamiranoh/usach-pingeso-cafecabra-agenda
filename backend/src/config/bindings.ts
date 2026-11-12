import type { AgendaHub } from '../realtime/AgendaHub';

export type AppBindings = CloudflareEnv & {
  RESEND_API_KEY?: string;
  BETTER_AUTH_SECRET?: string;
  // Token de un solo uso para sembrar el primer administrador (endpoint bootstrap).
  ADMIN_BOOTSTRAP_TOKEN?: string;
  // Hub de tiempo real (Durable Object).
  AGENDA_HUB: DurableObjectNamespace<AgendaHub>;
};