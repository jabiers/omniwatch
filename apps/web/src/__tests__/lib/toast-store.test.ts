import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useToastStore } from '../../lib/toast-store';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should add a toast', () => {
    useToastStore.getState().addToast('Hello', 'success');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
    expect(useToastStore.getState().toasts[0].type).toBe('success');
  });

  it('should default to error type', () => {
    useToastStore.getState().addToast('fail');
    expect(useToastStore.getState().toasts[0].type).toBe('error');
  });

  it('should remove a toast by id', () => {
    useToastStore.getState().addToast('test', 'info');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should auto-dismiss after 5 seconds', () => {
    useToastStore.getState().addToast('auto', 'error');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(5001);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
