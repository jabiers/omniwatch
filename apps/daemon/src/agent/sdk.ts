import { nanoid } from 'nanoid';
import type { AgentMessage, AgentType, DaemonToAgentMessage } from '@omniwatch/shared';

type RequestResolver = (value: unknown) => void;

const pendingRequests = new Map<string, RequestResolver>();

// Mesh event listeners: topic → callbacks
const meshListeners: Array<{ topic: string; callback: (event: { topic: string; payload: unknown; from: string }) => void }> = [];

// Handle responses from daemon
export function handleDaemonMessage(msg: DaemonToAgentMessage): void {
  if (msg.type === 'store.result') {
    const resolver = pendingRequests.get(msg.requestId);
    if (resolver) {
      resolver(msg.value);
      pendingRequests.delete(msg.requestId);
    }
  } else if (msg.type === 'spawn.result') {
    const resolver = pendingRequests.get(msg.requestId);
    if (resolver) {
      resolver(msg.error ? { error: msg.error } : { agentId: msg.agentId });
      pendingRequests.delete(msg.requestId);
    }
  } else if (msg.type === 'snapshot.result') {
    const resolver = pendingRequests.get(msg.requestId);
    if (resolver) {
      resolver(msg.seq);
      pendingRequests.delete(msg.requestId);
    }
  } else if (msg.type === 'mesh.event') {
    for (const listener of meshListeners) {
      if (listener.topic === msg.topic || listener.topic === '*') {
        try {
          listener.callback({ topic: msg.topic, payload: msg.payload, from: msg.from });
        } catch { /* ignore listener errors */ }
      }
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

function awaitRequest(msg: AgentMessage, timeoutMs = 10_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestId = (msg as { requestId: string }).requestId;
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, timeoutMs);

    pendingRequests.set(requestId, (value) => {
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
  // v0.5: Agent Mesh
  mesh: {
    publish(topic: string, payload: unknown): void;
    subscribe(topic: string): void;
    unsubscribe(topic: string): void;
    on(topic: string, callback: (event: { topic: string; payload: unknown; from: string }) => void): void;
  };
  // v0.5: Spawn Chain
  spawn(prompt: string, options?: { name?: string; type?: AgentType; schedule?: string }): Promise<string>;
  // v0.5: Time Travel
  snapshot(label?: string): Promise<number>;
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
        return awaitRequest({ type: 'store.get', key, requestId });
      },

      async set(key: string, value: unknown): Promise<void> {
        const requestId = nanoid(8);
        await awaitRequest({ type: 'store.set', key, value, requestId });
      },

      async delete(key: string): Promise<void> {
        const requestId = nanoid(8);
        await awaitRequest({ type: 'store.delete', key, requestId });
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

    // v0.5: Agent Mesh
    mesh: {
      publish(topic: string, payload: unknown): void {
        send({ type: 'mesh.publish', topic, payload });
      },
      subscribe(topic: string): void {
        send({ type: 'mesh.subscribe', topic });
      },
      unsubscribe(topic: string): void {
        send({ type: 'mesh.unsubscribe', topic });
      },
      on(topic: string, callback: (event: { topic: string; payload: unknown; from: string }) => void): void {
        meshListeners.push({ topic, callback });
      },
    },

    // v0.5: Spawn Chain
    async spawn(prompt: string, options?: { name?: string; type?: AgentType; schedule?: string }): Promise<string> {
      const requestId = nanoid(8);
      const result = await awaitRequest(
        { type: 'spawn.create', prompt, options, requestId },
        60_000,
      ) as { agentId?: string; error?: string };
      if (result.error) throw new Error(result.error);
      return result.agentId!;
    },

    // v0.5: Time Travel
    async snapshot(label?: string): Promise<number> {
      const requestId = nanoid(8);
      return awaitRequest({ type: 'snapshot', label, requestId }) as Promise<number>;
    },
  };
}
