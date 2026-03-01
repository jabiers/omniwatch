import { describe, it, expect } from 'vitest';
import { getErrorMessage, safeJsonParse } from '@omniwatch/shared';

describe('getErrorMessage', () => {
  it('should extract message from Error instance', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('should stringify non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('string error');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(null)).toBe('null');
  });
});

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    expect(safeJsonParse('["a","b"]', [])).toEqual(['a', 'b']);
    expect(safeJsonParse('{"key":"val"}', {})).toEqual({ key: 'val' });
  });

  it('should return fallback for invalid JSON', () => {
    expect(safeJsonParse('not-json', [])).toEqual([]);
    expect(safeJsonParse('{broken', {})).toEqual({});
  });

  it('should return fallback for null/undefined', () => {
    expect(safeJsonParse(null, [])).toEqual([]);
    expect(safeJsonParse(undefined, {})).toEqual({});
    expect(safeJsonParse('', ['default'])).toEqual(['default']);
  });
});
