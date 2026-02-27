import { createServer, type Server, type Socket } from 'node:net';
import { existsSync, unlinkSync } from 'node:fs';
import { SOCKET_PATH } from '../shared/constants.js';
import { log } from '../shared/logger.js';
import {
  parseMessages,
  encodeMessage,
  createResponse,
  createErrorResponse,
  createNotification,
  RPC_ERRORS,
} from '../shared/ipc-protocol.js';
import type { RPCRequest } from '../shared/types.js';
import { handleAgentRPC } from './handlers/agent.js';
import { handleLogRPC } from './handlers/log.js';
import { handleSystemRPC } from './handlers/system.js';
import { handleChatRPC } from './handlers/chat.js';

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
    try { unlinkSync(SOCKET_PATH); } catch { /* ignore */ }
  }
}

export function broadcastToClients(type: string, data: unknown): void {
  const msg = encodeMessage(createNotification(type, data));
  for (const client of clients) {
    try {
      client.write(msg);
    } catch { /* ignore dead clients */ }
  }
}
