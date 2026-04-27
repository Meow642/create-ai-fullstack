import { useEffect, useRef } from 'react';

type UseWebSocketOptions = {
  onMessage: (message: unknown) => void;
};

export function useWebSocket(path: string, options: UseWebSocketOptions) {
  const onMessageRef = useRef(options.onMessage);
  onMessageRef.current = options.onMessage;

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retryTimer: number | undefined;
    let closed = false;
    let attempt = 0;

    const connect = () => {
      const base = import.meta.env.VITE_WS_BASE ?? apiWsBase();
      socket = new WebSocket(`${base}${path}`);

      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data));
        } catch {
          onMessageRef.current(event.data);
        }
      };
      socket.onclose = () => {
        if (closed) return;
        const delay = Math.min(1000 * 2 ** attempt, 10_000);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [path]);
}

function apiWsBase() {
  const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
  return apiBase.replace(/^http/, 'ws');
}
