import { describe, it, expect } from 'vitest';
import { createSDK } from '../apps/daemon/src/agent/sdk.js';

describe('SDK Utils', () => {
  // Note: createSDK uses process.send which won't work in test env,
  // so we test the utility methods that don't depend on IPC

  it('should export sleep method', () => {
    const sdk = createSDK();
    expect(typeof sdk.sleep).toBe('function');
  });

  it('should export retry method', () => {
    const sdk = createSDK();
    expect(typeof sdk.retry).toBe('function');
  });

  it('should export timeout method', () => {
    const sdk = createSDK();
    expect(typeof sdk.timeout).toBe('function');
  });

  it('sleep should resolve after delay', async () => {
    const sdk = createSDK();
    const start = Date.now();
    await sdk.sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it('retry should succeed on first try', async () => {
    const sdk = createSDK();
    const result = await sdk.retry(async () => 42);
    expect(result).toBe(42);
  });

  it('retry should retry on failure then succeed', async () => {
    const sdk = createSDK();
    let attempts = 0;
    const result = await sdk.retry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'ok';
      },
      { maxRetries: 3, delay: 10 },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('retry should throw after max retries', async () => {
    const sdk = createSDK();
    await expect(
      sdk.retry(
        async () => {
          throw new Error('always fails');
        },
        { maxRetries: 2, delay: 10 },
      ),
    ).rejects.toThrow('always fails');
  });

  it('timeout should resolve if within time', async () => {
    const sdk = createSDK();
    const result = await sdk.timeout(async () => 'fast', 1000);
    expect(result).toBe('fast');
  });

  it('timeout should reject if too slow', async () => {
    const sdk = createSDK();
    await expect(sdk.timeout(() => new Promise((r) => setTimeout(r, 500)), 50)).rejects.toThrow(
      'Timeout after 50ms',
    );
  });
});
