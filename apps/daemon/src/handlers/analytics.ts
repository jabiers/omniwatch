/** Analytics RPC handlers */
import {
  getAgentMetrics,
  getMetricsByName,
  performHourlyRollup,
  performDailyRollup,
} from '../metrics-collector.js';
import {
  detectAnomalies,
  checkAlertRules,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from '../anomaly-detector.js';
import type { AlertRule } from '@omniwatch/shared';

export const handleAnalyticsRPC: Record<string, (params: Record<string, unknown>) => unknown> = {
  metrics: (params) => {
    const agentId = params.agentId as string;
    const period = (params.period as 'hourly' | 'daily') || 'hourly';
    const limit = (params.limit as number) || 24;
    if (!agentId) throw new Error('agentId is required');
    return getAgentMetrics(agentId, period, limit);
  },

  metricsByName: (params) => {
    const name = params.name as string;
    const period = (params.period as 'hourly' | 'daily') || 'hourly';
    if (!name) throw new Error('name is required');
    return getMetricsByName(name, period);
  },

  anomalies: (params) => {
    const agentId = params.agentId as string | undefined;
    return detectAnomalies(agentId);
  },

  rollup: () => {
    const hourly = performHourlyRollup();
    const daily = performDailyRollup();
    return { hourly, daily };
  },

  alertRules: (params) => {
    const tenantId = params.tenantId as string | undefined;
    return getAlertRules(tenantId);
  },

  createAlert: (params) => {
    return createAlertRule({
      tenant_id: (params.tenantId as string) || 'default',
      metric_name: params.metricName as string,
      operator: params.operator as 'gt' | 'lt' | 'gte' | 'lte',
      threshold: params.threshold as number,
      window_minutes: (params.windowMinutes as number) || 5,
      notify_channels: JSON.stringify(params.notifyChannels || []),
      enabled: params.enabled !== false,
    });
  },

  updateAlert: (params) => {
    const id = params.id as number;
    if (!id) throw new Error('id is required');
    return updateAlertRule(id, params.updates as Partial<AlertRule>);
  },

  deleteAlert: (params) => {
    const id = params.id as number;
    if (!id) throw new Error('id is required');
    return { deleted: deleteAlertRule(id) };
  },

  checkAlerts: async () => {
    return { triggered: await checkAlertRules() };
  },
};
