import type { Hono } from 'hono';
import { APP_VERSION } from '@vigil/shared';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Vigil API',
    version: APP_VERSION,
    description: 'AI Agent Orchestration Platform',
  },
  servers: [{ url: 'http://localhost:3456', description: 'Local development' }],
  paths: {
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
                    status: { type: 'string', example: 'ok' },
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
            description: 'Detailed health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'integer', description: 'Uptime in seconds' },
                    version: { type: 'string', example: APP_VERSION },
                    checks: {
                      type: 'object',
                      properties: {
                        database: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['up', 'down'] },
                          },
                        },
                        memory: {
                          type: 'object',
                          properties: {
                            rss_mb: { type: 'integer' },
                            heap_used_mb: { type: 'integer' },
                            heap_total_mb: { type: 'integer' },
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
    },
    '/api/agents': {
      get: {
        summary: 'List agents',
        tags: ['Agents'],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['idle', 'running', 'stopped', 'error'] },
            description: 'Filter by status',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Max results',
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Offset for pagination',
          },
        ],
        responses: {
          '200': {
            description: 'Agent list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agents: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Agent' },
                    },
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
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AgentCreate' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Agent' },
              },
            },
          },
          '400': { description: 'Invalid request body' },
        },
      },
    },
    '/api/agents/{id}': {
      get: {
        summary: 'Get agent by ID',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Agent details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Agent' },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    id: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/agents/{id}/start': {
      post: {
        summary: 'Start agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Started',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    id: { type: 'string' },
                    status: { type: 'string', example: 'running' },
                  },
                },
              },
            },
          },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/api/agents/{id}/stop': {
      post: {
        summary: 'Stop agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Stopped',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    id: { type: 'string' },
                    status: { type: 'string', example: 'stopped' },
                  },
                },
              },
            },
          },
          '404': { description: 'Agent not found' },
        },
      },
    },
    '/api/marketplace': {
      get: {
        summary: 'List marketplace recipes',
        tags: ['Marketplace'],
        responses: {
          '200': {
            description: 'Recipe list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    recipes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          description: { type: 'string' },
                          author: { type: 'string' },
                          version: { type: 'string' },
                          tags: { type: 'array', items: { type: 'string' } },
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
    '/api/analytics/metrics': {
      get: {
        summary: 'Get metrics',
        tags: ['Analytics'],
        parameters: [
          {
            name: 'period',
            in: 'query',
            schema: { type: 'string', enum: ['hourly', 'daily'] },
            description: 'Time period (hourly/daily)',
          },
        ],
        responses: {
          '200': {
            description: 'Metrics data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    metrics: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          value: { type: 'number' },
                          timestamp: { type: 'string', format: 'date-time' },
                          period: { type: 'string' },
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
    '/api/analytics/anomalies': {
      get: {
        summary: 'Get anomalies',
        tags: ['Analytics'],
        responses: {
          '200': {
            description: 'Anomaly list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    anomalies: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          metric_name: { type: 'string' },
                          z_score: { type: 'number' },
                          value: { type: 'number' },
                          detected_at: { type: 'string', format: 'date-time' },
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
    '/api/system/status': {
      get: {
        summary: 'System status',
        tags: ['System'],
        responses: {
          '200': {
            description: 'System status information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    agentCount: { type: 'integer' },
                    runningCount: { type: 'integer' },
                    daemonPid: { type: 'integer', nullable: true },
                    daemonRunning: { type: 'boolean' },
                    dbSize: { type: 'integer', description: 'Database size in bytes' },
                    uptime: { type: 'number', description: 'Process uptime in seconds' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/notifications': {
      get: {
        summary: 'List notifications',
        tags: ['Notifications'],
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
                  },
                },
              },
            },
          },
        },
      },
    },
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
                  properties: {
                    tenants: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' },
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
    '/api/mesh/events': {
      get: {
        summary: 'List mesh events',
        tags: ['Mesh'],
        responses: {
          '200': {
            description: 'Mesh event list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          topic: { type: 'string' },
                          source_agent_id: { type: 'string' },
                          payload: { type: 'object' },
                          created_at: { type: 'string', format: 'date-time' },
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
            enum: ['idle', 'running', 'stopped', 'error'],
            description: 'Current agent status',
          },
          prompt: { type: 'string', description: 'System prompt for the agent' },
          model: { type: 'string', description: 'AI model identifier' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'name', 'status', 'prompt', 'model', 'created_at'],
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
          id: { type: 'string', description: 'Notification identifier' },
          type: { type: 'string', description: 'Notification type' },
          message: { type: 'string', description: 'Notification message' },
          read: { type: 'boolean', description: 'Whether the notification has been read' },
          created_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'type', 'message', 'read', 'created_at'],
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

/** Register OpenAPI spec and Swagger UI routes */
export function registerOpenAPI(app: Hono) {
  app.get('/api/docs/spec', (c) => c.json(spec));
  app.get('/api/docs', (c) => {
    return c.html(`<!DOCTYPE html>
<html><head><title>Vigil API Docs</title>
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
