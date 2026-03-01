import type { AgentTemplate } from './base-prompt.js';

export const apiCheckerTemplate: AgentTemplate = {
  name: 'api-checker',
  description: 'Monitor API endpoint health and response time',
  promptSuffix: '\n\nCheck response status, response time, and validate response body structure.',
  defaultDependencies: [],
};
