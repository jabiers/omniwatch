import { describe, it, expect } from 'vitest';
import { Command } from 'commander';

import { autoCommand } from '../apps/cli/src/commands/auto.js';

describe('Auto Command', () => {
  it('should be a Commander instance', () => {
    expect(autoCommand).toBeInstanceOf(Command);
  });

  it('should have name "auto"', () => {
    expect(autoCommand.name()).toBe('auto');
  });

  it('should accept a prompt argument', () => {
    const args = autoCommand.registeredArguments;
    expect(args.length).toBe(1);
    expect(args[0].name()).toBe('prompt');
    expect(args[0].required).toBe(true);
  });

  it('should have --preview option', () => {
    const opt = autoCommand.options.find(o => o.long === '--preview');
    expect(opt).toBeDefined();
  });

  it('should have --template option', () => {
    const opt = autoCommand.options.find(o => o.long === '--template');
    expect(opt).toBeDefined();
  });
});
