import { describe, it, expect } from 'vitest';
import {
  SANDBOX_TIMEOUT_STRICT, SANDBOX_TIMEOUT_STANDARD, SANDBOX_TIMEOUT_PERMISSIVE,
  SANDBOX_MEMORY_STRICT, SANDBOX_MEMORY_STANDARD, SANDBOX_MEMORY_PERMISSIVE,
  QUEUE_MAX_RETRIES, QUEUE_BACKPRESSURE_LIMIT, QUEUE_CLEANUP_DAYS, QUEUE_BATCH_SIZE,
  API_KEY_PREFIX, API_KEY_LENGTH, DEFAULT_TENANT_ID, MAX_AGENTS_FREE, MAX_AGENTS_PRO,
  METRIC_ROLLUP_INTERVAL, ANOMALY_Z_THRESHOLD, ANOMALY_WINDOW_HOURS, ALERT_CHECK_INTERVAL,
} from '@omniwatch/shared';

describe('v0.6 Constants', () => {
  describe('Sandbox constants', () => {
    it('should have correct timeout values', () => {
      expect(SANDBOX_TIMEOUT_STRICT).toBe(10_000);
      expect(SANDBOX_TIMEOUT_STANDARD).toBe(30_000);
      expect(SANDBOX_TIMEOUT_PERMISSIVE).toBe(60_000);
    });

    it('should have correct memory values in MB', () => {
      expect(SANDBOX_MEMORY_STRICT).toBe(64);
      expect(SANDBOX_MEMORY_STANDARD).toBe(128);
      expect(SANDBOX_MEMORY_PERMISSIVE).toBe(256);
    });

    it('timeouts should be in ascending order', () => {
      expect(SANDBOX_TIMEOUT_STRICT).toBeLessThan(SANDBOX_TIMEOUT_STANDARD);
      expect(SANDBOX_TIMEOUT_STANDARD).toBeLessThan(SANDBOX_TIMEOUT_PERMISSIVE);
    });
  });

  describe('Queue constants', () => {
    it('should have correct queue values', () => {
      expect(QUEUE_MAX_RETRIES).toBe(3);
      expect(QUEUE_BACKPRESSURE_LIMIT).toBe(1000);
      expect(QUEUE_CLEANUP_DAYS).toBe(7);
      expect(QUEUE_BATCH_SIZE).toBe(50);
    });

    it('all values should be positive', () => {
      expect(QUEUE_MAX_RETRIES).toBeGreaterThan(0);
      expect(QUEUE_BACKPRESSURE_LIMIT).toBeGreaterThan(0);
      expect(QUEUE_CLEANUP_DAYS).toBeGreaterThan(0);
      expect(QUEUE_BATCH_SIZE).toBeGreaterThan(0);
    });
  });

  describe('Multi-tenant constants', () => {
    it('should have correct auth values', () => {
      expect(API_KEY_PREFIX).toBe('omni_');
      expect(API_KEY_LENGTH).toBe(32);
      expect(DEFAULT_TENANT_ID).toBe('default');
    });

    it('should have correct plan limits', () => {
      expect(MAX_AGENTS_FREE).toBe(10);
      expect(MAX_AGENTS_PRO).toBe(50);
      expect(MAX_AGENTS_FREE).toBeLessThan(MAX_AGENTS_PRO);
    });
  });

  describe('Analytics constants', () => {
    it('should have correct analytics values', () => {
      expect(METRIC_ROLLUP_INTERVAL).toBe(3_600_000); // 1 hour
      expect(ANOMALY_Z_THRESHOLD).toBe(2.5);
      expect(ANOMALY_WINDOW_HOURS).toBe(24);
      expect(ALERT_CHECK_INTERVAL).toBe(300_000); // 5 min
    });

    it('z-threshold should be reasonable (2-4)', () => {
      expect(ANOMALY_Z_THRESHOLD).toBeGreaterThanOrEqual(2);
      expect(ANOMALY_Z_THRESHOLD).toBeLessThanOrEqual(4);
    });
  });
});
