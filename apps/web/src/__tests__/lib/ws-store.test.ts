import { describe, it, expect } from 'vitest';
import { setWsStatus, useWsStatus } from '../../lib/ws-store';

describe('ws-store', () => {
  it('should export setWsStatus and useWsStatus', () => {
    expect(typeof setWsStatus).toBe('function');
    expect(typeof useWsStatus).toBe('function');
  });

  it('should not throw on setWsStatus calls', () => {
    expect(() => setWsStatus('connected')).not.toThrow();
    expect(() => setWsStatus('reconnecting')).not.toThrow();
    expect(() => setWsStatus('disconnected')).not.toThrow();
  });

  it('should be idempotent for same status', () => {
    // Calling with same status should not throw
    setWsStatus('connected');
    expect(() => setWsStatus('connected')).not.toThrow();
  });
});
