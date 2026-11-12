import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "../db";
import { user, session, account, verification, rateLimit } from "../db/schema";
import type { AppBindings } from "../config/bindings";

// allowSignUp solo se activa para el alta controlada de administradores (endpoint bootstrap).
// El registro público queda deshabilitado: nadie puede auto-crearse una cuenta.
export function createAuth(env: AppBindings, opts: { allowSignUp?: boolean } = {}) {
  if (!env.BETTER_AUTH_SECRET) throw new Error("Falta configurar BETTER_AUTH_SECRET");
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    database: drizzleAdapter(createDb(env.cafe_cabra_agenda_db), {
      provider: "sqlite",
      schema: { user, session, account, verification, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !opts.allowSignUp,
      minPasswordLength: 8,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database" },
    // Cloudflare establece este encabezado; no se confía en X-Forwarded-For del cliente.
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  });
}

export type Auth = ReturnType<typeof createAuth>;