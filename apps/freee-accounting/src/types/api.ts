/**
 * API関連の型定義
 *
 * freee API、MCP API、内部APIに関連する型定義を集約
 */

import { Company, Deal, AccountItem, Partner, Section, Item, Tag, TrialBalance } from './domain.js';

// 型レジストリ（実行時にアクセス可能）
export const API_TYPES = {
  FreeeApiResponse: 'FreeeApiResponse',
  FreeeApiError: 'FreeeApiError',
  FreeeApiErrorResponse: 'FreeeApiErrorResponse',
  HttpClientConfig: 'HttpClientConfig',
  HttpRequest: 'HttpRequest',
  HttpResponse: 'HttpResponse',
  HttpError: 'HttpError',
  OAuthTokenResponse: 'OAuthTokenResponse',
  AuthContext: 'AuthContext',
} as const;

// === freee API 基本型 ===

export interface FreeeApiResponse<T> {
  data?: T;
  meta?: {
    total_count?: number;
    limit?: number;
    offset?: number;
  };
}

export interface FreeeApiError {
  status_code: number;
  errors: Array<{
    type: string;
    resource_name: string;
    field: string;
    code: string;
    message: string;
  }>;
}

export interface FreeeApiErrorResponse {
  errors: FreeeApiError[];
  message?: string;
}

// === freee API レスポンス型 ===

export interface FreeeCompaniesResponse {
  companies: Company[];
}

export interface FreeeDealsResponse {
  deals: Deal[];
  meta: {
    total_count: number;
  };
}

export interface FreeeAccountItemsResponse {
  account_items: AccountItem[];
}

export interface FreeePartnersResponse {
  partners: Partner[];
}

export interface FreeeSectionsResponse {
  sections: Section[];
}

export interface FreeeItemsResponse {
  items: Item[];
}

export interface FreeeTagsResponse {
  tags: Tag[];
}

export interface FreeeTrialBalanceResponse {
  trial_bs: TrialBalance;
  trial_pl: TrialBalance;
}

export interface FreeeDealResponse {
  deal: Deal;
}

export interface FreeeCompanyResponse {
  company: Company;
}

// === freee API リクエスト型 ===

export interface FreeeDealsListParams {
  company_id: number;
  type?: 'income' | 'expense';
  partner_id?: number;
  account_item_id?: number;
  section_id?: number;
  start_issue_date?: string;
  end_issue_date?: string;
  start_due_date?: string;
  end_due_date?: string;
  start_amount?: number;
  end_amount?: number;
  offset?: number;
  limit?: number;
}

export interface FreeeAccountItemsListParams {
  company_id: number;
  base_date?: string;
}

export interface FreeePartnersListParams {
  company_id: number;
  offset?: number;
  limit?: number;
  keyword?: string;
}

export interface FreeeSectionsListParams {
  company_id: number;
}

export interface FreeeItemsListParams {
  company_id: number;
}

export interface FreeeTagsListParams {
  company_id: number;
}

export interface FreeeTrialBalanceParams {
  company_id: number;
  fiscal_year?: number;
  start_month?: number;
  end_month?: number;
  start_date?: string;
  end_date?: string;
  account_item_display_type?: 'account_item' | 'group';
  breakdown_display_type?: 'partner' | 'item' | 'section' | 'account_item';
  partner_id?: number;
  partner_code?: string;
  item_id?: number;
  section_id?: number;
  adjustment?: 'only' | 'without';
  cost_allocation?: 'only' | 'without';
  approved?: 'only' | 'without';
}

// === HTTP クライアント関連型 ===

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition?: (error: any) => boolean;
  };
}

export interface HttpRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: HttpRequest;
}

export interface HttpError {
  message: string;
  code?: string;
  status?: number;
  response?: HttpResponse;
  request?: HttpRequest;
  isAxiosError?: boolean;
  isNetworkError?: boolean;
  isTimeoutError?: boolean;
  isRetryableError?: boolean;
}

// === 認証関連型 ===

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  client_id: string;
  client_secret: string;
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
}

export interface OAuthAuthorizationUrlParams {
  client_id: string;
  redirect_uri: string;
  response_type: 'code';
  scope?: string;
  state?: string;
}

export interface AuthContext {
  isAuthenticated: boolean;
  authMode: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  companyId?: number;
  scope?: string[];
}

// === API クライアント関連型 ===

export interface ApiClientOptions {
  baseURL: string;
  timeout?: number;
  retryConfig?: {
    retries: number;
    retryDelay: number;
  };
  debugMode?: boolean;
  authContext?: AuthContext;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  skipAuth?: boolean;
  skipLogging?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  meta?: {
    requestId: string;
    timestamp: Date;
    duration: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
  headers: Record<string, string>;
  meta?: {
    requestId: string;
    timestamp: Date;
  };
}

// === レスポンスマッピング関連型 ===

export interface ResponseMapper<TInput, TOutput> {
  map(input: TInput): TOutput;
  mapArray(input: TInput[]): TOutput[];
}

export interface ResponseMappingConfig {
  includeMetadata: boolean;
  transformDates: boolean;
  transformNumbers: boolean;
  removeNullValues: boolean;
  camelCaseKeys: boolean;
}

export interface MappedResponse<T> {
  data: T;
  metadata?: {
    originalResponse: any;
    mappingConfig: ResponseMappingConfig;
    mappedAt: Date;
  };
}

// === キャッシュ関連型 ===

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'ttl';
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

// === レート制限関連型 ===

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// === デバッグ・監視関連型 ===

export interface RequestLog {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export interface ResponseLog {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  data?: any;
  duration: number;
  timestamp: Date;
  error?: any;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  lastRequestAt?: Date;
}

export interface PerformanceMetrics {
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errorRates: {
    total: number;
    byStatusCode: Record<number, number>;
    byErrorType: Record<string, number>;
  };
}

// === バッチ処理関連型 ===

export interface BatchRequest<T> {
  id: string;
  operation: string;
  data: T;
  priority?: number;
}

export interface BatchResponse<T> {
  id: string;
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
}

export interface BatchProcessingResult<T> {
  successful: BatchResponse<T>[];
  failed: BatchResponse<T>[];
  totalProcessed: number;
  processingTime: number;
}
