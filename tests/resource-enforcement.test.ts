import { describe, it, expect } from 'vitest';
import { MAX_AGENTS, AGENT_MEMORY_LIMIT } from '../src/shared/constants.js';

describe('Resource Enforcement', () => {
  it('should have MAX_AGENTS set to 20', () => {
    expect(MAX_AGENTS).toBe(20);
  });

  it('should have AGENT_MEMORY_LIMIT set to 128 MB', () => {
    expect(AGENT_MEMORY_LIMIT).toBe(128);
  });
});
