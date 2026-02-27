import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../shared/config.js';
import { log } from '../shared/logger.js';
import { BASE_SYSTEM_PROMPT, getTemplate, registerTemplate } from '../agent/templates/base-prompt.js';
import { webMonitorTemplate } from '../agent/templates/web-monitor.js';
import { apiCheckerTemplate } from '../agent/templates/api-checker.js';
import { rssWatcherTemplate } from '../agent/templates/rss-watcher.js';
import { doerTemplate } from '../agent/templates/doer.js';
import { autoTemplate } from '../agent/templates/auto.js';

// Register built-in templates
registerTemplate(webMonitorTemplate);
registerTemplate(apiCheckerTemplate);
registerTemplate(rssWatcherTemplate);
registerTemplate(doerTemplate);
registerTemplate(autoTemplate);

interface GeneratedAgent {
  name: string;
  description: string;
  code: string;
  dependencies: string[];
}

export async function generateAgentCode(
  prompt: string,
  templateName?: string,
): Promise<GeneratedAgent> {
  const config = loadConfig();
  const apiKey = config.ai.api_key || process.env.ANTHROPIC_API_KEY || process.env.OMNI_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Anthropic API key not configured. Run: omni config set ai.api_key <your-key>'
    );
  }

  const client = new Anthropic({ apiKey });

  // Apply template suffix if specified
  let finalPrompt = prompt;
  let extraDeps: string[] = [];
  if (templateName) {
    const template = getTemplate(templateName);
    if (template) {
      finalPrompt = prompt + template.promptSuffix;
      extraDeps = template.defaultDependencies;
      log('info', `Using template: ${template.name}`);
    } else {
      log('warn', `Template '${templateName}' not found, using default`);
    }
  }

  log('info', 'Generating agent code with Claude...');

  const message = await client.messages.create({
    model: config.ai.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: BASE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: finalPrompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText) as GeneratedAgent;

    if (!result.name || !result.code) {
      throw new Error('Invalid response structure');
    }

    // Merge template dependencies
    if (extraDeps.length > 0) {
      const deps = new Set([...result.dependencies, ...extraDeps]);
      result.dependencies = [...deps];
    }

    log('info', `Agent code generated: ${result.name} (${result.dependencies.length} deps)`);
    return result;
  } catch (err) {
    log('error', `Failed to parse generated code: ${err}`);
    throw new Error(`Failed to parse AI response: ${err}`);
  }
}

export async function regenerateAgentCode(
  prompt: string,
  currentCode: string,
  error: string,
): Promise<GeneratedAgent> {
  const config = loadConfig();
  const apiKey = config.ai.api_key || process.env.ANTHROPIC_API_KEY || process.env.OMNI_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const client = new Anthropic({ apiKey });

  log('info', 'Regenerating agent code (self-healing)...');

  const message = await client.messages.create({
    model: config.ai.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: BASE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
      {
        role: 'assistant',
        content: JSON.stringify({ name: 'agent', description: '', code: currentCode, dependencies: [] }),
      },
      {
        role: 'user',
        content: `The agent code above failed with this error:\n\n${error}\n\nPlease fix the code and respond with the corrected JSON.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  let jsonText = content.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonText) as GeneratedAgent;
}
