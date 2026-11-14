import { useCallback, useEffect, useState } from 'react';

export interface AdminSession {
  authenticated: boolean;
  email: string | null;
}

// Consulta el estado de sesión del administrador (GET /api/admin/sesion).
export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sesion', { credentials: 'include' });
      const body = (await res.json()) as AdminSession;
      setSession(body);
    } catch {
      setSession({ authenticated: false, email: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { session, loading, refresh };
}

// Inicia sesión con correo y contraseña contra Better Auth. Devuelve null si todo bien,
// o un mensaje de error para mostrar en el formulario.
export async function signInAdmin(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      let mensaje = 'Correo o contraseña incorrectos.';
      try { const b = await res.json(); if (b?.message) mensaje = b.message; } catch { /* usa el mensaje por defecto */ }
      return mensaje;
    }
    return null;
  } catch {
    return 'No pudimos conectar con el servidor. Intenta nuevamente.';
  }
}

// Cierra la sesión actual. Devuelve true si el servidor confirmó el cierre.
export async function signOutAdmin(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    return res.ok;
  } catch {
    return false;
  }
}