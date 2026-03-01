import { Suspense, act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentDetailPage from '../../app/agents/[id]/page';

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

/** Wrap component with Suspense + act() to flush use() Promise */
async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <AgentDetailPage params={Promise.resolve({ id: 'agent-1' })} />
      </Suspense>,
    );
  });
}

// Mock next modules
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock toast store
vi.mock('../../lib/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

const mockAgent = {
  id: 'agent-1',
  name: 'Test Watcher',
  type: 'watcher',
  status: 'running',
  prompt: 'Monitor something',
  created_at: '2026-01-01T00:00:00Z',
  heal_count: 2,
  error_count: 1,
  parent_id: null,
  spawn_depth: 0,
};

const mockMetrics = {
  run_count: 42,
  success_count: 40,
  error_count: 2,
  avg_duration_ms: 1500,
  last_duration_ms: 1200,
};

const mockLogs = [
  {
    id: 1,
    agent_id: 'agent-1',
    level: 'info',
    message: 'Agent started',
    metadata: null,
    created_at: '2026-01-01T00:01:00Z',
  },
  {
    id: 2,
    agent_id: 'agent-1',
    level: 'error',
    message: 'Connection failed',
    metadata: null,
    created_at: '2026-01-01T00:02:00Z',
  },
];

const mockSnapshots = [
  {
    id: 1,
    agent_id: 'agent-1',
    seq: 1,
    label: 'before-update',
    created_at: '2026-01-01T00:00:00Z',
  },
];

const mockChildren = [
  {
    id: 'child-1',
    name: 'Sub Watcher',
    status: 'running',
    type: 'watcher',
    spawn_depth: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockImplementation((url: string) => {
    if (url.match(/\/api\/agents\/[^/]+\/logs/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ logs: mockLogs }) });
    }
    if (url.match(/\/api\/agents\/[^/]+\/metrics/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ metrics: mockMetrics }) });
    }
    if (url.match(/\/api\/agents\/[^/]+\/snapshots/)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ snapshots: mockSnapshots }),
      });
    }
    if (url.match(/\/api\/agents\/[^/]+\/children/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ children: mockChildren }) });
    }
    if (url.match(/\/api\/analytics\/metrics/)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ metrics: [] }) });
    }
    if (url.match(/\/api\/agents\//)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAgent) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }),
}));

describe('AgentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render back link to agents list', async () => {
    await renderPage();
    expect(await screen.findByText('Back to Agents')).toBeInTheDocument();
  });

  it('should render agent name and status', async () => {
    await renderPage();
    expect(await screen.findByText('Test Watcher')).toBeInTheDocument();
    expect(await screen.findByText('running')).toBeInTheDocument();
  });

  it('should render agent type', async () => {
    await renderPage();
    expect(await screen.findByText('watcher')).toBeInTheDocument();
  });

  it('should render action buttons (start, stop, restart, destroy)', async () => {
    await renderPage();
    expect(await screen.findByLabelText('Start agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Stop agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Restart agent')).toBeInTheDocument();
    expect(screen.getByLabelText('Destroy agent')).toBeInTheDocument();
  });

  it('should render prompt section', async () => {
    await renderPage();
    expect(await screen.findByText('Prompt')).toBeInTheDocument();
    expect(screen.getByText('Monitor something')).toBeInTheDocument();
  });

  it('should render metrics summary cards', async () => {
    await renderPage();
    expect(await screen.findByText('Run Count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
  });

  it('should render all 5 tab buttons', async () => {
    await renderPage();
    expect(await screen.findByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Snapshots')).toBeInTheDocument();
    expect(screen.getByText('Children')).toBeInTheDocument();
  });

  it('should render logs tab content by default', async () => {
    await renderPage();
    expect(await screen.findByText('Live Logs')).toBeInTheDocument();
    expect(await screen.findByText('Agent started')).toBeInTheDocument();
  });

  it('should render log level filter buttons', async () => {
    await renderPage();
    expect(await screen.findByText('all')).toBeInTheDocument();
    // Log filter buttons use 'capitalize' class and lowercase text
    const filterButtons = screen.getAllByText('info');
    expect(filterButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('debug')).toBeInTheDocument();
  });

  it('should render search logs input', async () => {
    await renderPage();
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
  });

  it('should render snapshot and children count badges', async () => {
    await renderPage();
    // Both Snapshots and Children tabs show count badge (1 each)
    const badges = screen.getAllByText('1');
    expect(badges.length).toBe(2);
  });
});
