import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

const clients = new Set<WebSocket>();

/** Heartbeat interval (30s ping, 5s timeout) */
const PING_INTERVAL = 30_000;
const PONG_TIMEOUT = 5_000;

/** Initialize WebSocket server on the existing HTTP server */
export function initWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));

    let pongReceived = true;
    let pongTimer: ReturnType<typeof setTimeout> | null = null;

    // Send ping every 30s, expect pong within 5s
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        // No pong received since last ping — terminate
        clearInterval(pingInterval);
        if (pongTimer) clearTimeout(pongTimer);
        ws.terminate();
        return;
      }

      pongReceived = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        pongTimer = setTimeout(() => {
          if (!pongReceived) {
            ws.terminate();
          }
        }, PONG_TIMEOUT);
      }
    }, PING_INTERVAL);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg.type === 'pong') {
          pongReceived = true;
          if (pongTimer) {
            clearTimeout(pongTimer);
            pongTimer = null;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      if (pongTimer) clearTimeout(pongTimer);
      clients.delete(ws);
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
      if (pongTimer) clearTimeout(pongTimer);
      clients.delete(ws);
    });
  });
}

/** Broadcast an event to all connected clients */
export function broadcast(type: string, data: unknown): void {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
