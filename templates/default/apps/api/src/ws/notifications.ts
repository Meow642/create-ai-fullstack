import WebSocket from 'ws';
import type { ItemDto } from '@workspace/shared';

const clients = new Set<WebSocket>();

export function addNotificationClient(socket: WebSocket) {
  clients.add(socket);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
}

export function broadcastItemCreated(item: ItemDto) {
  const message = JSON.stringify({ type: 'item.created', data: item });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
