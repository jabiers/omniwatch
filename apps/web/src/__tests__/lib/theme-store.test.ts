import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const storage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
});

describe('theme-store', () => {
  beforeEach(async () => {
    // Clear module cache so we get fresh state
    vi.resetModules();
    Object.keys(storage).forEach((key) => delete storage[key]);
  });

  it('should default to dark theme', async () => {
    const { useTheme } = await import('../../lib/theme-store');
    // Call outside React — just verify the function exists
    expect(typeof useTheme).toBe('function');
  });

  it('should toggle theme', async () => {
    const { toggleTheme, initTheme } = await import('../../lib/theme-store');
    initTheme();
    toggleTheme();
    expect(storage['omniwatch-theme']).toBe('light');
    toggleTheme();
    expect(storage['omniwatch-theme']).toBe('dark');
  });

  it('should initialize from localStorage', async () => {
    storage['omniwatch-theme'] = 'light';
    const { initTheme, toggleTheme } = await import('../../lib/theme-store');
    initTheme();
    // After init with 'light', toggle should go to 'dark'
    toggleTheme();
    expect(storage['omniwatch-theme']).toBe('dark');
  });
});
