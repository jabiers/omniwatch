import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock state ---
const mockRun = vi.fn().mockReturnValue({ changes: 0 });
const mockAll = vi.fn().mockReturnValue([]);
const mockGet = vi.fn();

vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (_sql: string) => ({
      run: mockRun,
      all: mockAll,
      get: mockGet,
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

import {
  recordMetric,
  recordAgentStart,
  recordAgentStop,
  recordAgentError,
  recordAgentHeal,
  recordMeshEventSent,
  recordMeshEventReceived,
  performHourlyRollup,
  performDailyRollup,
  getAgentMetrics,
  getMetricsByName,
} from '../apps/api/src/engine/metrics-collector.js';

describe('Metrics Collector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockReturnValue({ changes: 0 });
  });

  // ---------- recordMetric ----------
  describe('recordMetric', () => {
    it('should insert a metric record into metric_rollups', () => {
      recordMetric('agent-1', 'cpu_usage', 75.5);

      expect(mockRun).toHaveBeenCalledWith('agent-1', 'cpu_usage', 75.5, 75.5, 75.5);
    });

    it('should silently ignore errors', () => {
      mockRun.mockImplementationOnce(() => {
        throw new Error('DB error');
      });

      // Should not throw
      expect(() => recordMetric('agent-1', 'cpu_usage', 50)).not.toThrow();
    });

    it('should set min, max, and avg to the same value', () => {
      recordMetric('agent-1', 'memory', 128);

      const args = mockRun.mock.calls[0];
      // agent_id, metric_name, min, max, avg
      expect(args[2]).toBe(128); // min_value
      expect(args[3]).toBe(128); // max_value
      expect(args[4]).toBe(128); // avg_value
    });
  });

  // ---------- recordAgentStart ----------
  describe('recordAgentStart', () => {
    it('should record start_count metric with value 1', () => {
      recordAgentStart('agent-1');

      expect(mockRun).toHaveBeenCalledWith('agent-1', 'start_count', 1, 1, 1);
    });
  });

  // ---------- recordAgentStop ----------
  describe('recordAgentStop', () => {
    it('should record stop_count metric with value 1', () => {
      recordAgentStop('agent-2');

      expect(mockRun).toHaveBeenCalledWith('agent-2', 'stop_count', 1, 1, 1);
    });
  });

  // ---------- recordAgentError ----------
  describe('recordAgentError', () => {
    it('should record error_count metric with value 1', () => {
      recordAgentError('agent-3');

      expect(mockRun).toHaveBeenCalledWith('agent-3', 'error_count', 1, 1, 1);
    });
  });

  // ---------- recordAgentHeal ----------
  describe('recordAgentHeal', () => {
    it('should record heal_success when heal succeeds', () => {
      recordAgentHeal('agent-4', true);

      expect(mockRun).toHaveBeenCalledWith('agent-4', 'heal_success', 1, 1, 1);
    });

    it('should record heal_failure when heal fails', () => {
      recordAgentHeal('agent-4', false);

      expect(mockRun).toHaveBeenCalledWith('agent-4', 'heal_failure', 1, 1, 1);
    });
  });

  // ---------- recordMeshEventSent / Received ----------
  describe('recordMeshEventSent', () => {
    it('should record mesh_events_sent metric', () => {
      recordMeshEventSent('agent-5');

      expect(mockRun).toHaveBeenCalledWith('agent-5', 'mesh_events_sent', 1, 1, 1);
    });
  });

  describe('recordMeshEventReceived', () => {
    it('should record mesh_events_received metric', () => {
      recordMeshEventReceived('agent-5');

      expect(mockRun).toHaveBeenCalledWith('agent-5', 'mesh_events_received', 1, 1, 1);
    });
  });

  // ---------- performHourlyRollup ----------
  describe('performHourlyRollup', () => {
    it('should return the number of aggregated changes', () => {
      mockRun.mockReturnValueOnce({ changes: 10 });

      const result = performHourlyRollup();
      expect(result).toBe(10);
    });

    it('should return 0 on failure', () => {
      mockRun.mockImplementationOnce(() => {
        throw new Error('rollup error');
      });

      const result = performHourlyRollup();
      expect(result).toBe(0);
    });
  });

  // ---------- performDailyRollup ----------
  describe('performDailyRollup', () => {
    it('should return the number of aggregated changes', () => {
      mockRun.mockReturnValueOnce({ changes: 5 });

      const result = performDailyRollup();
      expect(result).toBe(5);
    });

    it('should return 0 on failure', () => {
      mockRun.mockImplementationOnce(() => {
        throw new Error('daily error');
      });

      const result = performDailyRollup();
      expect(result).toBe(0);
    });
  });

  // ---------- getAgentMetrics ----------
  describe('getAgentMetrics', () => {
    it('should query metrics for an agent with default period and limit', () => {
      const metrics = [
        { metric_name: 'cpu', avg_value: 50, count: 10, period_start: '2026-03-01T10:00:00' },
      ];
      mockAll.mockReturnValueOnce(metrics);

      const result = getAgentMetrics('agent-1');
      expect(result).toEqual(metrics);
      expect(mockAll).toHaveBeenCalledWith('agent-1', 'hourly', 24);
    });

    it('should accept custom period and limit', () => {
      mockAll.mockReturnValueOnce([]);

      getAgentMetrics('agent-1', 'daily', 7);
      expect(mockAll).toHaveBeenCalledWith('agent-1', 'daily', 7);
    });

    it('should return empty array when no metrics exist', () => {
      mockAll.mockReturnValueOnce([]);

      const result = getAgentMetrics('no-data');
      expect(result).toEqual([]);
    });
  });

  // ---------- getMetricsByName ----------
  describe('getMetricsByName', () => {
    it('should query metrics across agents for a metric name', () => {
      const metrics = [
        { agent_id: 'agent-1', avg_value: 80, count: 5, period_start: '2026-03-01T10:00:00' },
        { agent_id: 'agent-2', avg_value: 60, count: 3, period_start: '2026-03-01T10:00:00' },
      ];
      mockAll.mockReturnValueOnce(metrics);

      const result = getMetricsByName('error_count');
      expect(result).toEqual(metrics);
      expect(mockAll).toHaveBeenCalledWith('error_count', 'hourly', 100);
    });

    it('should accept custom period and limit', () => {
      mockAll.mockReturnValueOnce([]);

      getMetricsByName('cpu_usage', 'daily', 50);
      expect(mockAll).toHaveBeenCalledWith('cpu_usage', 'daily', 50);
    });
  });
});
