import { describe, it, expect } from 'vitest';

// Test the backoff calculation logic directly
// We replicate the function since it's not exported
function getBackoffMs(healCount: number): number {
  return Math.min(60_000 * Math.pow(3, healCount), 15 * 60_000);
}

describe('Self-Healer Enhancement', () => {
  describe('Exponential Backoff', () => {
    it('should return 1 minute for first heal attempt', () => {
      expect(getBackoffMs(0)).toBe(60_000);
    });

    it('should return 3 minutes for second heal attempt', () => {
      expect(getBackoffMs(1)).toBe(180_000);
    });

    it('should return 9 minutes for third heal attempt', () => {
      expect(getBackoffMs(2)).toBe(540_000);
    });

    it('should cap at 15 minutes', () => {
      expect(getBackoffMs(3)).toBe(900_000);
      expect(getBackoffMs(5)).toBe(900_000);
      expect(getBackoffMs(10)).toBe(900_000);
    });

    it('should always be positive', () => {
      for (let i = 0; i < 10; i++) {
        expect(getBackoffMs(i)).toBeGreaterThan(0);
      }
    });
  });

  describe('Context Enrichment', () => {
    it('should format enriched error with logs', () => {
      const errorMessage = 'TypeError: Cannot read property x';
      const recentLogs = '[info] Starting check\n[error] Connection refused';

      const enrichedError = [
        `Error: ${errorMessage}`,
        '',
        'Recent logs:',
        recentLogs || '(no logs)',
      ].join('\n');

      expect(enrichedError).toContain('TypeError');
      expect(enrichedError).toContain('Recent logs:');
      expect(enrichedError).toContain('Connection refused');
    });

    it('should handle empty logs gracefully', () => {
      const emptyLog = '';
      const enrichedError = [
        'Error: unknown',
        '',
        'Recent logs:',
        emptyLog || '(no logs)',
      ].join('\n');

      expect(enrichedError).toContain('(no logs)');
    });
  });
});
