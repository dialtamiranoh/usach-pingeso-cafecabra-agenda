import { useEffect, useRef } from 'react';
import type { RealtimeEvento } from '@cafecabra/shared';

// Abre un WebSocket al hub de tiempo real (/api/realtime) y llama onEvento por cada evento.
// Reconecta con backoff y manda un latido cada 30s para mantener viva la conexión.
export function useRealtime(onEvento: (evento: RealtimeEvento) => void) {
  const onEventoRef = useRef(onEvento);
  onEventoRef.current = onEvento;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let cerrado = false;
    let reintento = 0;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let reconexionTimer: ReturnType<typeof setTimeout> | undefined;

    function conectar() {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${window.location.host}/api/realtime`);

      ws.onopen = () => {
        reintento = 0;
        pingTimer = setInterval(() => { try { ws?.send('ping'); } catch { /* ignorar */ } }, 30000);
      };
      ws.onmessage = evento => {
        if (evento.data === 'pong') return;
        try {
          onEventoRef.current(JSON.parse(evento.data) as RealtimeEvento);
        } catch { /* mensaje no-JSON, se ignora */ }
      };
      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        if (cerrado) return;
        const espera = Math.min(15000, 1000 * 2 ** reintento);
        reintento += 1;
        reconexionTimer = setTimeout(conectar, espera);
      };
      ws.onerror = () => { try { ws?.close(); } catch { /* ignorar */ } };
    }

    conectar();
    return () => {
      cerrado = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconexionTimer) clearTimeout(reconexionTimer);
      try { ws?.close(); } catch { /* ignorar */ }
    };
  }, []);
}