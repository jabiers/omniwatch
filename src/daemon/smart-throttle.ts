import type { Severity } from './notification-channels/types.js';

interface ThrottleState {
  lastSent: number;
  suppressedCount: number;
}

const throttleMap = new Map<string, ThrottleState>();

// Throttle windows per severity level
const THROTTLE_WINDOWS: Record<Severity, number> = {
  critical: 0,           // always send immediately
  warning: 5 * 60_000,   // suppress duplicates within 5 min
  info: 15 * 60_000,     // suppress duplicates within 15 min
};

/**
 * Determines if a notification should be throttled.
 * Returns true if the notification should be suppressed.
 */
export function shouldThrottle(agentId: string, severity: Severity): boolean {
  const key = `${agentId}:${severity}`;
  const state = throttleMap.get(key);
  const window = THROTTLE_WINDOWS[severity];

  // Critical notifications are never throttled
  if (window === 0) return false;

  if (!state || Date.now() - state.lastSent >= window) {
    throttleMap.set(key, { lastSent: Date.now(), suppressedCount: 0 });
    return false;
  }

  state.suppressedCount++;
  return true;
}

/**
 * Get the number of suppressed notifications for a given agent/severity.
 */
export function getSuppressedCount(agentId: string, severity: Severity): number {
  const key = `${agentId}:${severity}`;
  return throttleMap.get(key)?.suppressedCount ?? 0;
}

/**
 * Clean up stale throttle entries (older than 30 minutes).
 */
export function cleanupThrottle(): void {
  const now = Date.now();
  for (const [key, state] of throttleMap) {
    if (now - state.lastSent > 30 * 60_000) {
      throttleMap.delete(key);
    }
  }
}

/**
 * Reset throttle state (for testing or manual override).
 */
export function resetThrottle(): void {
  throttleMap.clear();
}
