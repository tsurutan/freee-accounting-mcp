/**
 * MCP関連の型定義
 * 
 * Model Context Protocol (MCP) に関連する型定義を集約
 */

// 型レジストリ（実行時にアクセス可能）
export const MCP_TYPES = {
  MCPResource: 'MCPResource',
  MCPTool: 'MCPTool',
  MCPPrompt: 'MCPPrompt',
  MCPRequest: 'MCPRequest',
  MCPResponse: 'MCPResponse',
  MCPError: 'MCPError',
  MCPServerInfo: 'MCPServerInfo',
  MCPServerCapabilities: 'MCPServerCapabilities',
} as const;

// === MCP 基本型 ===

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

// === MCP リクエスト・レスポンス型 ===

export interface MCPRequest {
  method: string;
  params?: any;
  id?: string | number;
}

export interface MCPResponse {
  result?: any;
  error?: MCPError;
  id?: string | number;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// === MCP リソース関連型 ===

export interface MCPResourceInfo {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: Uint8Array;
}

export interface MCPResourceResponse {
  contents: Array<{
    uri: string;
    mimeType: string;
    text?: string;
    blob?: Uint8Array;
  }>;
}

export interface MCPListResourcesResponse {
  resources: MCPResource[];
}

export interface MCPReadResourceRequest {
  uri: string;
}

// === MCP ツール関連型 ===

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface MCPListToolsResponse {
  tools: MCPTool[];
}

export interface MCPCallToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

// === MCP プロンプト関連型 ===

export interface MCPPromptInfo {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

export interface MCPPromptRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface MCPPromptResponse {
  description: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
  }>;
}

export interface MCPListPromptsResponse {
  prompts: MCPPrompt[];
}

export interface MCPGetPromptRequest {
  name: string;
  arguments?: Record<string, any>;
}

// === MCP サーバー関連型 ===

export interface MCPServerInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
}

export interface MCPServerCapabilities {
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  logging?: {
    level?: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  };
}

export interface MCPInitializeRequest {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface MCPInitializeResponse {
  protocolVersion: string;
  capabilities: MCPServerCapabilities;
  serverInfo: MCPServerInfo;
}

// === MCP ハンドラー関連型 ===

export interface MCPResourceHandler {
  getResourceInfo(): MCPResourceInfo[];
  readResource(uri: string): Promise<MCPResourceResponse>;
  supportsUri(uri: string): boolean;
}

export interface MCPToolHandler {
  getToolInfo(): MCPToolInfo[];
  executeTool(name: string, args?: Record<string, any>): Promise<MCPToolResponse>;
  supportsTool(name: string): boolean;
}

export interface MCPPromptHandler {
  getPromptInfo(): MCPPromptInfo[];
  getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResponse>;
  supportsPrompt(name: string): boolean;
}

// === MCP レジストリ関連型 ===

export interface MCPResourceRegistry {
  register(handler: MCPResourceHandler): void;
  unregister(handler: MCPResourceHandler): void;
  getAllResources(): MCPResourceInfo[];
  readResource(uri: string): Promise<MCPResourceResponse>;
  findHandler(uri: string): MCPResourceHandler | undefined;
}

export interface MCPToolRegistry {
  register(handler: MCPToolHandler): void;
  unregister(handler: MCPToolHandler): void;
  getAllTools(): MCPToolInfo[];
  executeTool(name: string, args?: Record<string, any>): Promise<MCPToolResponse>;
  findHandler(name: string): MCPToolHandler | undefined;
}

export interface MCPPromptRegistry {
  register(handler: MCPPromptHandler): void;
  unregister(handler: MCPPromptHandler): void;
  getAllPrompts(): MCPPromptInfo[];
  getPrompt(name: string, args?: Record<string, any>): Promise<MCPPromptResponse>;
  findHandler(name: string): MCPPromptHandler | undefined;
}

// === MCP ミドルウェア関連型 ===

export interface MCPMiddleware {
  name: string;
  priority: number;
  beforeRequest?(request: MCPRequest): Promise<MCPRequest>;
  afterResponse?(response: MCPResponse): Promise<MCPResponse>;
  onError?(error: Error): Promise<MCPError>;
}

export interface MCPMiddlewareContext {
  request: MCPRequest;
  response?: MCPResponse;
  error?: Error;
  metadata: Record<string, any>;
}

// === MCP 設定関連型 ===

export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  transport: {
    type: 'stdio' | 'sse' | 'websocket';
    options?: Record<string, any>;
  };
  capabilities: MCPServerCapabilities;
  middleware?: MCPMiddleware[];
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file';
    file?: string;
  };
  security?: {
    allowedOrigins?: string[];
    rateLimiting?: {
      maxRequests: number;
      windowMs: number;
    };
    authentication?: {
      required: boolean;
      type: 'bearer' | 'basic' | 'custom';
    };
  };
}

// === MCP イベント関連型 ===

export interface MCPEvent {
  type: string;
  timestamp: Date;
  data: any;
  source: string;
}

export interface MCPResourceChangedEvent extends MCPEvent {
  type: 'resource_changed';
  data: {
    uri: string;
    changeType: 'created' | 'updated' | 'deleted';
  };
}

export interface MCPToolChangedEvent extends MCPEvent {
  type: 'tool_changed';
  data: {
    name: string;
    changeType: 'added' | 'updated' | 'removed';
  };
}

export interface MCPPromptChangedEvent extends MCPEvent {
  type: 'prompt_changed';
  data: {
    name: string;
    changeType: 'added' | 'updated' | 'removed';
  };
}

// === MCP 統計・監視関連型 ===

export interface MCPServerStats {
  uptime: number;
  totalRequests: number;
  requestsByMethod: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

export interface MCPRequestMetrics {
  method: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  clientInfo?: {
    name: string;
    version: string;
  };
}

// === MCP セキュリティ関連型 ===

export interface MCPSecurityContext {
  clientId?: string;
  permissions: string[];
  rateLimitInfo?: {
    remaining: number;
    resetTime: Date;
  };
  authenticationInfo?: {
    type: string;
    principal: string;
    expiresAt?: Date;
  };
}

export interface MCPAccessControl {
  canAccessResource(uri: string, context: MCPSecurityContext): boolean;
  canExecuteTool(name: string, context: MCPSecurityContext): boolean;
  canAccessPrompt(name: string, context: MCPSecurityContext): boolean;
}

// === MCP 拡張関連型 ===

export interface MCPExtension {
  name: string;
  version: string;
  description?: string;
  initialize(server: any): Promise<void>;
  shutdown(): Promise<void>;
}

export interface MCPPlugin extends MCPExtension {
  resourceHandlers?: MCPResourceHandler[];
  toolHandlers?: MCPToolHandler[];
  promptHandlers?: MCPPromptHandler[];
  middleware?: MCPMiddleware[];
}
