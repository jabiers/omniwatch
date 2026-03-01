import { createServer, type Server, type Socket } from 'node:net';
import { existsSync, unlinkSync } from 'node:fs';
import {
  SOCKET_PATH,
  log,
  parseMessages,
  encodeMessage,
  createResponse,
  createErrorResponse,
  createNotification,
  RPC_ERRORS,
} from '@vigil/shared';
import type { RPCRequest } from '@vigil/shared';
import { handleAgentRPC } from './handlers/agent.js';
import { handleLogRPC } from './handlers/log.js';
import { handleSystemRPC } from './handlers/system.js';
import { handleChatRPC } from './handlers/chat.js';
import { handleMeshRPC } from './handlers/mesh.js';
import { handleSnapshotRPC } from './handlers/snapshot.js';
import { handleQueueRPC } from './handlers/queue.js';
import { handleAnalyticsRPC } from './handlers/analytics.js';
import { handleSecurityRPC } from './handlers/security.js';

let server: Server | null = null;
const clients = new Set<Socket>();

type RPCHandler = (params: Record<string, unknown>, client: Socket) => Promise<unknown>;

const handlers: Record<string, RPCHandler> = {};

function registerHandlers(): void {
  // Agent handlers
  handlers['agent.create'] = handleAgentRPC.create;
  handlers['agent.list'] = handleAgentRPC.list;
  handlers['agent.get'] = handleAgentRPC.get;
  handlers['agent.start'] = handleAgentRPC.start;
  handlers['agent.stop'] = handleAgentRPC.stop;
  handlers['agent.restart'] = handleAgentRPC.restart;
  handlers['agent.destroy'] = handleAgentRPC.destroy;

  // Log handlers
  handlers['agent.logs'] = handleLogRPC.getLogs;
  handlers['agent.logs.stream'] = handleLogRPC.streamLogs;

  // Chat handlers (v0.2)
  handlers['agent.chat'] = handleChatRPC.chat;
  handlers['agent.preview'] = handleChatRPC.preview;
  handlers['agent.apply'] = handleChatRPC.apply;

  // v0.5: Mesh handlers
  handlers['mesh.topology'] = handleMeshRPC.topology;
  handlers['mesh.events'] = handleMeshRPC.events;
  handlers['mesh.subscribe'] = handleMeshRPC.subscribe;
  handlers['mesh.unsubscribe'] = handleMeshRPC.unsubscribe;

  // v0.5: Snapshot handlers
  handlers['snapshot.capture'] = handleSnapshotRPC.capture;
  handlers['snapshot.restore'] = handleSnapshotRPC.restore;
  handlers['snapshot.list'] = handleSnapshotRPC.list;

  // v0.6: Queue handlers
  handlers['queue.stats'] = async (params) => handleQueueRPC.stats(params);
  handlers['queue.deadLetters'] = async (params) => handleQueueRPC.deadLetters(params);
  handlers['queue.retryDeadLetter'] = async (params) => handleQueueRPC.retryDeadLetter(params);
  handlers['queue.cleanup'] = async (params) => handleQueueRPC.cleanup(params);
  handlers['queue.resetStale'] = async (params) => handleQueueRPC.resetStale(params);

  // v0.6: Analytics handlers
  handlers['analytics.metrics'] = async (params) => handleAnalyticsRPC.metrics(params);
  handlers['analytics.metricsByName'] = async (params) => handleAnalyticsRPC.metricsByName(params);
  handlers['analytics.anomalies'] = async (params) => handleAnalyticsRPC.anomalies(params);
  handlers['analytics.rollup'] = async (params) => handleAnalyticsRPC.rollup(params);
  handlers['analytics.alertRules'] = async (params) => handleAnalyticsRPC.alertRules(params);
  handlers['analytics.createAlert'] = async (params) => handleAnalyticsRPC.createAlert(params);
  handlers['analytics.updateAlert'] = async (params) => handleAnalyticsRPC.updateAlert(params);
  handlers['analytics.deleteAlert'] = async (params) => handleAnalyticsRPC.deleteAlert(params);
  handlers['analytics.checkAlerts'] = handleAnalyticsRPC.checkAlerts as RPCHandler;

  // v0.6: Security handlers
  handlers['security.events'] = async (params) => handleSecurityRPC.events(params);

  // System handlers
  handlers['system.stats'] = handleSystemRPC.stats;
  handlers['system.health'] = handleSystemRPC.health;
  handlers['daemon.stop'] = handleSystemRPC.daemonStop;
}

async function handleRequest(request: RPCRequest, client: Socket): Promise<void> {
  const handler = handlers[request.method];

  if (!handler) {
    const response = createErrorResponse(
      request.id,
      RPC_ERRORS.METHOD_NOT_FOUND,
      `Method '${request.method}' not found`,
    );
    client.write(encodeMessage(response));
    return;
  }

  try {
    const result = await handler(request.params, client);
    const response = createResponse(request.id, result);
    client.write(encodeMessage(response));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const response = createErrorResponse(request.id, RPC_ERRORS.AGENT_ERROR, message);
    client.write(encodeMessage(response));
  }
}

export async function startRPCServer(): Promise<void> {
  // Clean up stale socket
  if (existsSync(SOCKET_PATH)) {
    unlinkSync(SOCKET_PATH);
  }

  registerHandlers();

  return new Promise((resolve, reject) => {
    server = createServer((client) => {
      clients.add(client);
      let buffer = '';

      client.on('data', (data) => {
        buffer += data.toString();
        const messages = parseMessages(buffer);
        // Keep unparsed remainder
        const lastNewline = buffer.lastIndexOf('\n');
        buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 1) : buffer;

        for (const msg of messages) {
          if ('method' in msg && 'id' in msg && msg.method !== 'stream') {
            handleRequest(msg as RPCRequest, client).catch((err) => {
              log('error', `RPC handler error: ${err}`);
            });
          }
        }
      });

      client.on('close', () => {
        clients.delete(client);
      });

      client.on('error', () => {
        clients.delete(client);
      });
    });

    server.on('error', reject);
    server.listen(SOCKET_PATH, () => {
      log('info', `RPC server listening on ${SOCKET_PATH}`);
      resolve();
    });
  });
}

export function stopRPCServer(): void {
  for (const client of clients) {
    client.destroy();
  }
  clients.clear();

  if (server) {
    server.close();
    server = null;
  }

  if (existsSync(SOCKET_PATH)) {
    try {
      unlinkSync(SOCKET_PATH);
    } catch {
      /* ignore */
    }
  }
}

export function broadcastToClients(type: string, data: unknown): void {
  const msg = encodeMessage(createNotification(type, data));
  for (const client of clients) {
    try {
      client.write(msg);
    } catch {
      /* ignore dead clients */
    }
  }
}
