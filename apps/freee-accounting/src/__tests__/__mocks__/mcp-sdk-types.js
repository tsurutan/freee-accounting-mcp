/**
 * Mock for @modelcontextprotocol/sdk/types.js
 * Used to resolve ES module import issues in Jest tests
 */
/* eslint-env node */

// Mock schema objects that are used by the MCP server
const CallToolRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'tools/call' },
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        arguments: { type: 'object' }
      },
      required: ['name']
    }
  },
  required: ['method', 'params']
};

const ListResourcesRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'resources/list' },
    params: { type: 'object' }
  },
  required: ['method']
};

const ListToolsRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'tools/list' },
    params: { type: 'object' }
  },
  required: ['method']
};

const ReadResourceRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'resources/read' },
    params: {
      type: 'object',
      properties: {
        uri: { type: 'string' }
      },
      required: ['uri']
    }
  },
  required: ['method', 'params']
};

const ListPromptsRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'prompts/list' },
    params: { type: 'object' }
  },
  required: ['method']
};

const GetPromptRequestSchema = {
  type: 'object',
  properties: {
    method: { type: 'string', const: 'prompts/get' },
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    }
  },
  required: ['method', 'params']
};

// Additional commonly used types for completeness
const ResourceTemplate = {
  type: 'object',
  properties: {
    uri: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    mimeType: { type: 'string' }
  },
  required: ['uri', 'name']
};

const ToolTemplate = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    inputSchema: { type: 'object' }
  },
  required: ['name', 'description', 'inputSchema']
};

const PromptTemplate = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' }
  },
  required: ['name', 'description']
};

module.exports = {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ResourceTemplate,
  ToolTemplate,
  PromptTemplate
};