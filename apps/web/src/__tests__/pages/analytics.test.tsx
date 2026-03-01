import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsPage from '../../app/analytics/page';

// Mock recharts to avoid canvas rendering issues
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
}));

vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ id: 'a1', name: 'Agent 1', status: 'running' }]),
      });
    }
    if (url.includes('/api/analytics/anomalies')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/api/analytics/alerts')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    if (url.includes('/api/analytics/metrics')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('should render analytics heading after load', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByText('Analytics')).toBeInTheDocument();
  });

  it('should render summary cards', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByText('Metric Rows')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    // "Alert Rules" appears in both summary card and section heading
    expect(screen.getAllByText('Alert Rules').length).toBeGreaterThanOrEqual(2);
  });

  it('should render time range and period toggles', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByText('1h')).toBeInTheDocument();
    expect(screen.getByText('24h')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('hourly')).toBeInTheDocument();
    expect(screen.getByText('daily')).toBeInTheDocument();
  });

  it('should have export CSV and refresh buttons', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByLabelText('Export metrics as CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Refresh analytics')).toBeInTheDocument();
  });

  it('should render alert rules section with new rule button', async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByText('New Rule')).toBeInTheDocument();
  });
});
