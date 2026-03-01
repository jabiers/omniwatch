import { connect } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import {
  SOCKET_PATH,
  PID_FILE,
  createRequest,
  parseMessages,
  encodeMessage,
  type RPCResponse,
} from '@vigil/shared';

/** Check if the Vigil daemon process is alive */
export function isDaemonRunning(): boolean {
  if (!existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Get daemon PID from PID file, or null if unavailable */
export function getDaemonPid(): number | null {
  if (!existsSync(PID_FILE)) return null;
  try {
    return parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
  } catch {
    return null;
  }
}

/** Send a JSON-RPC call to the daemon via Unix socket */
export async function rpcCall(
  method: string,
  params: Record<string, unknown> = {},
  options: { timeout?: number } = {},
): Promise<unknown> {
  if (!isDaemonRunning()) {
    throw new Error('Daemon is not running');
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

    socket.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('Daemon is not running'));
      }
    });
  });
}
