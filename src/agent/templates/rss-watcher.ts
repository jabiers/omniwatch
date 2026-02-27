import type { AgentTemplate } from './base-prompt.js';

export const rssWatcherTemplate: AgentTemplate = {
  name: 'rss-watcher',
  description: 'Watch RSS feed for new entries',
  promptSuffix: '\n\nUse rss-parser to parse the feed. Notify on new entries not seen before.',
  defaultDependencies: ['rss-parser'],
};
