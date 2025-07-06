/**
 * freee API クライアントのインフラ層ラッパー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { Logger } from './logger.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { DebugInterceptor } from './debug-interceptor.js';

/**
 * FreeeClient設定の型定義
 */
export interface FreeeClientConfig {
  accessToken?: string;
  baseURL?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  maxRetries?: number;
  oauthClient?: any;
  enableCache?: boolean;
  cacheTtl?: number;
}

/**
 * FreeeClientインターフェース
 */
export interface FreeeClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  setAccessToken(token: string): void;
  setOAuthClient?(client: any): void;
}

/**
 * FreeeClient実装クラス
 */
export class FreeeClientImpl implements FreeeClient {
  private axiosInstance: AxiosInstance;
  
  constructor(private config: FreeeClientConfig = {}) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL || 'https://api.freee.co.jp',
      timeout: config.timeout || 30000,
    });
  }
  
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(url, config);
  }
  
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }
  
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }
  
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }
  
  setAccessToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  setOAuthClient(client: any): void {
    // OAuth client setter implementation
  }
}

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
  private readonly client: FreeeClient;
  private readonly debugInterceptor: DebugInterceptor;

  constructor(
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.ErrorHandler) private readonly errorHandler: ErrorHandler,
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

    const client = new FreeeClientImpl(config);

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
        data: responseData.data as T,
        status: responseData.status || 200,
        headers: responseData.headers || {},
        duration,
        context: callContext,
      };

      this.logger.apiRequest(method, endpoint, result.status, duration, {
        operation: callContext.operation,
        requestId,
        dataSize: this.getDataSize(responseData.data),
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
    if (config.oauthClient && this.client.setOAuthClient) {
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

      // result.value.dataに'data'プロパティがある場合（二重ラップされた形式）
      if (result.value.data && typeof result.value.data === 'object' && 'data' in result.value.data) {
        const innerData = result.value.data.data;
        if (innerData && typeof innerData === 'object' && 'companies' in innerData) {
          return innerData;
        }
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

  /**
   * FreeeClient互換メソッド: 取引詳細を取得
   */
  async getDealDetails(dealId: number, companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getDealDetails called', { dealId, companyId });

    const result = await this.get(`/api/1/deals/${dealId}?company_id=${companyId}`, undefined, {
      operation: 'get_deal_details',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getDealDetails failed', { error: result.error });
      throw new Error(`Failed to get deal details: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 取引を作成
   */
  async createDeal(dealData: any): Promise<any> {
    this.logger.info('FreeeApiClient.createDeal called', { dealData });

    const result = await this.post('/api/1/deals', dealData, {
      operation: 'create_deal',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.createDeal failed', { error: result.error });
      throw new Error(`Failed to create deal: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 取引を更新
   */
  async updateDeal(dealId: number, dealData: any): Promise<any> {
    this.logger.info('FreeeApiClient.updateDeal called', { dealId, dealData });

    const result = await this.put(`/api/1/deals/${dealId}`, dealData, {
      operation: 'update_deal',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.updateDeal failed', { error: result.error });
      throw new Error(`Failed to update deal: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 取引を削除
   */
  async deleteDeal(dealId: number, companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.deleteDeal called', { dealId, companyId });

    const result = await this.delete(`/api/1/deals/${dealId}?company_id=${companyId}`, {
      operation: 'delete_deal',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.deleteDeal failed', { error: result.error });
      throw new Error(`Failed to delete deal: ${result.error.message}`);
    }
  }
}
