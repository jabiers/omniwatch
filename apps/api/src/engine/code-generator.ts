import { log } from '@omniwatch/shared';
import {
  BASE_SYSTEM_PROMPT,
  getTemplate,
  registerTemplate,
} from './agent/templates/base-prompt.js';
import { getAIProvider, setAIContext } from './ai-provider.js';
import { webMonitorTemplate } from './agent/templates/web-monitor.js';
import { apiCheckerTemplate } from './agent/templates/api-checker.js';
import { rssWatcherTemplate } from './agent/templates/rss-watcher.js';
import { doerTemplate } from './agent/templates/doer.js';
import { autoTemplate } from './agent/templates/auto.js';

// Register built-in templates
registerTemplate(webMonitorTemplate);
registerTemplate(apiCheckerTemplate);
registerTemplate(rssWatcherTemplate);
registerTemplate(doerTemplate);
registerTemplate(autoTemplate);

/** Extract JSON object from AI response that may contain markdown or extra text */
function extractJson(raw: string): string {
  let text = raw.trim();

  // Strip markdown code fences
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // If it already starts with {, use as-is
  if (text.startsWith('{')) return text;

  // Find first { and last } to extract embedded JSON
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text;
}

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
  const ai = getAIProvider();

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

  log('info', 'Generating agent code with AI...');
  setAIContext({ operation: 'generate' });

  const text = await ai.chat(BASE_SYSTEM_PROMPT, [{ role: 'user', content: finalPrompt }]);

  try {
    const result = JSON.parse(extractJson(text)) as GeneratedAgent;

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
    throw new Error('Failed to parse AI response', { cause: err });
  }
}

export async function regenerateAgentCode(
  prompt: string,
  currentCode: string,
  error: string,
): Promise<GeneratedAgent> {
  const ai = getAIProvider();

  log('info', 'Regenerating agent code (self-healing)...');
  setAIContext({ operation: 'regenerate' });

  const text = await ai.chat(BASE_SYSTEM_PROMPT, [
    { role: 'user', content: prompt },
    {
      role: 'assistant',
      content: JSON.stringify({
        name: 'agent',
        description: '',
        code: currentCode,
        dependencies: [],
      }),
    },
    {
      role: 'user',
      content: `The agent code above failed with this error:\n\n${error}\n\nPlease fix the code and respond with the corrected JSON.`,
    },
  ]);

  return JSON.parse(extractJson(text)) as GeneratedAgent;
}
