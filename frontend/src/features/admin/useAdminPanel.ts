import { useEffect, useState } from 'react';
import type { AdminPanelResponse } from '@cafecabra/shared';

// Carga los datos del panel de administración desde el backend (GET /api/admin/panel).
// Mantiene estados de carga y error para no mostrar datos falsos si el servicio falla.
export function useAdminPanel() {
  const [data, setData] = useState<AdminPanelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/admin/panel', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('No pudimos cargar el panel. Intenta nuevamente.');
        const body: AdminPanelResponse = await response.json();
        if (!body || typeof body !== 'object' || !body.stats) throw new Error('La respuesta del panel no es válida.');
        if (!controller.signal.aborted) setData(body);
      }).catch(error => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No pudimos cargar el panel.');
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return { data, loading, error, retry: () => setAttempt(value => value + 1) };
}

// --- Formateadores de presentación ---

// 'YYYY-MM-DD' -> "12 nov 2026". Devuelve un guion si no hay fecha futura.
export function formatFechaEvento(fecha: string | null): string {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${fecha}T12:00:00Z`));
}

// epoch (segundos) -> "Hoy, 11:20" / "Ayer, 18:42" / "3 nov, 14:10".
export function formatFechaInscripcion(epoch: number): string {
  const fecha = new Date(epoch * 1000);
  const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }).format(fecha);
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const mismaFecha = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismaFecha(fecha, hoy)) return `Hoy, ${hora}`;
  if (mismaFecha(fecha, ayer)) return `Ayer, ${hora}`;
  const dia = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(fecha);
  return `${dia}, ${hora}`;
}

// Monto en pesos chilenos sin decimales: 1240000 -> "$1.240.000".
export function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(monto);
}