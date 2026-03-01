import type { Hono } from 'hono';
import { APP_VERSION } from '@omniwatch/shared';

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const seqParam = { name: 'seq', in: 'path', required: true, schema: { type: 'integer' } };
const okResponse = (desc: string) => ({
  '200': {
    description: desc,
    content: {
      'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    },
  },
});
const paginationParams = [
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
];

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'OmniWatch API',
    version: APP_VERSION,
    description:
      'AI Agent Orchestration Platform — 65+ endpoints for agent lifecycle, mesh, analytics, marketplace, and more.',
  },
  servers: [{ url: 'http://localhost:3456', description: 'Local development' }],
  paths: {
    // ── System ──
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/system/health/detailed': {
      get: {
        summary: 'Detailed health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Detailed health status with DB and memory checks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'integer' },
                    version: { type: 'string' },
                    checks: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/system/status': {
      get: {
        summary: 'System status',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Agent counts, DB size, uptime',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agentCount: { type: 'integer' },
                    runningCount: { type: 'integer' },
                    dbSize: { type: 'integer' },
                    uptime: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/system/ollama': {
      get: {
        summary: 'Check Ollama availability',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Ollama status and available models',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    available: { type: 'boolean' },
                    models: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Agents ──
    '/api/agents': {
      get: {
        summary: 'List agents',
        tags: ['Agents'],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['idle', 'running', 'stopped', 'error'] },
          },
          ...paginationParams,
        ],
        responses: {
          '200': {
            description: 'Agent list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agents: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create agent',
        tags: ['Agents'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AgentCreate' } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Agent' } } },
          },
        },
      },
    },
    '/api/agents/bulk': {
      post: {
        summary: 'Bulk agent action (start/stop/restart/destroy)',
        tags: ['Agents'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action', 'ids'],
                properties: {
                  action: {
                    type: 'string',
                    enum: ['start', 'stop', 'restart', 'destroy'],
                  },
                  ids: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 50,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Bulk results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          success: { type: 'boolean' },
                          error: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/agents/{id}': {
      get: {
        summary: 'Get agent by ID',
        tags: ['Agents'],
        parameters: [idParam],
        responses: {
          '200': {
            description: 'Agent details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Agent' } } },
          },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete agent',
        tags: ['Agents'],
        parameters: [idParam],
        responses: { ...okResponse('Deleted'), '404': { description: 'Not found' } },
      },
    },
    '/api/agents/{id}/start': {
      post: {
        summary: 'Start agent',
        tags: ['Agents'],
        parameters: [idParam],
        responses: okResponse('Started'),
      },
    },
    '/api/agents/{id}/stop': {
      post: {
        summary: 'Stop agent',
        tags: ['Agents'],
        parameters: [idParam],
        responses: okResponse('Stopped'),
      },
    },
    '/api/agents/{id}/restart': {
      post: {
        summary: 'Restart agent',
        tags: ['Agents'],
        parameters: [idParam],
        responses: okResponse('Restarted'),
      },
    },
    '/api/agents/{id}/logs': {
      get: {
        summary: 'Get agent logs',
        tags: ['Agents'],
        parameters: [
          idParam,
          { name: 'level', in: 'query', schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: {
          '200': {
            description: 'Log entries',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logs: { type: 'array', items: { type: 'object' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/agents/{id}/metrics': {
      get: {
        summary: 'Get agent metrics',
        tags: ['Agents'],
        parameters: [idParam],
        responses: {
          '200': {
            description: 'Agent metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { metrics: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },

    // ── Chat ──
    '/api/agents/{id}/chat': {
      post: {
        summary: 'Send chat message to agent',
        tags: ['Chat'],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string' } },
                required: ['message'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Chat response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { response: { type: 'string' }, code: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/agents/preview': {
      post: {
        summary: 'Preview agent code from prompt',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { prompt: { type: 'string' }, template: { type: 'string' } },
                required: ['prompt'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated code preview',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { code: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/api/agents/{id}/apply': {
      post: {
        summary: 'Apply code change to agent',
        tags: ['Chat'],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { code: { type: 'string' } },
                required: ['code'],
              },
            },
          },
        },
        responses: okResponse('Code applied'),
      },
    },

    // ── Snapshots ──
    '/api/agents/{id}/snapshots': {
      get: {
        summary: 'List agent snapshots',
        tags: ['Snapshots'],
        parameters: [idParam],
        responses: {
          '200': {
            description: 'Snapshot list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { snapshots: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Capture agent snapshot',
        tags: ['Snapshots'],
        parameters: [idParam],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { label: { type: 'string' } } },
            },
          },
        },
        responses: { '201': { description: 'Snapshot captured' } },
      },
    },
    '/api/agents/{id}/snapshots/{seq}/restore': {
      post: {
        summary: 'Restore agent snapshot',
        tags: ['Snapshots'],
        parameters: [idParam, seqParam],
        responses: okResponse('Snapshot restored'),
      },
    },
    '/api/agents/{id}/children': {
      get: {
        summary: 'Get child agents (spawn chain)',
        tags: ['Snapshots'],
        parameters: [idParam],
        responses: {
          '200': {
            description: 'Child agents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    children: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Config ──
    '/api/config': {
      get: {
        summary: 'Get configuration',
        tags: ['Config'],
        responses: {
          '200': {
            description: 'Current config (sensitive fields masked)',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
      put: {
        summary: 'Update configuration',
        tags: ['Config'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', properties: { config: { type: 'object' } } },
            },
          },
        },
        responses: okResponse('Config updated'),
      },
    },

    // ── Mesh ──
    '/api/mesh/events': {
      get: {
        summary: 'List mesh events',
        tags: ['Mesh'],
        parameters: paginationParams,
        responses: {
          '200': {
            description: 'Mesh event list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { events: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },
    '/api/mesh/topology': {
      get: {
        summary: 'Get mesh topology',
        tags: ['Mesh'],
        responses: {
          '200': {
            description: 'Mesh node graph',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nodes: { type: 'array', items: { type: 'object' } },
                    edges: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/mesh/subscriptions': {
      get: {
        summary: 'List mesh subscriptions',
        tags: ['Mesh'],
        responses: {
          '200': {
            description: 'Active subscriptions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { subscriptions: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },

    // ── Analytics ──
    '/api/analytics/metrics': {
      get: {
        summary: 'Get metric rollups',
        tags: ['Analytics'],
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily'] } },
        ],
        responses: {
          '200': {
            description: 'Metrics data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { metrics: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/anomalies': {
      get: {
        summary: 'Get detected anomalies',
        tags: ['Analytics'],
        responses: {
          '200': {
            description: 'Anomaly list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { anomalies: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },
    '/api/analytics/alerts': {
      get: {
        summary: 'List alert rules',
        tags: ['Analytics'],
        responses: {
          '200': {
            description: 'Alert rules',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    alerts: { type: 'array', items: { $ref: '#/components/schemas/AlertRule' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create alert rule',
        tags: ['Analytics'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AlertRule' } } },
        },
        responses: { '201': { description: 'Alert rule created' } },
      },
    },
    '/api/analytics/alerts/{id}': {
      put: {
        summary: 'Update alert rule',
        tags: ['Analytics'],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: okResponse('Alert updated'),
      },
      delete: {
        summary: 'Delete alert rule',
        tags: ['Analytics'],
        parameters: [idParam],
        responses: okResponse('Alert deleted'),
      },
    },
    '/api/security/events': {
      get: {
        summary: 'Security audit log',
        tags: ['Analytics'],
        parameters: paginationParams,
        responses: {
          '200': {
            description: 'Security events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { events: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },

    // ── Queue ──
    '/api/queue/stats': {
      get: {
        summary: 'Queue statistics',
        tags: ['Queue'],
        responses: {
          '200': {
            description: 'Queue stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pending: { type: 'integer' },
                    processing: { type: 'integer' },
                    completed: { type: 'integer' },
                    failed: { type: 'integer' },
                    dead_letters: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/queue/dead-letters': {
      get: {
        summary: 'List dead letters',
        tags: ['Queue'],
        parameters: paginationParams,
        responses: {
          '200': {
            description: 'Dead letter list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dead_letters: { type: 'array', items: { type: 'object' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/queue/dead-letters/{id}/retry': {
      post: {
        summary: 'Retry dead letter',
        tags: ['Queue'],
        parameters: [idParam],
        responses: okResponse('Dead letter retried'),
      },
    },

    // ── Notifications ──
    '/api/notifications': {
      get: {
        summary: 'List notifications',
        tags: ['Notifications'],
        parameters: [
          { name: 'agent_id', in: 'query', schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: {
          '200': {
            description: 'Notification list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Recipes ──
    '/api/recipes': {
      get: {
        summary: 'List built-in recipes',
        tags: ['Recipes'],
        parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Recipe list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { recipes: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },
    '/api/recipes/{id}': {
      get: {
        summary: 'Get recipe detail',
        tags: ['Recipes'],
        parameters: [idParam],
        responses: { '200': { description: 'Recipe detail' }, '404': { description: 'Not found' } },
      },
    },
    '/api/recipes/{id}/install': {
      post: {
        summary: 'Install recipe as agent',
        tags: ['Recipes'],
        parameters: [idParam],
        responses: { '201': { description: 'Agent created from recipe' } },
      },
    },

    // ── Marketplace ──
    '/api/marketplace': {
      get: {
        summary: 'List marketplace recipes',
        tags: ['Marketplace'],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: {
          '200': {
            description: 'Recipe list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { recipes: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Publish recipe to marketplace',
        tags: ['Marketplace'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  code: { type: 'string' },
                },
                required: ['name', 'description', 'code'],
              },
            },
          },
        },
        responses: { '201': { description: 'Recipe published' } },
      },
    },
    '/api/marketplace/{id}': {
      get: {
        summary: 'Get marketplace recipe',
        tags: ['Marketplace'],
        parameters: [idParam],
        responses: { '200': { description: 'Recipe detail' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete marketplace recipe',
        tags: ['Marketplace'],
        parameters: [idParam],
        responses: okResponse('Recipe deleted'),
      },
    },
    '/api/marketplace/{id}/install': {
      post: {
        summary: 'Install marketplace recipe as agent',
        tags: ['Marketplace'],
        parameters: [idParam],
        responses: { '201': { description: 'Agent created from marketplace recipe' } },
      },
    },

    // ── Usage ──
    '/api/usage': {
      get: {
        summary: 'AI usage summary',
        tags: ['Usage'],
        parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: {
          '200': {
            description: 'Usage and cost data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usage: { type: 'array', items: { type: 'object' } },
                    total_cost: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Tenants ──
    '/api/tenants': {
      get: {
        summary: 'List tenants',
        tags: ['Tenants'],
        responses: {
          '200': {
            description: 'Tenant list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { tenants: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create tenant',
        tags: ['Tenants'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { name: { type: 'string' }, plan: { type: 'string' } },
                required: ['name'],
              },
            },
          },
        },
        responses: { '201': { description: 'Tenant created' } },
      },
    },
    '/api/tenants/{id}': {
      put: {
        summary: 'Update tenant',
        tags: ['Tenants'],
        parameters: [idParam],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: okResponse('Tenant updated'),
      },
    },
    '/api/users': {
      get: {
        summary: 'List users',
        tags: ['Tenants'],
        responses: {
          '200': {
            description: 'User list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { users: { type: 'array', items: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create user with API key',
        tags: ['Tenants'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
                },
                required: ['email', 'role'],
              },
            },
          },
        },
        responses: { '201': { description: 'User created (API key in response)' } },
      },
    },
    '/api/users/{id}': {
      delete: {
        summary: 'Delete user',
        tags: ['Tenants'],
        parameters: [idParam],
        responses: okResponse('User deleted'),
      },
    },
    '/api/users/{id}/rotate-key': {
      post: {
        summary: 'Rotate user API key',
        tags: ['Tenants'],
        parameters: [idParam],
        responses: {
          '200': {
            description: 'New API key (shown once)',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { key: { type: 'string' } } },
              },
            },
          },
        },
      },
    },

    // ── Auth / OAuth ──
    '/api/auth/login': {
      post: {
        summary: 'Login with API key',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { key: { type: 'string' } },
                required: ['key'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    role: { type: 'string' },
                    tenant_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout (invalidate session)',
        tags: ['Auth'],
        responses: okResponse('Session invalidated'),
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Get current user',
        tags: ['Auth'],
        responses: {
          '200': {
            description: 'Current user info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    tenant_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/github': {
      get: {
        summary: 'GitHub OAuth redirect',
        tags: ['Auth'],
        responses: { '302': { description: 'Redirect to GitHub' } },
      },
    },
    '/api/auth/github/callback': {
      get: {
        summary: 'GitHub OAuth callback',
        tags: ['Auth'],
        responses: { '302': { description: 'Redirect with session' } },
      },
    },
    '/api/auth/google': {
      get: {
        summary: 'Google OAuth redirect',
        tags: ['Auth'],
        responses: { '302': { description: 'Redirect to Google' } },
      },
    },
    '/api/auth/google/callback': {
      get: {
        summary: 'Google OAuth callback',
        tags: ['Auth'],
        responses: { '302': { description: 'Redirect with session' } },
      },
    },

    // ── MCP ──
    '/api/mcp': {
      post: {
        summary: 'MCP Streamable HTTP endpoint',
        tags: ['MCP'],
        description:
          'Model Context Protocol endpoint providing 7 tools and 3 resources for AI integration.',
        responses: { '200': { description: 'MCP response' } },
      },
      get: {
        summary: 'MCP server info',
        tags: ['MCP'],
        responses: { '200': { description: 'MCP server capabilities' } },
      },
      delete: {
        summary: 'Close MCP session',
        tags: ['MCP'],
        responses: okResponse('Session closed'),
      },
    },
  },
  components: {
    schemas: {
      Agent: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique agent identifier' },
          name: { type: 'string', description: 'Agent display name' },
          status: {
            type: 'string',
            enum: ['idle', 'running', 'stopped', 'error', 'healing', 'creating'],
            description: 'Current agent status',
          },
          prompt: { type: 'string', description: 'System prompt for the agent' },
          model: { type: 'string', description: 'AI model identifier' },
          type: {
            type: 'string',
            enum: ['watcher', 'responder', 'scheduler'],
            description: 'Agent type',
          },
          code_hash: { type: 'string', description: 'SHA-256 hash of agent code' },
          heal_count: { type: 'integer', description: 'Number of self-heal attempts' },
          error_count: { type: 'integer', description: 'Cumulative error count' },
          tenant_id: { type: 'string', description: 'Owner tenant' },
          sandbox_level: { type: 'string', enum: ['strict', 'standard', 'permissive'] },
          parent_id: {
            type: 'string',
            nullable: true,
            description: 'Parent agent ID (spawn chain)',
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'status', 'prompt', 'created_at'],
      },
      AgentCreate: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent display name' },
          prompt: { type: 'string', description: 'System prompt for the agent' },
          model: { type: 'string', description: 'AI model identifier (optional)' },
        },
        required: ['name', 'prompt'],
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          agent_id: { type: 'string' },
          type: { type: 'string' },
          message: { type: 'string' },
          read: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'type', 'message', 'read', 'created_at'],
      },
      AlertRule: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          metric_name: { type: 'string' },
          condition: { type: 'string', enum: ['gt', 'lt', 'eq'] },
          threshold: { type: 'number' },
          enabled: { type: 'boolean' },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
      },
      BearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
};

/** Register OpenAPI spec and Swagger UI routes */
export function registerOpenAPI(app: Hono) {
  app.get('/api/docs/spec', (c) => c.json(spec));
  app.get('/api/docs', (c) => {
    return c.html(`<!DOCTYPE html>
<html><head><title>OmniWatch API Docs</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<style>body { background: #0a0a0f; }</style>
</head><body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: '/api/docs/spec', dom_id: '#swagger-ui', deepLinking: true });</script>
</body></html>`);
  });
}
