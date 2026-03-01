import { describe, it, expect } from 'vitest';
import {
  createRequest,
  createResponse,
  createErrorResponse,
  createNotification,
  encodeMessage,
  parseMessages,
  RPC_ERRORS,
} from '@vigil/shared';

describe('createRequest', () => {
  it('creates a JSON-RPC 2.0 request', () => {
    const req = createRequest('agent.list', { status: 'running' });
    expect(req.jsonrpc).toBe('2.0');
    expect(req.method).toBe('agent.list');
    expect(req.params).toEqual({ status: 'running' });
    expect(typeof req.id).toBe('number');
  });

  it('defaults params to empty object', () => {
    const req = createRequest('daemon.status');
    expect(req.params).toEqual({});
  });

  it('increments id', () => {
    const a = createRequest('a');
    const b = createRequest('b');
    expect(b.id).toBeGreaterThan(a.id);
  });
});

describe('createResponse', () => {
  it('creates a success response', () => {
    const res = createResponse(1, { agents: [] });
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(1);
    expect(res.result).toEqual({ agents: [] });
    expect(res.error).toBeUndefined();
  });
});

describe('createErrorResponse', () => {
  it('creates an error response', () => {
    const res = createErrorResponse(1, RPC_ERRORS.METHOD_NOT_FOUND, 'No such method');
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(1);
    expect(res.error?.code).toBe(-32601);
    expect(res.error?.message).toBe('No such method');
  });
});

describe('createNotification', () => {
  it('creates a stream notification', () => {
    const notif = createNotification('log', { line: 'hello' });
    expect(notif.jsonrpc).toBe('2.0');
    expect(notif.method).toBe('stream');
    expect(notif.params.type).toBe('log');
    expect(notif.params.data).toEqual({ line: 'hello' });
  });
});

describe('encodeMessage / parseMessages', () => {
  it('round-trips a request', () => {
    const req = createRequest('test', { a: 1 });
    const buf = encodeMessage(req);
    const parsed = parseMessages(buf.toString());
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual(req);
  });

  it('parses multiple newline-delimited messages', () => {
    const a = createRequest('a');
    const b = createResponse(1, 'ok');
    const combined = encodeMessage(a).toString() + encodeMessage(b).toString();
    const parsed = parseMessages(combined);
    expect(parsed).toHaveLength(2);
  });

  it('skips malformed lines', () => {
    const good = JSON.stringify(createRequest('ok'));
    const input = `${good}\n{bad json}\n`;
    const parsed = parseMessages(input);
    expect(parsed).toHaveLength(1);
  });
});

describe('RPC_ERRORS', () => {
  it('has standard JSON-RPC error codes', () => {
    expect(RPC_ERRORS.PARSE_ERROR).toBe(-32700);
    expect(RPC_ERRORS.INVALID_REQUEST).toBe(-32600);
    expect(RPC_ERRORS.METHOD_NOT_FOUND).toBe(-32601);
    expect(RPC_ERRORS.INTERNAL_ERROR).toBe(-32603);
  });

  it('has custom error codes', () => {
    expect(RPC_ERRORS.AGENT_ERROR).toBe(-32000);
    expect(RPC_ERRORS.DAEMON_ERROR).toBe(-32001);
  });
});
