import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../../components/status-badge';

describe('StatusBadge', () => {
  it('should render status text', () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('should apply emerald color for running status', () => {
    const { container } = render(<StatusBadge status="running" />);
    const dot = container.querySelector('span span');
    expect(dot?.className).toContain('bg-emerald-500');
  });

  it('should apply red color for error status', () => {
    const { container } = render(<StatusBadge status="error" />);
    const dot = container.querySelector('span span');
    expect(dot?.className).toContain('bg-red-500');
  });

  it('should apply yellow color for healing status', () => {
    const { container } = render(<StatusBadge status="healing" />);
    const dot = container.querySelector('span span');
    expect(dot?.className).toContain('bg-yellow-500');
  });

  it('should fallback to gray for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown" />);
    const dot = container.querySelector('span span');
    expect(dot?.className).toContain('bg-gray-500');
  });
});
