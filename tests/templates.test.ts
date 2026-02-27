import { describe, it, expect } from 'vitest';
import { registerTemplate, getTemplate, listTemplates, TEMPLATES, BASE_SYSTEM_PROMPT } from '../src/agent/templates/base-prompt.js';
import { webMonitorTemplate } from '../src/agent/templates/web-monitor.js';
import { apiCheckerTemplate } from '../src/agent/templates/api-checker.js';
import { rssWatcherTemplate } from '../src/agent/templates/rss-watcher.js';

describe('Agent Templates', () => {
  it('BASE_SYSTEM_PROMPT contains essential rules', () => {
    expect(BASE_SYSTEM_PROMPT).toContain('Export a default');
    expect(BASE_SYSTEM_PROMPT).toContain('omni.fetch');
    expect(BASE_SYSTEM_PROMPT).toContain('NEVER use');
  });

  it('web-monitor template has correct structure', () => {
    expect(webMonitorTemplate.name).toBe('web-monitor');
    expect(webMonitorTemplate.defaultDependencies).toContain('cheerio');
    expect(webMonitorTemplate.promptSuffix).toContain('cheerio');
  });

  it('api-checker template has correct structure', () => {
    expect(apiCheckerTemplate.name).toBe('api-checker');
    expect(apiCheckerTemplate.defaultDependencies).toHaveLength(0);
    expect(apiCheckerTemplate.promptSuffix).toContain('response time');
  });

  it('rss-watcher template has correct structure', () => {
    expect(rssWatcherTemplate.name).toBe('rss-watcher');
    expect(rssWatcherTemplate.defaultDependencies).toContain('rss-parser');
  });

  it('registers and retrieves templates', () => {
    // Clear any previously registered templates
    for (const key of Object.keys(TEMPLATES)) {
      delete TEMPLATES[key];
    }

    registerTemplate(webMonitorTemplate);
    registerTemplate(apiCheckerTemplate);

    expect(getTemplate('web-monitor')).toBe(webMonitorTemplate);
    expect(getTemplate('api-checker')).toBe(apiCheckerTemplate);
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('lists all registered templates', () => {
    for (const key of Object.keys(TEMPLATES)) {
      delete TEMPLATES[key];
    }

    registerTemplate(webMonitorTemplate);
    registerTemplate(apiCheckerTemplate);
    registerTemplate(rssWatcherTemplate);

    const all = listTemplates();
    expect(all).toHaveLength(3);
    expect(all.map((t) => t.name)).toContain('web-monitor');
    expect(all.map((t) => t.name)).toContain('api-checker');
    expect(all.map((t) => t.name)).toContain('rss-watcher');
  });
});
