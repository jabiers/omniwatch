import {
  createAgentRecord,
  getAgent,
  listAgents,
  startAgent,
  stopAgent,
  restartAgent,
  destroyAgent,
  updateAgent,
} from '../agent-manager.js';
import { generateAgentCode } from '../code-generator.js';
import { validateCode } from '../code-validator.js';
import { installDependencies } from '../dependency-installer.js';
import { Errors, log } from '@omniwatch/shared';
import type { Agent } from '@omniwatch/shared';

export const handleAgentRPC = {
  async create(params: Record<string, unknown>) {
    const prompt = params.prompt as string;
    if (!prompt) throw new Error('prompt is required');

    log('info', `Creating agent from prompt: "${prompt.slice(0, 80)}..."`);

    const template = params.template as string | undefined;

    // 1. Generate code with AI
    const generated = await generateAgentCode(prompt, template);

    // 2. Validate generated code
    const validation = validateCode(generated.code);
    if (!validation.valid) {
      throw Errors.VALIDATION_FAILED(validation.issues);
    }

    // 3. Create agent record (user-provided name takes priority)
    const agentName = (params.name as string)?.trim() || generated.name;
    const tenantId = params.tenantId as string | undefined;
    const agent = createAgentRecord(
      prompt,
      agentName,
      generated.description,
      generated.code,
      {
        dependencies: generated.dependencies,
      },
      undefined,
      tenantId,
    );

    // 4. Install npm dependencies
    if (generated.dependencies.length > 0) {
      await installDependencies(agent.id);
    }

    // 5. Start the agent
    await startAgent(agent.id);

    return getAgent(agent.id);
  },

  async list(params: Record<string, unknown>) {
    const status = params.status as string | undefined;
    return listAgents(status);
  },

  async get(params: Record<string, unknown>) {
    const id = params.id as string;
    const agent = getAgent(id);
    if (!agent) throw Errors.AGENT_NOT_FOUND(id);
    return agent;
  },

  async start(params: Record<string, unknown>) {
    const id = params.id as string;
    // Reset heal state on manual start so self-healing can retry
    updateAgent(id, { heal_count: 0, error_count: 0, last_error: null } as Partial<Agent>);
    await startAgent(id);
    return getAgent(id);
  },

  async stop(params: Record<string, unknown>) {
    const id = params.id as string;
    await stopAgent(id);
    return getAgent(id);
  },

  async restart(params: Record<string, unknown>) {
    const id = params.id as string;
    // Reset heal state on manual restart so self-healing can retry
    updateAgent(id, { heal_count: 0, error_count: 0, last_error: null } as Partial<Agent>);
    await restartAgent(id);
    return getAgent(id);
  },

  async destroy(params: Record<string, unknown>) {
    const id = params.id as string;
    await destroyAgent(id);
    return { id, status: 'destroyed' };
  },
};
