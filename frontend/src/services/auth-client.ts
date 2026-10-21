import { createAuthClient } from "better-auth/react";

// Mismo origen que la interfaz: Vite reenvía /api al Worker en desarrollo.
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
