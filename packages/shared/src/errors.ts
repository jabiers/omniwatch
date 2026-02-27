export class OmniError extends Error {
  constructor(
    public code: string,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'OmniError';
  }
}

export const Errors = {
  DAEMON_NOT_RUNNING: () =>
    new OmniError('DAEMON_NOT_RUNNING', 'Daemon is not running. Start with: omni daemon start'),
  AGENT_NOT_FOUND: (id: string) =>
    new OmniError('AGENT_NOT_FOUND', `Agent '${id}' not found`, { id }),
  AGENT_ALREADY_RUNNING: (id: string) =>
    new OmniError('AGENT_ALREADY_RUNNING', `Agent '${id}' is already running`, { id }),
  AGENT_NOT_RUNNING: (id: string) =>
    new OmniError('AGENT_NOT_RUNNING', `Agent '${id}' is not running`, { id }),
  GENERATION_FAILED: (reason: string) =>
    new OmniError('GENERATION_FAILED', `Code generation failed: ${reason}`),
  VALIDATION_FAILED: (issues: string[]) =>
    new OmniError('VALIDATION_FAILED', `Code validation failed`, { issues }),
  INSTALL_FAILED: (reason: string) =>
    new OmniError('INSTALL_FAILED', `Dependency installation failed: ${reason}`),
  HEAL_EXHAUSTED: (id: string) =>
    new OmniError('HEAL_EXHAUSTED', `Agent '${id}' exceeded max heal attempts (3)`, { id }),
  MAX_AGENTS_REACHED: () =>
    new OmniError('MAX_AGENTS_REACHED', 'Maximum number of agents reached (20)'),
  MAX_AGENTS_EXCEEDED: (current: number, max: number) =>
    new OmniError('MAX_AGENTS_EXCEEDED', `Agent limit reached: ${current}/${max} active agents`),
} as const;
