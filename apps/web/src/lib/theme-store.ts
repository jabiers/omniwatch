'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'dark' | 'light';

let theme: Theme = 'dark';
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  return theme;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

/** Initialize theme from localStorage (call once on mount) */
export function initTheme() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('vigil-theme') as Theme | null;
  theme = saved === 'light' ? 'light' : 'dark';
  applyTheme();
}

function applyTheme() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
    html.classList.remove('light');
  } else {
    html.classList.add('light');
    html.classList.remove('dark');
  }
}

export function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  if (typeof window !== 'undefined') {
    localStorage.setItem('vigil-theme', theme);
  }
  applyTheme();
  notify();
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => 'dark' as Theme);
  return { theme: current, toggleTheme };
}
