import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

// Test the do command structure by importing it
import { doCommand } from '../src/cli/commands/do.js';

describe('Do Command', () => {
  it('should be a Commander instance', () => {
    expect(doCommand).toBeInstanceOf(Command);
  });

  it('should have name "do"', () => {
    expect(doCommand.name()).toBe('do');
  });

  it('should accept a prompt argument', () => {
    const args = doCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0].name()).toBe('prompt');
    expect(args[0].required).toBe(true);
  });

  it('should have --once option', () => {
    const opt = doCommand.options.find(o => o.long === '--once');
    expect(opt).toBeDefined();
  });

  it('should have --schedule option', () => {
    const opt = doCommand.options.find(o => o.long === '--schedule');
    expect(opt).toBeDefined();
  });

  it('should have --preview option', () => {
    const opt = doCommand.options.find(o => o.long === '--preview');
    expect(opt).toBeDefined();
  });

  it('should have --template option', () => {
    const opt = doCommand.options.find(o => o.long === '--template');
    expect(opt).toBeDefined();
  });
});
