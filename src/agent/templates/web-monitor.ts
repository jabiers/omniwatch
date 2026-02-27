import type { AgentTemplate } from './base-prompt.js';

export const webMonitorTemplate: AgentTemplate = {
  name: 'web-monitor',
  description: 'Monitor a webpage for changes',
  promptSuffix: '\n\nUse cheerio to parse HTML. Compare with stored hash to detect changes.',
  defaultDependencies: ['cheerio'],
};
