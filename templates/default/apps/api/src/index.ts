import http from 'node:http';
import { createApp } from './app';
import { attachWebSocket } from './ws';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();
const server = http.createServer(app);

attachWebSocket(server);

server.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
