import type { Hono } from 'hono';

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'OmniWatch API',
    version: '0.8.0',
    description: 'AI Agent Orchestration Platform',
  },
  servers: [{ url: 'http://localhost:3456', description: 'Local development' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/agents': {
      get: {
        summary: 'List agents',
        tags: ['Agents'],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'limit', in: 'query', schema: { type: 'integer' }, description: 'Max results' },
          { name: 'offset', in: 'query', schema: { type: 'integer' }, description: 'Offset for pagination' },
        ],
        responses: { '200': { description: 'Agent list' } },
      },
      post: {
        summary: 'Create agent',
        tags: ['Agents'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: { '201': { description: 'Created' } },
      },
    },
    '/api/agents/{id}': {
      get: {
        summary: 'Get agent by ID',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Agent details' }, '404': { description: 'Not found' } },
      },
      delete: {
        summary: 'Delete agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/api/agents/{id}/start': {
      post: {
        summary: 'Start agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Started' } },
      },
    },
    '/api/agents/{id}/stop': {
      post: {
        summary: 'Stop agent',
        tags: ['Agents'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Stopped' } },
      },
    },
    '/api/marketplace': {
      get: {
        summary: 'List marketplace recipes',
        tags: ['Marketplace'],
        responses: { '200': { description: 'Recipe list' } },
      },
    },
    '/api/analytics/metrics': {
      get: {
        summary: 'Get metrics',
        tags: ['Analytics'],
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string' }, description: 'Time period (hourly/daily)' },
        ],
        responses: { '200': { description: 'Metrics data' } },
      },
    },
    '/api/analytics/anomalies': {
      get: {
        summary: 'Get anomalies',
        tags: ['Analytics'],
        responses: { '200': { description: 'Anomaly list' } },
      },
    },
    '/api/system/status': {
      get: {
        summary: 'System status',
        tags: ['System'],
        responses: { '200': { description: 'System status information' } },
      },
    },
    '/api/notifications': {
      get: {
        summary: 'List notifications',
        tags: ['Notifications'],
        responses: { '200': { description: 'Notification list' } },
      },
    },
    '/api/queue/stats': {
      get: {
        summary: 'Queue statistics',
        tags: ['Queue'],
        responses: { '200': { description: 'Queue stats' } },
      },
    },
    '/api/tenants': {
      get: {
        summary: 'List tenants',
        tags: ['Tenants'],
        responses: { '200': { description: 'Tenant list' } },
      },
    },
    '/api/mesh/events': {
      get: {
        summary: 'List mesh events',
        tags: ['Mesh'],
        responses: { '200': { description: 'Mesh event list' } },
      },
    },
  },
  components: {
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
