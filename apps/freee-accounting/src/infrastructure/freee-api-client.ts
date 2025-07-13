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
  private authPromise: Promise<void> | null = null;
  private lastTokenSet: string | null = null;

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
   * OAuth認証が必要な場合、トークンを自動で注入（重複実行防止）
   */
  private async ensureAuthenticated(): Promise<void> {
    if (this.envConfig.useOAuth && this.envConfig.oauthClient) {
      // 既に認証処理が進行中の場合は待機
      if (this.authPromise) {
        await this.authPromise;
        return;
      }

      try {
        // 認証処理を開始
        this.authPromise = this.performAuthentication();
        await this.authPromise;
      } finally {
        // 認証処理完了後にPromiseをクリア
        this.authPromise = null;
      }
    }
  }

  /**
   * 実際の認証処理を実行
   */
  private async performAuthentication(): Promise<void> {
    try {
      const authStartTime = Date.now();
      
      // デバッグログ: 認証処理開始時の情報
      if (process.env.DEBUG === 'true') {
        this.logger.debug('🔐 Starting authentication process', {
          authStartTime,
          lastTokenSet: this.lastTokenSet ? `${this.lastTokenSet.substring(0, 20)  }...${  this.lastTokenSet.substring(-10)}` : null,
          oauthClientAvailable: !!this.envConfig.oauthClient
        });
      }
      
      const token = await this.envConfig.oauthClient!.getValidAccessToken();
      
      // デバッグログ: 取得したトークンの詳細情報
      if (process.env.DEBUG === 'true') {
        this.logger.debug('🔑 Token retrieved from OAuth client', {
          tokenLength: token.length,
          tokenPreview: `${token.substring(0, 20)  }...${  token.substring(-10)}`,
          isDuplicate: this.lastTokenSet === token,
          authDuration: Date.now() - authStartTime,
          isTokenValid: this.envConfig.oauthClient!.isTokenValid(),
          companyId: this.envConfig.oauthClient!.getCompanyId()
        });
      }
      
      // 同じトークンが既に設定されている場合はスキップ
      if (this.lastTokenSet === token) {
        this.logger.debug('Token already set, skipping duplicate set');
        return;
      }
      
      
      this.client.setAccessToken(token);
      this.lastTokenSet = token;
      
      // デバッグログ: 認証完了時の情報
      if (process.env.DEBUG === 'true') {
        this.logger.debug('✅ OAuth token set for API client', {
          totalAuthDuration: Date.now() - authStartTime,
          tokenSetSuccessfully: true
        });
      } else {
        this.logger.debug('OAuth token set for API client');
      }
    } catch (error) {
      this.logger.error('Failed to get valid access token', { error });
      throw this.errorHandler.authError('認証エラー: アクセストークンが無効です');
    }
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
      // OAuth認証が必要な場合、トークンを注入
      await this.ensureAuthenticated();
      
      // 最後のチェック: トークンが有効かどうかを確認
      if (this.envConfig.oauthClient && !this.envConfig.oauthClient.isTokenValid()) {
        this.logger.error('Token is invalid just before API call');
        throw new Error('Token is invalid - authentication may have failed');
      }

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

  /**
   * FreeeClient互換メソッド: 勘定科目一覧を取得
   */
  async getAccountItems(params: {
    company_id: number;
    base_date?: string;
  }): Promise<any> {
    this.logger.info('FreeeApiClient.getAccountItems called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.base_date) searchParams.append('base_date', params.base_date);

    const result = await this.get(`/api/1/account_items?${searchParams.toString()}`, undefined, {
      operation: 'get_account_items',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getAccountItems success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
      });
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getAccountItems failed', { error: result.error });
      throw new Error(`Failed to get account items: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 取引先一覧を取得
   */
  async getPartners(params: {
    company_id: number;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    this.logger.info('FreeeApiClient.getPartners called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/partners?${searchParams.toString()}`, undefined, {
      operation: 'get_partners',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getPartners success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
      });
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getPartners failed', { error: result.error });
      throw new Error(`Failed to get partners: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 部門一覧を取得
   */
  async getSections(params: {
    company_id: number;
  }): Promise<any> {
    this.logger.info('FreeeApiClient.getSections called', { params });

    const result = await this.get(`/api/1/sections?company_id=${params.company_id}`, undefined, {
      operation: 'get_sections',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getSections success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
      });
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getSections failed', { error: result.error });
      throw new Error(`Failed to get sections: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 品目一覧を取得
   */
  async getItems(params: {
    company_id: number;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    this.logger.info('FreeeApiClient.getItems called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/items?${searchParams.toString()}`, undefined, {
      operation: 'get_items',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getItems success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
      });
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getItems failed', { error: result.error });
      throw new Error(`Failed to get items: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: メモタグ一覧を取得
   */
  async getTags(params: {
    company_id: number;
  }): Promise<any> {
    this.logger.info('FreeeApiClient.getTags called', { params });

    const result = await this.get(`/api/1/tags?company_id=${params.company_id}`, undefined, {
      operation: 'get_tags',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getTags success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
      });
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getTags failed', { error: result.error });
      throw new Error(`Failed to get tags: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 請求書一覧を取得
   */
  async getInvoices(params: {
    company_id: number;
    partner_id?: number;
    partner_code?: string;
    start_issue_date?: string;
    end_issue_date?: string;
    start_due_date?: string;
    end_due_date?: string;
    invoice_number?: string;
    description?: string;
    invoice_status?: string;
    payment_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ invoices: any[]; meta: { total_count: number } }> {
    this.logger.info('FreeeApiClient.getInvoices called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.partner_id) searchParams.append('partner_id', params.partner_id.toString());
    if (params.partner_code) searchParams.append('partner_code', params.partner_code);
    if (params.start_issue_date) searchParams.append('start_issue_date', params.start_issue_date);
    if (params.end_issue_date) searchParams.append('end_issue_date', params.end_issue_date);
    if (params.start_due_date) searchParams.append('start_due_date', params.start_due_date);
    if (params.end_due_date) searchParams.append('end_due_date', params.end_due_date);
    if (params.invoice_number) searchParams.append('invoice_number', params.invoice_number);
    if (params.description) searchParams.append('description', params.description);
    if (params.invoice_status) searchParams.append('invoice_status', params.invoice_status);
    if (params.payment_status) searchParams.append('payment_status', params.payment_status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/invoices?${searchParams.toString()}`, undefined, {
      operation: 'get_invoices',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getInvoices success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
        data: result.value.data
      });

      if (result.value.data && typeof result.value.data === 'object' && 'invoices' in result.value.data) {
        return result.value.data;
      }

      this.logger.error('Unexpected response format for invoices', { data: result.value.data });
      throw new Error(`Unexpected response format: ${JSON.stringify(result.value.data)}`);
    } else {
      this.logger.error('FreeeApiClient.getInvoices failed', { error: result.error });
      throw new Error(`Failed to get invoices: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 請求書詳細を取得
   */
  async getInvoiceDetails(invoiceId: number, companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getInvoiceDetails called', { invoiceId, companyId });

    const result = await this.get(`/api/1/invoices/${invoiceId}?company_id=${companyId}`, undefined, {
      operation: 'get_invoice_details',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getInvoiceDetails failed', { error: result.error });
      throw new Error(`Failed to get invoice details: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 請求書を作成
   */
  async createInvoice(invoiceData: any): Promise<any> {
    this.logger.info('FreeeApiClient.createInvoice called', { invoiceData });

    const result = await this.post('/api/1/invoices', invoiceData, undefined, {
      operation: 'create_invoice',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.createInvoice failed', { error: result.error });
      throw new Error(`Failed to create invoice: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 請求書を更新
   */
  async updateInvoice(invoiceId: number, invoiceData: any): Promise<any> {
    this.logger.info('FreeeApiClient.updateInvoice called', { invoiceId, invoiceData });

    const result = await this.put(`/api/1/invoices/${invoiceId}`, invoiceData, undefined, {
      operation: 'update_invoice',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.updateInvoice failed', { error: result.error });
      throw new Error(`Failed to update invoice: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 請求書テンプレート一覧を取得
   */
  async getInvoiceTemplates(companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getInvoiceTemplates called', { companyId });

    const result = await this.get(`/api/1/invoices/templates?company_id=${companyId}`, undefined, {
      operation: 'get_invoice_templates',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getInvoiceTemplates failed', { error: result.error });
      throw new Error(`Failed to get invoice templates: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 見積書一覧を取得
   */
  async getQuotations(params: {
    company_id: number;
    partner_id?: number;
    partner_code?: string;
    start_issue_date?: string;
    end_issue_date?: string;
    quotation_number?: string;
    description?: string;
    quotation_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ quotations: any[]; meta: { total_count: number } }> {
    this.logger.info('FreeeApiClient.getQuotations called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.partner_id) searchParams.append('partner_id', params.partner_id.toString());
    if (params.partner_code) searchParams.append('partner_code', params.partner_code);
    if (params.start_issue_date) searchParams.append('start_issue_date', params.start_issue_date);
    if (params.end_issue_date) searchParams.append('end_issue_date', params.end_issue_date);
    if (params.quotation_number) searchParams.append('quotation_number', params.quotation_number);
    if (params.description) searchParams.append('description', params.description);
    if (params.quotation_status) searchParams.append('quotation_status', params.quotation_status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/quotations?${searchParams.toString()}`, undefined, {
      operation: 'get_quotations',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getQuotations success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
        data: result.value.data
      });

      if (result.value.data && typeof result.value.data === 'object' && 'quotations' in result.value.data) {
        return result.value.data;
      }

      this.logger.error('Unexpected response format for quotations', { data: result.value.data });
      throw new Error(`Unexpected response format: ${JSON.stringify(result.value.data)}`);
    } else {
      this.logger.error('FreeeApiClient.getQuotations failed', { error: result.error });
      throw new Error(`Failed to get quotations: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 見積書詳細を取得
   */
  async getQuotationDetails(quotationId: number, companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getQuotationDetails called', { quotationId, companyId });

    const result = await this.get(`/api/1/quotations/${quotationId}?company_id=${companyId}`, undefined, {
      operation: 'get_quotation_details',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getQuotationDetails failed', { error: result.error });
      throw new Error(`Failed to get quotation details: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 見積書を作成
   */
  async createQuotation(quotationData: any): Promise<any> {
    this.logger.info('FreeeApiClient.createQuotation called', { quotationData });

    const result = await this.post('/api/1/quotations', quotationData, undefined, {
      operation: 'create_quotation',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.createQuotation failed', { error: result.error });
      throw new Error(`Failed to create quotation: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 見積書を更新
   */
  async updateQuotation(quotationId: number, quotationData: any): Promise<any> {
    this.logger.info('FreeeApiClient.updateQuotation called', { quotationId, quotationData });

    const result = await this.put(`/api/1/quotations/${quotationId}`, quotationData, undefined, {
      operation: 'update_quotation',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.updateQuotation failed', { error: result.error });
      throw new Error(`Failed to update quotation: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 見積書テンプレート一覧を取得
   */
  async getQuotationTemplates(companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getQuotationTemplates called', { companyId });

    const result = await this.get(`/api/1/quotations/templates?company_id=${companyId}`, undefined, {
      operation: 'get_quotation_templates',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getQuotationTemplates failed', { error: result.error });
      throw new Error(`Failed to get quotation templates: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 納品書一覧を取得
   */
  async getDeliverySlips(params: {
    company_id: number;
    partner_id?: number;
    partner_code?: string;
    start_issue_date?: string;
    end_issue_date?: string;
    delivery_slip_number?: string;
    description?: string;
    delivery_slip_status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ delivery_slips: any[]; meta: { total_count: number } }> {
    this.logger.info('FreeeApiClient.getDeliverySlips called', { params });

    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.partner_id) searchParams.append('partner_id', params.partner_id.toString());
    if (params.partner_code) searchParams.append('partner_code', params.partner_code);
    if (params.start_issue_date) searchParams.append('start_issue_date', params.start_issue_date);
    if (params.end_issue_date) searchParams.append('end_issue_date', params.end_issue_date);
    if (params.delivery_slip_number) searchParams.append('delivery_slip_number', params.delivery_slip_number);
    if (params.description) searchParams.append('description', params.description);
    if (params.delivery_slip_status) searchParams.append('delivery_slip_status', params.delivery_slip_status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const result = await this.get(`/api/1/delivery_slips?${searchParams.toString()}`, undefined, {
      operation: 'get_delivery_slips',
    });

    if (result.isOk()) {
      this.logger.info('FreeeApiClient.getDeliverySlips success', {
        dataType: typeof result.value.data,
        dataKeys: result.value.data ? Object.keys(result.value.data) : 'null',
        data: result.value.data
      });

      if (result.value.data && typeof result.value.data === 'object' && 'delivery_slips' in result.value.data) {
        return result.value.data;
      }

      this.logger.error('Unexpected response format for delivery slips', { data: result.value.data });
      throw new Error(`Unexpected response format: ${JSON.stringify(result.value.data)}`);
    } else {
      this.logger.error('FreeeApiClient.getDeliverySlips failed', { error: result.error });
      throw new Error(`Failed to get delivery slips: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 納品書詳細を取得
   */
  async getDeliverySlipDetails(deliverySlipId: number, companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getDeliverySlipDetails called', { deliverySlipId, companyId });

    const result = await this.get(`/api/1/delivery_slips/${deliverySlipId}?company_id=${companyId}`, undefined, {
      operation: 'get_delivery_slip_details',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getDeliverySlipDetails failed', { error: result.error });
      throw new Error(`Failed to get delivery slip details: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 納品書を作成
   */
  async createDeliverySlip(deliverySlipData: any): Promise<any> {
    this.logger.info('FreeeApiClient.createDeliverySlip called', { deliverySlipData });

    const result = await this.post('/api/1/delivery_slips', deliverySlipData, undefined, {
      operation: 'create_delivery_slip',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.createDeliverySlip failed', { error: result.error });
      throw new Error(`Failed to create delivery slip: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 納品書を更新
   */
  async updateDeliverySlip(deliverySlipId: number, deliverySlipData: any): Promise<any> {
    this.logger.info('FreeeApiClient.updateDeliverySlip called', { deliverySlipId, deliverySlipData });

    const result = await this.put(`/api/1/delivery_slips/${deliverySlipId}`, deliverySlipData, undefined, {
      operation: 'update_delivery_slip',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.updateDeliverySlip failed', { error: result.error });
      throw new Error(`Failed to update delivery slip: ${result.error.message}`);
    }
  }

  /**
   * FreeeClient互換メソッド: 納品書テンプレート一覧を取得
   */
  async getDeliverySlipTemplates(companyId: number): Promise<any> {
    this.logger.info('FreeeApiClient.getDeliverySlipTemplates called', { companyId });

    const result = await this.get(`/api/1/delivery_slips/templates?company_id=${companyId}`, undefined, {
      operation: 'get_delivery_slip_templates',
    });

    if (result.isOk()) {
      return result.value.data;
    } else {
      this.logger.error('FreeeApiClient.getDeliverySlipTemplates failed', { error: result.error });
      throw new Error(`Failed to get delivery slip templates: ${result.error.message}`);
    }
  }
}
