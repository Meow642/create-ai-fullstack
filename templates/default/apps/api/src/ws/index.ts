import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { addNotificationClient } from './notifications';

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws/notifications') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      addNotificationClient(ws);
      wss.emit('connection', ws, request);
    });
  });

  return wss;
}
