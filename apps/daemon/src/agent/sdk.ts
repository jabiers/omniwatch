import { nanoid } from 'nanoid';
import type { AgentMessage, DaemonToAgentMessage } from '@omniwatch/shared';

type StoreResolver = (value: unknown) => void;

const pendingStoreRequests = new Map<string, StoreResolver>();

// Handle responses from daemon
export function handleDaemonMessage(msg: DaemonToAgentMessage): void {
  if (msg.type === 'store.result') {
    const resolver = pendingStoreRequests.get(msg.requestId);
    if (resolver) {
      resolver(msg.value);
      pendingStoreRequests.delete(msg.requestId);
    }
  } else if (msg.type === 'shutdown') {
    process.exit(0);
  }
}

function send(msg: AgentMessage): void {
  if (process.send) {
    process.send(msg);
  }
}

function storeRequest(msg: AgentMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestId = (msg as { requestId: string }).requestId;
    const timeout = setTimeout(() => {
      pendingStoreRequests.delete(requestId);
      reject(new Error('Store request timeout'));
    }, 10_000);

    pendingStoreRequests.set(requestId, (value) => {
      clearTimeout(timeout);
      resolve(value);
    });

    send(msg);
  });
}

export interface OmniSDK {
  fetch(url: string, options?: RequestInit): Promise<Response>;
  notify(message: string, options?: { title?: string; severity?: 'critical' | 'warning' | 'info' }): Promise<void>;
  sleep(ms: number): Promise<void>;
  retry<T>(fn: () => Promise<T>, opts?: { maxRetries?: number; delay?: number; backoff?: number }): Promise<T>;
  timeout<T>(fn: () => Promise<T>, ms: number): Promise<T>;
  store: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  log: {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
  };
}

export function createSDK(): OmniSDK {
  return {
    async fetch(url: string, options?: RequestInit): Promise<Response> {
      return globalThis.fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'OmniWatch/0.1.0',
          ...(options?.headers as Record<string, string>),
        },
      });
    },

    async notify(message: string, options?: { title?: string; severity?: 'critical' | 'warning' | 'info' }): Promise<void> {
      send({ type: 'notify', message, options });
    },

    sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    async retry<T>(fn: () => Promise<T>, opts?: { maxRetries?: number; delay?: number; backoff?: number }): Promise<T> {
      const { maxRetries = 3, delay = 1000, backoff = 2 } = opts || {};
      let lastError: Error = new Error('retry failed');
      for (let i = 0; i <= maxRetries; i++) {
        try {
          return await fn();
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          if (i < maxRetries) {
            await new Promise(r => setTimeout(r, delay * Math.pow(backoff, i)));
          }
        }
      }
      throw lastError;
    },

    async timeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
      return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
        ),
      ]);
    },

    store: {
      async get(key: string): Promise<unknown> {
        const requestId = nanoid(8);
        return storeRequest({ type: 'store.get', key, requestId });
      },

      async set(key: string, value: unknown): Promise<void> {
        const requestId = nanoid(8);
        await storeRequest({ type: 'store.set', key, value, requestId });
      },

      async delete(key: string): Promise<void> {
        const requestId = nanoid(8);
        await storeRequest({ type: 'store.delete', key, requestId });
      },
    },

    log: {
      info(message: string, meta?: Record<string, unknown>): void {
        send({ type: 'log', level: 'info', message, metadata: meta });
      },
      warn(message: string, meta?: Record<string, unknown>): void {
        send({ type: 'log', level: 'warn', message, metadata: meta });
      },
      error(message: string, meta?: Record<string, unknown>): void {
        send({ type: 'log', level: 'error', message, metadata: meta });
      },
    },
  };
}
