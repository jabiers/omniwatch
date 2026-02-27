import type { AgentTemplate } from './base-prompt.js';

export const doerTemplate: AgentTemplate = {
  name: 'doer',
  description: 'Task execution agent - runs a job once or on schedule',
  promptSuffix: `

## Agent Type: Doer
This is a TASK agent, not a watcher. It should:
1. Execute the requested task (data collection, report generation, file processing, etc.)
2. Log progress with omni.log
3. Notify the user with results when complete
4. For one-time tasks: complete and return
5. For scheduled tasks: execute once per invocation (the scheduler handles repeats)

Use omni.retry() for unreliable operations and omni.timeout() for time-sensitive tasks.`,
  defaultDependencies: ['dayjs'],
};
