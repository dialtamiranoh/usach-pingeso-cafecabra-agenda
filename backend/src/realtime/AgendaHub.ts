import { DurableObject } from 'cloudflare:workers';
import type { AppBindings } from '../config/bindings';

// Hub de tiempo real (patrón Publish/Subscribe). Una única instancia nombrada actúa como
// broker: mantiene los WebSocket de los paneles conectados y difunde a todos los eventos
// que publican los endpoints (nueva reserva, cambio de cupo, expiración).
//
// Usa la WebSocket Hibernation API: el runtime puede hibernar el objeto mientras no hay
// actividad sin cerrar los sockets, lo que mantiene bajo el costo en el plan Free.
export class AgendaHub extends DurableObject<AppBindings> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Canal interno de publicación: lo invocan los endpoints vía stub.fetch('/publish').
    if (url.pathname === '/publish') {
      const mensaje = await request.text();
      this.difundir(mensaje);
      return new Response(null, { status: 204 });
    }

    // Conexión de un panel: upgrade a WebSocket.
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Se espera una conexión WebSocket', { status: 426 });
    }
    const par = new WebSocketPair();
    const cliente = par[0];
    const servidor = par[1];
    // acceptWebSocket habilita la hibernación (en vez de server.accept()).
    this.ctx.acceptWebSocket(servidor);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  // Envía el mensaje a todos los sockets vivos.
  difundir(mensaje: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(mensaje); } catch { /* socket ya cerrado, se ignora */ }
    }
  }

  // Responde al latido del cliente para mantener viva la conexión.
  async webSocketMessage(ws: WebSocket, mensaje: string | ArrayBuffer): Promise<void> {
    if (mensaje === 'ping') {
      try { ws.send('pong'); } catch { /* ignorar */ }
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try { ws.close(code); } catch { /* ya cerrado */ }
  }
}