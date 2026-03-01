import { connect, type Socket } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import {
  SOCKET_PATH,
  PID_FILE,
  createRequest,
  parseMessages,
  encodeMessage,
  Errors,
  type RPCResponse,
  type RPCNotification,
} from '@vigil/shared';

export function isDaemonRunning(): boolean {
  if (!existsSync(PID_FILE)) return false;

  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    process.kill(pid, 0); // Check if process exists
    return true;
  } catch {
    return false;
  }
}

export function getDaemonPid(): number | null {
  if (!existsSync(PID_FILE)) return null;
  try {
    return parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
  } catch {
    return null;
  }
}

export async function rpcCall(
  method: string,
  params: Record<string, unknown> = {},
  options: { timeout?: number } = {},
): Promise<unknown> {
  if (!isDaemonRunning()) {
    throw Errors.DAEMON_NOT_RUNNING();
  }

  const { timeout = 30_000 } = options;
  const request = createRequest(method, params);

  return new Promise((resolve, reject) => {
    const socket = connect(SOCKET_PATH);
    let buffer = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error(`RPC call '${method}' timed out after ${timeout}ms`));
      }
    }, timeout);

    socket.on('connect', () => {
      socket.write(encodeMessage(request));
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      const messages = parseMessages(buffer);
      const lastNewline = buffer.lastIndexOf('\n');
      buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 1) : buffer;

      for (const msg of messages) {
        if ('id' in msg && msg.id === request.id) {
          settled = true;
          clearTimeout(timer);
          socket.end();

          const response = msg as RPCResponse;
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      }
    });

    socket.on('error', (_err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(Errors.DAEMON_NOT_RUNNING());
      }
    });
  });
}

export async function rpcStream(
  method: string,
  params: Record<string, unknown> = {},
  onNotification: (type: string, data: unknown) => void,
  options: { timeout?: number } = {},
): Promise<unknown> {
  if (!isDaemonRunning()) {
    throw Errors.DAEMON_NOT_RUNNING();
  }

  const { timeout = 120_000 } = options;
  const request = createRequest(method, params);

  return new Promise((resolve, reject) => {
    const socket = connect(SOCKET_PATH);
    let buffer = '';
    let settled = false;

    // timeout=0 means no timeout (for long-running streams)
    const timer =
      timeout > 0
        ? setTimeout(() => {
            if (!settled) {
              settled = true;
              socket.destroy();
              reject(new Error(`RPC call '${method}' timed out`));
            }
          }, timeout)
        : null;

    socket.on('connect', () => {
      socket.write(encodeMessage(request));
    });

    socket.on('data', (data) => {
      buffer += data.toString();
      const messages = parseMessages(buffer);
      const lastNewline = buffer.lastIndexOf('\n');
      buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 1) : buffer;

      for (const msg of messages) {
        if ('method' in msg && msg.method === 'stream') {
          const notif = msg as RPCNotification;
          onNotification(notif.params.type, notif.params.data);
        } else if ('id' in msg && msg.id === request.id) {
          settled = true;
          if (timer) clearTimeout(timer);
          socket.end();

          const response = msg as RPCResponse;
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      }
    });

    socket.on('error', (_err) => {
      if (!settled) {
        settled = true;
        if (timer) clearTimeout(timer);
        reject(Errors.DAEMON_NOT_RUNNING());
      }
    });
  });
}

export function connectStream(onNotification: (type: string, data: unknown) => void): Socket {
  const socket = connect(SOCKET_PATH);
  let buffer = '';

  socket.on('data', (data) => {
    buffer += data.toString();
    const messages = parseMessages(buffer);
    const lastNewline = buffer.lastIndexOf('\n');
    buffer = lastNewline >= 0 ? buffer.slice(lastNewline + 1) : buffer;

    for (const msg of messages) {
      if ('method' in msg && msg.method === 'stream') {
        const notif = msg as RPCNotification;
        onNotification(notif.params.type, notif.params.data);
      }
    }
  });

  return socket;
}
