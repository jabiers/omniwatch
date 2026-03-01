import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { log } from '@vigil/shared';
import { loadConfig, recordAIUsage, calculateCost } from '@vigil/db';

/** Context for tracking which agent/operation is using AI */
let aiContext: { agentId?: string; operation: string } = { operation: 'unknown' };

/** Set the current AI usage context before calling chat() */
export function setAIContext(ctx: { agentId?: string; operation: string }): void {
  aiContext = ctx;
}

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
    const model = loadConfig().ai.model || 'claude-sonnet-4-20250514';
    const start = Date.now();

    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    // Track usage
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    try {
      recordAIUsage({
        agent_id: aiContext.agentId,
        provider: 'anthropic',
        model,
        operation: aiContext.operation,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: calculateCost(model, inputTokens, outputTokens),
        duration_ms: Date.now() - start,
      });
    } catch {
      /* non-critical */
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
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system + '\n\nIMPORTANT: Always respond with valid JSON only.' },
        ...messages,
      ],
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('Unexpected response from OpenAI');
    }

    // Track usage
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    try {
      recordAIUsage({
        agent_id: aiContext.agentId,
        provider: 'openai',
        model,
        operation: aiContext.operation,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: calculateCost(model, inputTokens, outputTokens),
        duration_ms: Date.now() - start,
      });
    } catch {
      /* non-critical */
    }

    return choice.message.content;
  }
}

/** Ollama provider — local AI via Ollama HTTP API (no API key needed) */
class OllamaProvider implements AIProvider {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async chat(system: string, messages: ChatMessage[], maxTokens = 4096): Promise<string> {
    const model = loadConfig().ai.model || 'llama3.2';
    const start = Date.now();

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: system + '\n\nIMPORTANT: Always respond with valid JSON only.',
          },
          ...messages,
        ],
        stream: false,
        options: { num_predict: maxTokens },
        format: 'json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ollama request failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };
    if (!data.message?.content) {
      throw new Error('Unexpected response from Ollama');
    }

    // Track usage (Ollama is free but track tokens for insights)
    const inputTokens = data.prompt_eval_count || 0;
    const outputTokens = data.eval_count || 0;
    try {
      recordAIUsage({
        agent_id: aiContext.agentId,
        provider: 'ollama',
        model,
        operation: aiContext.operation,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: 0, // Local = free
        duration_ms: Date.now() - start,
      });
    } catch {
      /* non-critical */
    }

    return data.message.content;
  }
}

/** Known Ollama model prefixes */
const OLLAMA_MODEL_PREFIXES = [
  'llama',
  'mistral',
  'mixtral',
  'codellama',
  'qwen',
  'deepseek',
  'gemma',
  'phi',
  'vicuna',
  'orca',
  'neural-chat',
  'starling',
  'yi',
  'solar',
  'nous-hermes',
  'dolphin',
  'wizardlm',
  'zephyr',
  'tinyllama',
  'starcoder',
  'command-r',
  'granite',
];

/** Detect provider from model name */
function detectProvider(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  // Check if model matches any known Ollama model prefix
  const lower = model.toLowerCase();
  if (OLLAMA_MODEL_PREFIXES.some((p) => lower.startsWith(p))) return 'ollama';
  // Explicit ollama: prefix for arbitrary models
  if (lower.startsWith('ollama:')) return 'ollama';
  return 'anthropic';
}

/** Resolve API key for the given provider */
function resolveApiKey(provider: string): string {
  const config = loadConfig();

  if (provider === 'openai') {
    return config.ai.api_key || process.env.OPENAI_API_KEY || '';
  }

  // Default: Anthropic
  return (
    config.ai.api_key || process.env.ANTHROPIC_API_KEY || process.env.OMNI_ANTHROPIC_API_KEY || ''
  );
}

let cachedProvider: { key: string; provider: AIProvider } | null = null;

/** Get the AI provider based on current config */
export function getAIProvider(): AIProvider {
  const config = loadConfig();
  const model = config.ai.model || 'claude-sonnet-4-20250514';
  // Always detect provider from model name (config.ai.provider is ignored)
  const provider = detectProvider(model);
  // Ollama: no API key needed (local)
  if (provider === 'ollama') {
    const ollamaUrl = config.ai.ollama_url || 'http://localhost:11434';
    const cacheKey = `ollama:${ollamaUrl}`;
    if (cachedProvider?.key === cacheKey) {
      return cachedProvider.provider;
    }
    const instance = new OllamaProvider(ollamaUrl);
    // Strip "ollama:" prefix if used
    const displayModel = model.startsWith('ollama:') ? model.slice(7) : model;
    log('info', `AI provider: Ollama @ ${ollamaUrl} (${displayModel})`);
    cachedProvider = { key: cacheKey, provider: instance };
    return instance;
  }

  const apiKey = resolveApiKey(provider);

  if (!apiKey) {
    throw new Error(
      `API key not configured for ${provider}. ` + `Run: vigil config set ai.api_key <your-key>`,
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
