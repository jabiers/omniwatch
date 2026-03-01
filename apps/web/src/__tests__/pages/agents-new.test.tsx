import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewAgentPage from '../../app/agents/new/page';

// Mock next modules
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock apiFetch
vi.mock('../../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ id: 'agent-new-1' }),
  }),
}));

// Mock toast store
vi.mock('../../../lib/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

describe('NewAgentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading', () => {
    render(<NewAgentPage />);
    const headings = screen.getAllByText('Create Agent');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Describe what you want in natural language.')).toBeInTheDocument();
  });

  it('should render the prompt textarea', () => {
    render(<NewAgentPage />);
    const textarea = screen.getByLabelText('Prompt');
    expect(textarea).toBeInTheDocument();
  });

  it('should render agent type radio buttons', () => {
    render(<NewAgentPage />);
    expect(screen.getByText('Watcher')).toBeInTheDocument();
    expect(screen.getByText('Doer')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('should render the optional name input', () => {
    render(<NewAgentPage />);
    const nameInput = screen.getByPlaceholderText('my-price-watcher');
    expect(nameInput).toBeInTheDocument();
  });

  it('should render options section with once checkbox and schedule', () => {
    render(<NewAgentPage />);
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Run once (--once)')).toBeInTheDocument();
    expect(screen.getByText('Schedule (--schedule)')).toBeInTheDocument();
  });

  it('should render preview and submit buttons', () => {
    render(<NewAgentPage />);
    expect(screen.getByText('Preview Code')).toBeInTheDocument();
    // Submit button also says "Create Agent"
    const buttons = screen.getAllByText('Create Agent');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('should disable buttons when prompt is empty', () => {
    render(<NewAgentPage />);
    const previewBtn = screen.getByText('Preview Code').closest('button')!;
    expect(previewBtn).toBeDisabled();
  });

  it('should enable buttons when prompt has text', () => {
    render(<NewAgentPage />);
    const textarea = screen.getByLabelText('Prompt');
    fireEvent.change(textarea, { target: { value: 'Monitor CPU usage' } });
    const previewBtn = screen.getByText('Preview Code').closest('button')!;
    expect(previewBtn).not.toBeDisabled();
  });

  it('should have a back link to agents list', () => {
    render(<NewAgentPage />);
    expect(screen.getByText('Back to Agents')).toBeInTheDocument();
  });
});
