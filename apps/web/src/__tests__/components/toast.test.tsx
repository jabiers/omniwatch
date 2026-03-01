import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from '../../components/toast';
import { useToastStore } from '../../lib/toast-store';

describe('ToastContainer', () => {
  it('should render toast messages', () => {
    useToastStore.setState({
      toasts: [{ id: '1', message: 'Hello Toast', type: 'success' }],
    });
    render(<ToastContainer />);
    expect(screen.getByText('Hello Toast')).toBeInTheDocument();
  });

  it('should render nothing when no toasts', () => {
    useToastStore.setState({ toasts: [] });
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('should render multiple toasts', () => {
    useToastStore.setState({
      toasts: [
        { id: '1', message: 'First', type: 'success' },
        { id: '2', message: 'Second', type: 'error' },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
