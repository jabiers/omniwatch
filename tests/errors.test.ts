import { describe, it, expect } from 'vitest';
import { OmniError, Errors } from '../src/shared/errors.js';

describe('OmniError', () => {
  it('creates an error with code and message', () => {
    const err = new OmniError('TEST_CODE', 'test message');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.name).toBe('OmniError');
    expect(err).toBeInstanceOf(Error);
  });

  it('includes optional data', () => {
    const err = new OmniError('TEST', 'msg', { foo: 'bar' });
    expect(err.data).toEqual({ foo: 'bar' });
  });
});

describe('Errors factory', () => {
  it('DAEMON_NOT_RUNNING', () => {
    const err = Errors.DAEMON_NOT_RUNNING();
    expect(err.code).toBe('DAEMON_NOT_RUNNING');
    expect(err.message).toContain('Daemon is not running');
  });

  it('AGENT_NOT_FOUND includes id', () => {
    const err = Errors.AGENT_NOT_FOUND('agent-abc');
    expect(err.code).toBe('AGENT_NOT_FOUND');
    expect(err.message).toContain('agent-abc');
    expect(err.data).toEqual({ id: 'agent-abc' });
  });

  it('AGENT_ALREADY_RUNNING includes id', () => {
    const err = Errors.AGENT_ALREADY_RUNNING('agent-xyz');
    expect(err.code).toBe('AGENT_ALREADY_RUNNING');
    expect(err.message).toContain('agent-xyz');
  });

  it('VALIDATION_FAILED includes issues', () => {
    const err = Errors.VALIDATION_FAILED(['issue1', 'issue2']);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.data).toEqual({ issues: ['issue1', 'issue2'] });
  });

  it('HEAL_EXHAUSTED includes id', () => {
    const err = Errors.HEAL_EXHAUSTED('agent-123');
    expect(err.code).toBe('HEAL_EXHAUSTED');
    expect(err.message).toContain('agent-123');
  });

  it('MAX_AGENTS_REACHED', () => {
    const err = Errors.MAX_AGENTS_REACHED();
    expect(err.code).toBe('MAX_AGENTS_REACHED');
  });
});
