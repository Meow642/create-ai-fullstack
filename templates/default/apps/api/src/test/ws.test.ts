import http from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createApp } from '../app';
import { attachWebSocket } from '../ws';

const app = createApp();
const server = http.createServer(app);
attachWebSocket(server);

let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server port');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('notifications websocket', () => {
  it('broadcasts item.created after item creation', async () => {
    const wsUrl = baseUrl.replace('http', 'ws');
    const socket = new WebSocket(`${wsUrl}/ws/notifications`);
    const message = new Promise<Record<string, unknown>>((resolve) => {
      socket.on('message', (data) => resolve(JSON.parse(String(data))));
    });

    await new Promise<void>((resolve) => socket.on('open', () => resolve()));
    await request(baseUrl).post('/items').send({ title: 'Socket item' }).expect(201);

    await expect(message).resolves.toMatchObject({
      type: 'item.created',
      data: { title: 'Socket item' },
    });

    socket.close();
  });
});
