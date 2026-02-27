import type { AgentTemplate } from './base-prompt.js';

export const autoTemplate: AgentTemplate = {
  name: 'auto',
  description: 'Autonomous decision-making agent',
  promptSuffix: `

## Agent Type: Auto (Autonomous)
This is an AUTONOMOUS agent that makes its own decisions. It should:
1. Run in a continuous loop with appropriate sleep intervals
2. Gather data, analyze patterns, and make independent decisions
3. Decide WHEN and IF to notify the user (not every cycle)
4. Maintain internal state via omni.store for trend analysis
5. Use omni.log to record observations and decisions
6. Adapt behavior based on historical data

Pattern: loop { observe → analyze → decide → act → sleep }
Use omni.sleep() between cycles (recommended: 30-60 seconds minimum).`,
  defaultDependencies: ['dayjs', 'lodash'],
};
