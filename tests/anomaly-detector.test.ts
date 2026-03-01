import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock state ---
const mockGet = vi.fn();
const mockRun = vi.fn().mockReturnValue({ changes: 0, lastInsertRowid: 1 });
const mockAll = vi.fn().mockReturnValue([]);

vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (_sql: string) => ({
      run: mockRun,
      get: mockGet,
      all: mockAll,
    }),
  }),
}));

vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    log: vi.fn(),
    initLogger: vi.fn(),
  };
});

vi.mock('../apps/daemon/src/notifier.js', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  detectAnomalies,
  checkAlertRules,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from '../apps/daemon/src/anomaly-detector.js';
import { ANOMALY_Z_THRESHOLD } from '@omniwatch/shared';

describe('Anomaly Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 0, lastInsertRowid: 1 });
    mockAll.mockReturnValue([]);
  });

  // ---------- detectAnomalies ----------
  describe('detectAnomalies', () => {
    it('should detect anomaly when z-score exceeds threshold', () => {
      // 1 extreme outlier (1000) among 9 normal values (10)
      // mean = 109, stddev ~ 297, z = (1000-109)/297 ~ 3.0 > 2.5 threshold
      const rollups = [
        { metric_name: 'error_count', avg_value: 1000 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
        { metric_name: 'error_count', avg_value: 10 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');

      expect(anomalies.length).toBe(1);
      expect(anomalies[0].agent_id).toBe('agent-1');
      expect(anomalies[0].metric_name).toBe('error_count');
      expect(anomalies[0].current_value).toBe(1000);
      expect(Math.abs(anomalies[0].z_score)).toBeGreaterThan(ANOMALY_Z_THRESHOLD);
    });

    it('should return empty when z-score is within threshold', () => {
      // All values are similar — no anomaly
      const rollups = [
        { metric_name: 'cpu', avg_value: 50 },
        { metric_name: 'cpu', avg_value: 51 },
        { metric_name: 'cpu', avg_value: 49 },
        { metric_name: 'cpu', avg_value: 50 },
        { metric_name: 'cpu', avg_value: 52 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');
      expect(anomalies).toEqual([]);
    });

    it('should skip metrics with fewer than 3 data points', () => {
      const rollups = [
        { metric_name: 'cpu', avg_value: 1000 },
        { metric_name: 'cpu', avg_value: 10 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');
      expect(anomalies).toEqual([]);
    });

    it('should skip metrics with zero standard deviation', () => {
      const rollups = [
        { metric_name: 'constant', avg_value: 42 },
        { metric_name: 'constant', avg_value: 42 },
        { metric_name: 'constant', avg_value: 42 },
        { metric_name: 'constant', avg_value: 42 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');
      expect(anomalies).toEqual([]);
    });

    it('should check all agents when no agentId is provided', () => {
      // First call: list agents
      mockAll
        .mockReturnValueOnce([{ id: 'a1' }, { id: 'a2' }])
        // Second call: rollups for a1
        .mockReturnValueOnce([])
        // Third call: rollups for a2
        .mockReturnValueOnce([]);

      const anomalies = detectAnomalies();
      expect(anomalies).toEqual([]);
      // all() called 3 times: agent list + 2 agent rollups
      expect(mockAll).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple metrics per agent independently', () => {
      const rollups = [
        // CPU — normal (all similar values, no anomaly)
        { metric_name: 'cpu', avg_value: 50 },
        { metric_name: 'cpu', avg_value: 49 },
        { metric_name: 'cpu', avg_value: 51 },
        { metric_name: 'cpu', avg_value: 50 },
        // Memory — extreme outlier (1000 vs 10s, z ~ 3.0 > 2.5)
        { metric_name: 'memory', avg_value: 1000 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
        { metric_name: 'memory', avg_value: 10 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');
      // Only memory should be anomalous
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].metric_name).toBe('memory');
    });

    it('should round mean, stddev, and z_score to 2 decimal places', () => {
      // Extreme outlier: 1000 among many 10s → z ~ 3.0 > 2.5
      const rollups = [
        { metric_name: 'latency', avg_value: 1000 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
        { metric_name: 'latency', avg_value: 10 },
      ];
      mockAll.mockReturnValueOnce(rollups);

      const anomalies = detectAnomalies('agent-1');
      expect(anomalies.length).toBe(1);

      const a = anomalies[0];
      // All numeric outputs should have at most 2 decimal digits
      expect(a.mean).toBe(Math.round(a.mean * 100) / 100);
      expect(a.stddev).toBe(Math.round(a.stddev * 100) / 100);
      expect(a.z_score).toBe(Math.round(a.z_score * 100) / 100);
    });
  });

  // ---------- checkAlertRules ----------
  describe('checkAlertRules', () => {
    it('should return 0 when no rules exist', async () => {
      mockAll.mockReturnValueOnce([]); // no rules
      const triggered = await checkAlertRules();
      expect(triggered).toBe(0);
    });

    it('should trigger alert when condition is met', async () => {
      const rules = [
        {
          id: 1,
          tenant_id: 'default',
          metric_name: 'error_count',
          operator: 'gt',
          threshold: 5,
          window_minutes: 60,
          notify_channels: '["console"]',
          enabled: 1,
        },
      ];
      // First call: get rules
      mockAll.mockReturnValueOnce(rules);
      // Second call: get metric values
      mockAll.mockReturnValueOnce([
        { agent_id: 'agent-1', avg_val: 10 }, // 10 > 5 → should alert
      ]);

      const triggered = await checkAlertRules();
      expect(triggered).toBe(1);
    });

    it('should not trigger alert when condition is not met', async () => {
      const rules = [
        {
          id: 1,
          tenant_id: 'default',
          metric_name: 'error_count',
          operator: 'gt',
          threshold: 100,
          window_minutes: 60,
          notify_channels: '[]',
          enabled: 1,
        },
      ];
      mockAll.mockReturnValueOnce(rules);
      mockAll.mockReturnValueOnce([
        { agent_id: 'agent-1', avg_val: 5 }, // 5 < 100 → no alert
      ]);

      const triggered = await checkAlertRules();
      expect(triggered).toBe(0);
    });
  });

  // ---------- evaluateRule (tested indirectly through checkAlertRules) ----------
  describe('evaluateRule (via checkAlertRules)', () => {
    const makeRule = (operator: string, threshold: number) => ({
      id: 1,
      tenant_id: 'default',
      metric_name: 'test',
      operator,
      threshold,
      window_minutes: 5,
      notify_channels: '[]',
      enabled: 1,
    });

    it('should handle gt operator', async () => {
      mockAll.mockReturnValueOnce([makeRule('gt', 50)]);
      mockAll.mockReturnValueOnce([{ agent_id: 'a1', avg_val: 51 }]);
      expect(await checkAlertRules()).toBe(1);
    });

    it('should handle lt operator', async () => {
      mockAll.mockReturnValueOnce([makeRule('lt', 50)]);
      mockAll.mockReturnValueOnce([{ agent_id: 'a1', avg_val: 49 }]);
      expect(await checkAlertRules()).toBe(1);
    });

    it('should handle gte operator (equal)', async () => {
      mockAll.mockReturnValueOnce([makeRule('gte', 50)]);
      mockAll.mockReturnValueOnce([{ agent_id: 'a1', avg_val: 50 }]);
      expect(await checkAlertRules()).toBe(1);
    });

    it('should handle lte operator (equal)', async () => {
      mockAll.mockReturnValueOnce([makeRule('lte', 50)]);
      mockAll.mockReturnValueOnce([{ agent_id: 'a1', avg_val: 50 }]);
      expect(await checkAlertRules()).toBe(1);
    });

    it('should return false for unknown operator', async () => {
      mockAll.mockReturnValueOnce([makeRule('eq', 50)]);
      mockAll.mockReturnValueOnce([{ agent_id: 'a1', avg_val: 50 }]);
      expect(await checkAlertRules()).toBe(0);
    });
  });

  // ---------- Alert CRUD ----------
  describe('getAlertRules', () => {
    it('should return all rules when no tenantId', () => {
      const rules = [{ id: 1, metric_name: 'cpu' }];
      mockAll.mockReturnValueOnce(rules);

      const result = getAlertRules();
      expect(result).toEqual(rules);
    });

    it('should filter by tenantId when provided', () => {
      const rules = [{ id: 1, metric_name: 'cpu', tenant_id: 't1' }];
      mockAll.mockReturnValueOnce(rules);

      const result = getAlertRules('t1');
      expect(result).toEqual(rules);
      expect(mockAll).toHaveBeenCalledWith('t1');
    });
  });

  describe('createAlertRule', () => {
    it('should insert a new rule and return it', () => {
      const newRule = {
        tenant_id: 'default',
        metric_name: 'error_count',
        operator: 'gt' as const,
        threshold: 10,
        window_minutes: 5,
        notify_channels: '["console"]',
        enabled: true,
      };
      const savedRule = { id: 1, ...newRule, created_at: '2026-03-01' };
      mockRun.mockReturnValueOnce({ lastInsertRowid: 1 });
      mockGet.mockReturnValueOnce(savedRule);

      const result = createAlertRule(newRule);
      expect(result).toEqual(savedRule);
      expect(mockRun).toHaveBeenCalledWith('default', 'error_count', 'gt', 10, 5, '["console"]', 1);
    });
  });

  describe('updateAlertRule', () => {
    it('should update an existing rule', () => {
      const existing = {
        id: 1,
        tenant_id: 'default',
        metric_name: 'cpu',
        operator: 'gt',
        threshold: 80,
        window_minutes: 5,
        notify_channels: '[]',
        enabled: true,
        created_at: '2026-03-01',
      };
      // First get: existing rule
      mockGet.mockReturnValueOnce(existing);
      // After update: return updated rule
      const updated = { ...existing, threshold: 90 };
      mockGet.mockReturnValueOnce(updated);

      const result = updateAlertRule(1, { threshold: 90 });
      expect(result).toEqual(updated);
    });

    it('should return null when rule does not exist', () => {
      mockGet.mockReturnValueOnce(null);

      const result = updateAlertRule(999, { threshold: 50 });
      expect(result).toBeNull();
    });
  });

  describe('deleteAlertRule', () => {
    it('should return true when rule is deleted', () => {
      mockRun.mockReturnValueOnce({ changes: 1 });

      const result = deleteAlertRule(1);
      expect(result).toBe(true);
    });

    it('should return false when rule does not exist', () => {
      mockRun.mockReturnValueOnce({ changes: 0 });

      const result = deleteAlertRule(999);
      expect(result).toBe(false);
    });
  });
});
