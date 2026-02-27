import type { RPCRequest, RPCResponse, RPCNotification } from './types.js';

let nextId = 1;

export function createRequest(method: string, params: Record<string, unknown> = {}): RPCRequest {
  return { jsonrpc: '2.0', id: nextId++, method, params };
}

export function createResponse(id: number, result: unknown): RPCResponse {
  return { jsonrpc: '2.0', id, result };
}

export function createErrorResponse(id: number, code: number, message: string, data?: unknown): RPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}

export function createNotification(type: string, data: unknown): RPCNotification {
  return { jsonrpc: '2.0', method: 'stream', params: { type, data } };
}

// Error codes (JSON-RPC standard + custom)
export const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom
  AGENT_ERROR: -32000,
  DAEMON_ERROR: -32001,
} as const;

// Framing: each message is a JSON line terminated by \n
export function encodeMessage(msg: RPCRequest | RPCResponse | RPCNotification): Buffer {
  return Buffer.from(JSON.stringify(msg) + '\n');
}

export function parseMessages(buffer: string): Array<RPCRequest | RPCResponse | RPCNotification> {
  const lines = buffer.split('\n').filter(l => l.trim());
  const messages: Array<RPCRequest | RPCResponse | RPCNotification> = [];
  for (const line of lines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed messages
    }
  }
  return messages;
}
