/**
 * 型定義のインデックスファイル
 * 
 * 全ての型定義を一箇所からエクスポート
 */

// ドメイン型定義
export * from './domain.js';

// API関連型定義
export * from './api.js';

// MCP関連型定義
export * from './mcp.js';

// 型レジストリの再エクスポート
export { DOMAIN_TYPES } from './domain.js';
export { API_TYPES } from './api.js';
export { MCP_TYPES } from './mcp.js';

// 共通型定義
export interface Result<T, E> {
  isOk(): this is { value: T };
  isErr(): this is { error: E };
  value: T;
  error: E;
}

export interface Option<T> {
  isSome(): this is { value: T };
  isNone(): this is { value: null };
  value: T | null;
}

// ユーティリティ型
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };
export type Pick<T, K extends keyof T> = { [P in K]: T[P] };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// 関数型
export type AsyncFunction<T = void> = () => Promise<T>;
export type AsyncFunctionWithArgs<TArgs extends any[], TReturn = void> = (...args: TArgs) => Promise<TReturn>;
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// 設定型
export interface BaseConfig {
  name: string;
  description?: string;
  version?: string;
  enabled?: boolean;
}

export interface LoggingConfig extends BaseConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination: 'console' | 'file';
  file?: string;
  maxSize?: number;
  maxFiles?: number;
}

export interface SecurityConfig extends BaseConfig {
  authentication: {
    required: boolean;
    type: 'bearer' | 'basic' | 'oauth' | 'custom';
    options?: Record<string, any>;
  };
  authorization?: {
    enabled: boolean;
    rules?: AuthorizationRule[];
  };
  rateLimiting?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
}

export interface AuthorizationRule {
  resource: string;
  action: string;
  roles: string[];
  conditions?: Record<string, any>;
}

// エラー型
export interface BaseError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ValidationError extends BaseError {
  name: 'ValidationError';
  field: string;
  value?: any;
  constraint: string;
}

export interface AuthenticationError extends BaseError {
  name: 'AuthenticationError';
  reason: 'invalid_credentials' | 'token_expired' | 'token_invalid' | 'unauthorized';
}

export interface AuthorizationError extends BaseError {
  name: 'AuthorizationError';
  resource: string;
  action: string;
  requiredRoles: string[];
  userRoles: string[];
}

export interface NetworkError extends BaseError {
  name: 'NetworkError';
  statusCode?: number;
  url?: string;
  method?: string;
  isTimeout?: boolean;
  isRetryable?: boolean;
}

export interface BusinessLogicError extends BaseError {
  name: 'BusinessLogicError';
  businessRule: string;
  violatedConstraints: string[];
}

// イベント型
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  version: string;
  metadata?: Record<string, any>;
}

export interface DomainEvent extends BaseEvent {
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  data: any;
}

export interface SystemEvent extends BaseEvent {
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  data: any;
}

export interface UserEvent extends BaseEvent {
  userId: string;
  sessionId?: string;
  action: string;
  data: any;
}

// メトリクス型
export interface BaseMetrics {
  name: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface CounterMetrics extends BaseMetrics {
  type: 'counter';
  value: number;
}

export interface GaugeMetrics extends BaseMetrics {
  type: 'gauge';
  value: number;
}

export interface HistogramMetrics extends BaseMetrics {
  type: 'histogram';
  values: number[];
  buckets?: number[];
}

export interface TimerMetrics extends BaseMetrics {
  type: 'timer';
  duration: number;
  unit: 'ms' | 's' | 'ns';
}

// ページネーション型
export interface PaginationParams {
  offset?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    nextCursor?: string;
    previousCursor?: string;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ソート型
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface MultiSortParams {
  sorts: SortParams[];
}

// フィルター型
export interface FilterParams {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'regex';
  value: any;
}

export interface MultiFilterParams {
  filters: FilterParams[];
  logic?: 'and' | 'or';
}

// 検索型
export interface SearchParams {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  maxScore?: number;
  aggregations?: Record<string, any>;
}

// キャッシュ型
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt: Date;
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: number;
  compress?: boolean;
}

// 監査型
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// 設定管理型
export interface ConfigurationEntry {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  defaultValue?: any;
  required?: boolean;
  sensitive?: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    allowedValues?: any[];
  };
}

export interface ConfigurationGroup {
  name: string;
  description?: string;
  entries: ConfigurationEntry[];
}

// 通知型
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  name: string;
  type: 'email' | 'sms' | 'push' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}
