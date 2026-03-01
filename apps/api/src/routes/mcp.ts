/** MCP (Model Context Protocol) server — Exposes OmniWatch agents as MCP tools */
import { Hono } from 'hono';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { APP_VERSION } from '@omniwatch/shared';
import { handleAgentRPC, handleSnapshotRPC } from '@omniwatch/daemon/engine';

export const mcpRoutes = new Hono();

/** Create MCP server instance */
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'OmniWatch',
    version: APP_VERSION,
  });

  // Tool: list agents
  server.tool(
    'list_agents',
    'List all OmniWatch agents with their status',
    { status: z.string().optional().describe('Filter by status: running, stopped, error, etc.') },
    async ({ status }) => {
      const db = getDb();
      let agents;
      if (status) {
        agents = db
          .prepare(
            'SELECT id, name, type, status, description, created_at FROM agents WHERE status = ? ORDER BY created_at DESC',
          )
          .all(status);
      } else {
        agents = db
          .prepare(
            "SELECT id, name, type, status, description, created_at FROM agents WHERE status != 'destroyed' ORDER BY created_at DESC",
          )
          .all();
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(agents, null, 2) }] };
    },
  );

  // Tool: get agent details
  server.tool(
    'get_agent',
    'Get detailed information about a specific agent',
    { agent_id: z.string().describe('The agent ID') },
    async ({ agent_id }) => {
      const db = getDb();
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent_id);
      if (!agent) {
        return {
          content: [{ type: 'text' as const, text: `Agent '${agent_id}' not found` }],
          isError: true,
        };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(agent, null, 2) }] };
    },
  );

  // Tool: get agent logs
  server.tool(
    'get_agent_logs',
    'Get recent logs for an agent',
    {
      agent_id: z.string().describe('The agent ID'),
      limit: z.number().optional().default(20).describe('Number of log entries'),
      level: z.string().optional().describe('Filter by log level: info, warn, error'),
    },
    async ({ agent_id, limit, level }) => {
      const db = getDb();
      const safeLimit = Math.min(limit || 20, 100);
      let logs;
      if (level) {
        logs = db
          .prepare(
            'SELECT level, message, created_at FROM agent_logs WHERE agent_id = ? AND level = ? ORDER BY created_at DESC LIMIT ?',
          )
          .all(agent_id, level, safeLimit);
      } else {
        logs = db
          .prepare(
            'SELECT level, message, created_at FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
          )
          .all(agent_id, safeLimit);
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(logs, null, 2) }] };
    },
  );

  // Tool: control agent (start/stop/restart)
  server.tool(
    'control_agent',
    'Start, stop, or restart an agent',
    {
      agent_id: z.string().describe('The agent ID'),
      action: z.enum(['start', 'stop', 'restart']).describe('The action to perform'),
    },
    async ({ agent_id, action }) => {
      try {
        const handler = handleAgentRPC[action as 'start' | 'stop' | 'restart'];
        const result = await handler({ id: agent_id });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: create agent
  server.tool(
    'create_agent',
    'Create a new OmniWatch agent from a natural language prompt',
    {
      prompt: z.string().describe('Natural language description of the agent'),
      name: z.string().optional().describe('Optional agent name'),
    },
    async ({ prompt, name }) => {
      try {
        const result = await handleAgentRPC.create({ prompt, name });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: get system stats
  server.tool('system_stats', 'Get OmniWatch system stats (agent counts, uptime)', {}, async () => {
    const db = getDb();
    const stats = {
      total: (
        db.prepare("SELECT COUNT(*) as c FROM agents WHERE status != 'destroyed'").get() as {
          c: number;
        }
      ).c,
      running: (
        db.prepare("SELECT COUNT(*) as c FROM agents WHERE status = 'running'").get() as {
          c: number;
        }
      ).c,
      error: (
        db.prepare("SELECT COUNT(*) as c FROM agents WHERE status = 'error'").get() as { c: number }
      ).c,
      daemon: true,
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }] };
  });

  // Tool: capture snapshot
  server.tool(
    'capture_snapshot',
    "Capture a time-travel snapshot of an agent's state",
    {
      agent_id: z.string().describe('The agent ID'),
      label: z.string().optional().describe('Optional label for the snapshot'),
    },
    async ({ agent_id, label }) => {
      try {
        const result = await handleSnapshotRPC.capture({ agentId: agent_id, label });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Resource: agent list
  server.resource(
    'agents',
    'omniwatch://agents',
    { description: 'List of all OmniWatch agents' },
    async () => {
      const db = getDb();
      const agents = db
        .prepare(
          "SELECT id, name, type, status FROM agents WHERE status != 'destroyed' ORDER BY created_at DESC",
        )
        .all();
      return {
        contents: [
          {
            uri: 'omniwatch://agents',
            text: JSON.stringify(agents, null, 2),
            mimeType: 'application/json',
          },
        ],
      };
    },
  );

  // Resource: per-agent status (template)
  server.resource(
    'agent_status',
    'agent://{agentId}/status',
    { description: 'Status and details of a specific agent' },
    async (uri) => {
      const agentId = uri.pathname.split('/')[0] || '';
      const db = getDb();
      const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
      if (!agent) {
        return {
          contents: [
            { uri: uri.href, text: `Agent '${agentId}' not found`, mimeType: 'text/plain' },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.href, text: JSON.stringify(agent, null, 2), mimeType: 'application/json' },
        ],
      };
    },
  );

  // Resource: per-agent logs (template)
  server.resource(
    'agent_logs',
    'agent://{agentId}/logs',
    { description: 'Recent logs for a specific agent' },
    async (uri) => {
      const agentId = uri.pathname.split('/')[0] || '';
      const db = getDb();
      const logs = db
        .prepare(
          'SELECT level, message, created_at FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 30',
        )
        .all(agentId);
      return {
        contents: [
          { uri: uri.href, text: JSON.stringify(logs, null, 2), mimeType: 'application/json' },
        ],
      };
    },
  );

  return server;
}

// Shared MCP server + transport instances (stateless mode)
let mcpServer: McpServer | null = null;
let transport: WebStandardStreamableHTTPServerTransport | null = null;

async function ensureMcpReady(): Promise<WebStandardStreamableHTTPServerTransport> {
  if (!transport) {
    mcpServer = createMcpServer();
    transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
      enableJsonResponse: true,
    });
    await mcpServer.connect(transport);
  }
  return transport;
}

/** POST /mcp - Streamable HTTP MCP endpoint */
mcpRoutes.post('/mcp', async (c) => {
  const t = await ensureMcpReady();
  const response = await t.handleRequest(c.req.raw);
  return response;
});

/** GET /mcp - MCP info endpoint */
mcpRoutes.get('/mcp', async (c) => {
  const t = await ensureMcpReady();
  const response = await t.handleRequest(c.req.raw);
  return response;
});

/** DELETE /mcp - MCP session close */
mcpRoutes.delete('/mcp', async (c) => {
  const t = await ensureMcpReady();
  const response = await t.handleRequest(c.req.raw);
  return response;
});
