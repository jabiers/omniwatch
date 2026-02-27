import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { log } from '@omniwatch/shared';
import { loadConfig } from '@omniwatch/db';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  chat(system: string, messages: ChatMessage[], maxTokens?: number): Promise<string>;
}

/** Anthropic Claude provider */
class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(system: string, messages: ChatMessage[], maxTokens = 4096): Promise<string> {
    const response = await this.client.messages.create({
      model: loadConfig().ai.model || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }
    return content.text;
  }
}

/** OpenAI provider (GPT-4o, o3-mini, etc.) */
class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(system: string, messages: ChatMessage[], maxTokens = 4096): Promise<string> {
    const model = loadConfig().ai.model || 'gpt-4o';

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('Unexpected response from OpenAI');
    }
    return choice.message.content;
  }
}

/** Detect provider from model name */
function detectProvider(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return 'anthropic';
}

/** Resolve API key for the given provider */
function resolveApiKey(provider: string): string {
  const config = loadConfig();

  if (provider === 'openai') {
    return config.ai.api_key || process.env.OPENAI_API_KEY || '';
  }

  // Default: Anthropic
  return config.ai.api_key || process.env.ANTHROPIC_API_KEY || process.env.OMNI_ANTHROPIC_API_KEY || '';
}

let cachedProvider: { key: string; provider: AIProvider } | null = null;

/** Get the AI provider based on current config */
export function getAIProvider(): AIProvider {
  const config = loadConfig();
  const model = config.ai.model || 'claude-sonnet-4-20250514';
  const provider = config.ai.provider || detectProvider(model);
  const apiKey = resolveApiKey(provider);

  if (!apiKey) {
    throw new Error(
      `API key not configured for ${provider}. ` +
      `Run: omni config set ai.api_key <your-key>`
    );
  }

  // Cache provider instance if key unchanged
  const cacheKey = `${provider}:${apiKey}`;
  if (cachedProvider?.key === cacheKey) {
    return cachedProvider.provider;
  }

  let instance: AIProvider;
  switch (provider) {
    case 'openai':
      instance = new OpenAIProvider(apiKey);
      log('info', `AI provider: OpenAI (${model})`);
      break;
    case 'anthropic':
    default:
      instance = new AnthropicProvider(apiKey);
      log('info', `AI provider: Anthropic (${model})`);
      break;
  }

  cachedProvider = { key: cacheKey, provider: instance };
  return instance;
}
