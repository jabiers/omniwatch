import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { getDb } from '@omniwatch/db';

const clients = new Set<WebSocket>();

/** Heartbeat interval (30s ping, 5s timeout) */
const PING_INTERVAL = 30_000;
const PONG_TIMEOUT = 5_000;

/** Log subscription: push new logs to WebSocket clients */
interface LogSubscription {
  agentId: string;
  lastLogId: number;
  timer: ReturnType<typeof setInterval>;
}
const logSubscriptions = new Map<WebSocket, LogSubscription>();

/** Poll DB for new logs and push to subscribed client */
function pollLogs(ws: WebSocket, sub: LogSubscription): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    const db = getDb();
    const logs = db
      .prepare('SELECT * FROM agent_logs WHERE agent_id = ? AND id > ? ORDER BY id ASC LIMIT 50')
      .all(sub.agentId, sub.lastLogId) as { id: number }[];

    if (logs.length > 0) {
      sub.lastLogId = logs[logs.length - 1].id;
      ws.send(
        JSON.stringify({
          type: 'agent:logs',
          data: { agentId: sub.agentId, logs },
          timestamp: Date.now(),
        }),
      );
    }
  } catch {
    // DB not ready
  }
}

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

        // Subscribe to agent log stream
        if (msg.type === 'subscribe:logs' && msg.agentId) {
          // Clean up previous subscription if any
          const prev = logSubscriptions.get(ws);
          if (prev) clearInterval(prev.timer);

          // Get current max log id to only send new entries
          let lastLogId = 0;
          try {
            const db = getDb();
            const row = db
              .prepare('SELECT MAX(id) as maxId FROM agent_logs WHERE agent_id = ?')
              .get(msg.agentId) as { maxId: number | null } | undefined;
            lastLogId = row?.maxId ?? 0;
          } catch {
            // ignore
          }

          const sub: LogSubscription = {
            agentId: msg.agentId,
            lastLogId,
            timer: setInterval(() => pollLogs(ws, sub), 2000),
          };
          logSubscriptions.set(ws, sub);
        }

        // Unsubscribe from logs
        if (msg.type === 'unsubscribe:logs') {
          const sub = logSubscriptions.get(ws);
          if (sub) {
            clearInterval(sub.timer);
            logSubscriptions.delete(ws);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    const cleanup = () => {
      clearInterval(pingInterval);
      if (pongTimer) clearTimeout(pongTimer);
      const sub = logSubscriptions.get(ws);
      if (sub) clearInterval(sub.timer);
      logSubscriptions.delete(ws);
      clients.delete(ws);
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
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
