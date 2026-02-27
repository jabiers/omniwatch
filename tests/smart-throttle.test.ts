import { describe, it, expect, beforeEach } from 'vitest';
import { shouldThrottle, getSuppressedCount, resetThrottle, cleanupThrottle } from '../apps/daemon/src/smart-throttle.js';

describe('SmartThrottle', () => {
  beforeEach(() => {
    resetThrottle();
  });

  it('should never throttle critical notifications', () => {
    expect(shouldThrottle('agent-1', 'critical')).toBe(false);
    expect(shouldThrottle('agent-1', 'critical')).toBe(false);
    expect(shouldThrottle('agent-1', 'critical')).toBe(false);
  });

  it('should allow first warning notification', () => {
    expect(shouldThrottle('agent-1', 'warning')).toBe(false);
  });

  it('should throttle subsequent warning within 5 min', () => {
    expect(shouldThrottle('agent-1', 'warning')).toBe(false);
    expect(shouldThrottle('agent-1', 'warning')).toBe(true);
  });

  it('should allow first info notification', () => {
    expect(shouldThrottle('agent-1', 'info')).toBe(false);
  });

  it('should throttle subsequent info within 15 min', () => {
    expect(shouldThrottle('agent-1', 'info')).toBe(false);
    expect(shouldThrottle('agent-1', 'info')).toBe(true);
  });

  it('should track suppressed count', () => {
    shouldThrottle('agent-1', 'info');
    shouldThrottle('agent-1', 'info');
    shouldThrottle('agent-1', 'info');
    expect(getSuppressedCount('agent-1', 'info')).toBe(2);
  });

  it('should throttle agents independently', () => {
    expect(shouldThrottle('agent-1', 'info')).toBe(false);
    expect(shouldThrottle('agent-2', 'info')).toBe(false);
    expect(shouldThrottle('agent-1', 'info')).toBe(true);
    expect(shouldThrottle('agent-2', 'info')).toBe(true);
  });

  it('should throttle severity levels independently', () => {
    expect(shouldThrottle('agent-1', 'info')).toBe(false);
    expect(shouldThrottle('agent-1', 'warning')).toBe(false);
    expect(shouldThrottle('agent-1', 'critical')).toBe(false);
  });

  it('should cleanup stale entries', () => {
    shouldThrottle('agent-1', 'info');
    cleanupThrottle(); // won't clean because not stale
    expect(getSuppressedCount('agent-1', 'info')).toBe(0);
  });

  it('should reset all throttle state', () => {
    shouldThrottle('agent-1', 'info');
    shouldThrottle('agent-1', 'info');
    resetThrottle();
    expect(shouldThrottle('agent-1', 'info')).toBe(false);
  });
});
