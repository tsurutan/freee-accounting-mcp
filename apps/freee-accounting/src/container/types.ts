/**
 * 依存性注入のためのシンボル定義
 */

export const TYPES = {
  // Core Services
  FreeeClient: Symbol.for('FreeeClient'),
  FreeeOAuthClient: Symbol.for('FreeeOAuthClient'),
  Logger: Symbol.for('Logger'),
  MetricsCollector: Symbol.for('MetricsCollector'),
  SecurityAuditor: Symbol.for('SecurityAuditor'),

  // Configuration
  AppConfig: Symbol.for('AppConfig'),
  OAuthConfig: Symbol.for('OAuthConfig'),
  EnvironmentConfig: Symbol.for('EnvironmentConfig'),

  // Services
  AuthService: Symbol.for('AuthService'),
  CompanyService: Symbol.for('CompanyService'),
  DealService: Symbol.for('DealService'),
  PartnerService: Symbol.for('PartnerService'),
  AccountItemService: Symbol.for('AccountItemService'),
  TrialBalanceService: Symbol.for('TrialBalanceService'),
  HealthService: Symbol.for('HealthService'),
  CacheService: Symbol.for('CacheService'),

  // Handlers
  ResourceHandler: Symbol.for('ResourceHandler'),
  ToolHandler: Symbol.for('ToolHandler'),
  PromptHandler: Symbol.for('PromptHandler'),
  
  // Specific Tool Handlers
  AuthToolHandler: Symbol.for('AuthToolHandler'),
  DealToolHandler: Symbol.for('DealToolHandler'),
  CompanyToolHandler: Symbol.for('CompanyToolHandler'),
  SystemToolHandler: Symbol.for('SystemToolHandler'),
  
  // Specific Resource Handlers
  CompaniesResourceHandler: Symbol.for('CompaniesResourceHandler'),
  DealsResourceHandler: Symbol.for('DealsResourceHandler'),
  
  // Registries
  ToolRegistry: Symbol.for('ToolRegistry'),
  ResourceRegistry: Symbol.for('ResourceRegistry'),

  // Utilities
  ResponseBuilder: Symbol.for('ResponseBuilder'),
  ErrorHandler: Symbol.for('ErrorHandler'),
  Validator: Symbol.for('Validator'),
  DateUtils: Symbol.for('DateUtils'),

  // Infrastructure
  FreeeApiClient: Symbol.for('FreeeApiClient'),
  ApiResponseMapper: Symbol.for('ApiResponseMapper'),
  DebugInterceptor: Symbol.for('DebugInterceptor'),
  LoggerSetup: Symbol.for('LoggerSetup'),

  // MCP Server
  MCPServer: Symbol.for('MCPServer'),
  ServerTransport: Symbol.for('ServerTransport'),
} as const;

export type ServiceType = typeof TYPES[keyof typeof TYPES];
