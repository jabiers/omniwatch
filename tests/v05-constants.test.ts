import { describe, it, expect } from 'vitest';
import {
  MESH_RATE_LIMIT,
  MESH_MAX_PAYLOAD_SIZE,
  MAX_SPAWN_DEPTH,
  SPAWN_RATE_LIMIT,
  MAX_SNAPSHOTS_PER_AGENT,
} from '@omniwatch/shared';

describe('v0.5 constants', () => {
  it('MESH_RATE_LIMIT is 100/min', () => {
    expect(MESH_RATE_LIMIT).toBe(100);
  });

  it('MESH_MAX_PAYLOAD_SIZE is 64KB', () => {
    expect(MESH_MAX_PAYLOAD_SIZE).toBe(65_536);
  });

  it('MAX_SPAWN_DEPTH is 3', () => {
    expect(MAX_SPAWN_DEPTH).toBe(3);
  });

  it('SPAWN_RATE_LIMIT is 5/min', () => {
    expect(SPAWN_RATE_LIMIT).toBe(5);
  });

  it('MAX_SNAPSHOTS_PER_AGENT is 50', () => {
    expect(MAX_SNAPSHOTS_PER_AGENT).toBe(50);
  });

  it('all v0.5 constants are positive numbers', () => {
    expect(MESH_RATE_LIMIT).toBeGreaterThan(0);
    expect(MESH_MAX_PAYLOAD_SIZE).toBeGreaterThan(0);
    expect(MAX_SPAWN_DEPTH).toBeGreaterThan(0);
    expect(SPAWN_RATE_LIMIT).toBeGreaterThan(0);
    expect(MAX_SNAPSHOTS_PER_AGENT).toBeGreaterThan(0);
  });
});
