/**
 * freee API クライアントのインフラ層ラッパー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { FreeeClient, FreeeClientConfig } from '@mcp-server/shared';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { Logger } from './logger.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { DebugInterceptor } from './debug-interceptor.js';

/**
 * API呼び出しのコンテキスト情報
 */
export interface ApiCallContext {
  operation: string;
  method: string;
  url: string;
  params?: Record<string, any>;
  requestId?: string;
}

/**
 * API呼び出しの結果
 */
export interface ApiCallResult<T = any> {
  data: T;
  status: number;
  headers: Record<string, any>;
  duration: number;
  context: ApiCallContext;
}

/**
 * freee API クライアントのインフラ層実装
 */
@injectable()
export class FreeeApiClient {
  private client: FreeeClient;
  private debugInterceptor: DebugInterceptor;

  constructor(
    @inject(TYPES.EnvironmentConfig) private envConfig: EnvironmentConfig,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler,
    @inject(TYPES.DebugInterceptor) debugInterceptor: DebugInterceptor
  ) {
    this.debugInterceptor = debugInterceptor;
    this.client = this.createFreeeClient();
  }

  /**
   * FreeeClientインスタンスを作成
   */
  private createFreeeClient(): FreeeClient {
    const config: FreeeClientConfig = {
      baseURL: this.envConfig.baseUrl,
      oauthClient: this.envConfig.useOAuth ? this.envConfig.oauthClient : undefined,
      maxRetries: 3,
      retryDelay: 1000,
      enableCache: true,
      cacheTtl: 5 * 60 * 1000, // 5分
      timeout: 30000, // 30秒
    };

    const client = new FreeeClient(config);

    // デバッグインターセプターを設定
    this.debugInterceptor.setupInterceptors(client);

    this.logger.info('FreeeApiClient initialized', {
      baseURL: config.baseURL,
      useOAuth: this.envConfig.useOAuth,
      enableCache: config.enableCache,
      cacheTtl: config.cacheTtl,
    });

    return client;
  }

  /**
   * 汎用的なAPI呼び出し
   */
  async call<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    params?: Record<string, any>,
    data?: any,
    context?: Partial<ApiCallContext>
  ): Promise<Result<ApiCallResult<T>, AppError>> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    const callContext: ApiCallContext = {
      operation: context?.operation || 'api_call',
      method,
      url: endpoint,
      params,
      requestId,
      ...context,
    };

    this.logger.debug('API call started', {
      ...callContext,
      hasData: !!data,
    });

    try {
      let responseData;

      switch (method) {
        case 'GET':
          responseData = await this.client.get(endpoint, { params });
          break;
        case 'POST':
          responseData = await this.client.post(endpoint, data, { params });
          break;
        case 'PUT':
          responseData = await this.client.put(endpoint, data, { params });
          break;
        case 'DELETE':
          responseData = await this.client.delete(endpoint, { params });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const duration = Date.now() - startTime;
      const result: ApiCallResult<T> = {
        data: responseData as T,
        status: 200, // FreeeClientは成功時のみデータを返すため
        headers: {}, // FreeeClientはヘッダー情報を返さないため
        duration,
        context: callContext,
      };

      this.logger.apiRequest(method, endpoint, 200, duration, {
        operation: callContext.operation,
        requestId,
        dataSize: this.getDataSize(responseData),
      });

      return ok(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      const appError = this.errorHandler.fromException(error);

      this.logger.error('API call failed', {
        ...callContext,
        duration,
        error: appError,
      });

      return err(appError);
    }
  }

  /**
   * GET リクエスト
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    context?: Partial<ApiCallContext>
  ): Promise<Result<ApiCallResult<T>, AppError>> {
    return this.call<T>('GET', endpoint, params, undefined, context);
  }

  /**
   * POST リクエスト
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
    context?: Partial<ApiCallContext>
  ): Promise<Result<ApiCallResult<T>, AppError>> {
    return this.call<T>('POST', endpoint, params, data, context);
  }

  /**
   * PUT リクエスト
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
    context?: Partial<ApiCallContext>
  ): Promise<Result<ApiCallResult<T>, AppError>> {
    return this.call<T>('PUT', endpoint, params, data, context);
  }

  /**
   * DELETE リクエスト
   */
  async delete<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    context?: Partial<ApiCallContext>
  ): Promise<Result<ApiCallResult<T>, AppError>> {
    return this.call<T>('DELETE', endpoint, params, undefined, context);
  }

  /**
   * リクエストIDを生成
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * データサイズを取得（ログ用）
   */
  private getDataSize(data: any): number {
    if (!data) return 0;
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * 内部のFreeeClientインスタンスを取得（必要な場合のみ）
   */
  getInternalClient(): FreeeClient {
    return this.client;
  }

  /**
   * クライアント設定を更新
   */
  updateConfig(config: Partial<FreeeClientConfig>): void {
    if (config.oauthClient) {
      this.client.setOAuthClient(config.oauthClient);
    }

    this.logger.info('FreeeApiClient config updated', config);
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<Result<boolean, AppError>> {
    const result = await this.get('/api/1/companies', undefined, {
      operation: 'connection_test',
    });

    if (result.isOk()) {
      this.logger.info('Connection test successful', {
        status: result.value.status,
        duration: result.value.duration,
      });
      return ok(true);
    } else {
      this.logger.warn('Connection test failed', {
        error: result.error,
      });
      return err(result.error);
    }
  }

  /**
   * FreeeClient互換メソッド: 事業所一覧を取得
   */
  async getCompanies(): Promise<{ companies: any[] }> {
    this.logger.info('FreeeApiClient.getCompanies called');

    const result = await this.get('/api/1/companies', undefined, {
      operation: 'get_companies',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getCompanies success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
        data: result.value.data
      });

      // result.value.dataがfreee APIのレスポンス形式 { companies: [...] } の場合
      if (result.value.data && typeof result.value.data === 'object' && 'companies' in result.value.data) {
        return result.value.data;
      }

      // result.value.dataが配列の場合（予期しない形式）
      if (Array.isArray(result.value.data)) {
        return { companies: result.value.data };
      }

      // その他の場合はエラー
      this.logger.error('Unexpected response format', { data: result.value.data });
      throw new Error(`Unexpected response format: ${JSON.stringify(result.value.data)}`);
    } else {
      this.logger.error('FreeeApiClient.getCompanies failed', { error: result.error });
      throw new Error(`Failed to get companies: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 取引一覧を取得
   */
  async getDeals(params: {
    company_id: number;
    start_issue_date?: string;
    end_issue_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ deals: any[]; meta: { total_count: number } }> {
    this.logger.info('FreeeApiClient.getDeals called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.start_issue_date) searchParams.append('start_issue_date', params.start_issue_date);
    if (params.end_issue_date) searchParams.append('end_issue_date', params.end_issue_date);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/deals?${searchParams.toString()}`, undefined, {
      operation: 'get_deals',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getDeals success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
        data: result.value.data
      });

      // result.value.dataがfreee APIのレスポンス形式 { deals: [...], meta: {...} } の場合
      if (result.value.data && typeof result.value.data === 'object' && 'deals' in result.value.data) {
        return result.value.data;
      }

      // その他の場合はエラー
      this.logger.error('Unexpected response format for deals', { data: result.value.data });
      throw new Error(`Unexpected response format: ${JSON.stringify(result.value.data)}`);
    } else {
      this.logger.error('FreeeApiClient.getDeals failed', { error: result.error });
      throw new Error(`Failed to get deals: ${result.error.message}`);
    }
  }
}
