export type Severity = 'critical' | 'warning' | 'info';

export interface NotificationPayload {
  agentId: string;
  title: string;
  message: string;
  severity: Severity;
  timestamp: string;
}

export interface NotificationChannel {
  name: string;
  isConfigured(): boolean;
  send(payload: NotificationPayload): Promise<void>;
}
