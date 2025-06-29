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
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler
  ) {
    this.debugInterceptor = new DebugInterceptor(this.logger);
    this.client = this.createFreeeClient();
  }

  /**
   * FreeeClientインスタンスを作成
   */
  private createFreeeClient(): FreeeClient {
    const config: FreeeClientConfig = {
      baseURL: this.envConfig.baseUrl,
      accessToken: this.envConfig.useDirectToken ? this.envConfig.accessToken : undefined,
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
      useDirectToken: this.envConfig.useDirectToken,
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
      let response;
      
      switch (method) {
        case 'GET':
          response = await this.client.get(endpoint, { params });
          break;
        case 'POST':
          response = await this.client.post(endpoint, data, { params });
          break;
        case 'PUT':
          response = await this.client.put(endpoint, data, { params });
          break;
        case 'DELETE':
          response = await this.client.delete(endpoint, { params });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const duration = Date.now() - startTime;
      const result: ApiCallResult<T> = {
        data: response.data,
        status: response.status,
        headers: response.headers,
        duration,
        context: callContext,
      };

      this.logger.apiRequest(method, endpoint, response.status, duration, {
        operation: callContext.operation,
        requestId,
        dataSize: this.getDataSize(response.data),
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
    if (config.accessToken) {
      this.client.setAccessToken(config.accessToken);
    }
    
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
}
