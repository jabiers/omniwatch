import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../../components/empty-state';

describe('EmptyState', () => {
  it('should render default message', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('should render custom message', () => {
    render(<EmptyState message="No agents yet" />);
    expect(screen.getByText('No agents yet')).toBeInTheDocument();
  });

  it('should render inbox icon', () => {
    const { container } = render(<EmptyState />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
