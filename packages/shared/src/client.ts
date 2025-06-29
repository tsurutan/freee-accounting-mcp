/**
 * freee API クライアント
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  FreeeApiResponse,
  FreeeError,
  FreeeCompaniesResponse,
  FreeeDealsResponse,
  FreeeAccountItemsResponse,
  FreeePartnersResponse,
  FreeeSectionsResponse,
  FreeeItemsResponse,
  FreeeTagsResponse,
  FreeeTrialBalanceResponse,
  Deal
} from '@mcp-server/types';
import { FreeeOAuthClient } from './auth';
import { logger } from './logger';
import { MemoryCache, CacheKeyGenerator } from './cache';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
}

class RateLimiter {
  private rateLimitInfo: RateLimitInfo | null = null;
  private requestQueue: Array<() => void> = [];
  private isProcessing = false;

  updateRateLimit(headers: any): void {
    const limit = parseInt(headers['x-ratelimit-limit'] || '0');
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const resetTime = parseInt(headers['x-ratelimit-reset'] || '0') * 1000;

    this.rateLimitInfo = { limit, remaining, resetTime };
  }

  async waitIfNeeded(): Promise<void> {
    if (!this.rateLimitInfo) return;

    const now = Date.now();
    const { remaining, resetTime } = this.rateLimitInfo;

    // レート制限に達している場合は待機
    if (remaining <= 1 && resetTime > now) {
      const waitTime = resetTime - now + 1000; // 1秒のバッファを追加
      console.warn(`Rate limit reached. Waiting ${waitTime}ms until reset.`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // 残りリクエスト数が少ない場合は少し待機
    if (remaining <= 10 && remaining > 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }
}

export interface FreeeClientConfig {
  baseURL?: string;
  accessToken?: string;
  timeout?: number;
  oauthClient?: FreeeOAuthClient;
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTtl?: number;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: any) => boolean;
}

export class FreeeClient {
  private client: AxiosInstance;
  private accessToken?: string;
  private oauthClient?: FreeeOAuthClient;
  private rateLimiter: RateLimiter;
  private retryConfig: RetryConfig;
  private cache?: MemoryCache<any>;
  private enableCache: boolean;
  private cacheTtl: number;

  constructor(config: FreeeClientConfig = {}) {
    this.accessToken = config.accessToken;
    this.oauthClient = config.oauthClient;
    this.rateLimiter = new RateLimiter();
    this.enableCache = config.enableCache !== false; // デフォルトで有効
    this.cacheTtl = config.cacheTtl || 5 * 60 * 1000; // 5分

    if (this.enableCache) {
      this.cache = new MemoryCache({
        ttl: this.cacheTtl,
        maxSize: 200,
        cleanupInterval: 2 * 60 * 1000,
      });
    }

    this.retryConfig = {
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      retryCondition: (error: any) => {
        const status = error.response?.status;
        return status === 429 || (status >= 500 && status <= 599);
      },
    };

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.freee.co.jp',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Version': '2020-06-15',
      },
    });

    // デバッグ用: axiosリクエスト/レスポンスのログ出力（freee API）
    // DEBUG_FREEE_API=true または DEBUG_AXIOS=true で有効化
    if (process.env.DEBUG_FREEE_API === 'true' || process.env.DEBUG_AXIOS === 'true') {
      // デバッグ用リクエストインターセプター
      this.client.interceptors.request.use(
        (config) => {
          console.error('\n📡 [FREEE API REQUEST]');
          console.error('URL:', config.url);
          console.error('Method:', config.method?.toUpperCase());

          // アクセストークンをマスクしてヘッダーを表示
          const maskedHeaders = { ...config.headers };
          if (maskedHeaders.Authorization && typeof maskedHeaders.Authorization === 'string') {
            maskedHeaders.Authorization = maskedHeaders.Authorization.replace(/Bearer .+/, 'Bearer ***');
          }
          console.error('Headers:', JSON.stringify(maskedHeaders, null, 2));

          if (config.params) {
            console.error('Params:', JSON.stringify(config.params, null, 2));
          }
          if (config.data) {
            console.error('Data:', typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2));
          }
          console.error('---');
          return config;
        },
        (error) => {
          console.error('❌ [FREEE API REQUEST ERROR]', error);
          return Promise.reject(error);
        }
      );

      // デバッグ用レスポンスインターセプター
      this.client.interceptors.response.use(
        (response) => {
          console.error('\n📡 [FREEE API RESPONSE]');
          console.error('Status:', response.status, response.statusText);
          console.error('URL:', response.config?.url);
          console.error('Headers:', JSON.stringify(response.headers, null, 2));

          // レスポンスデータが大きい場合は一部のみ表示
          let displayData = response.data;
          if (typeof displayData === 'object' && displayData !== null) {
            const dataStr = JSON.stringify(displayData);
            if (dataStr.length > 2000) {
              if (Array.isArray(displayData)) {
                displayData = displayData.slice(0, 3).concat([`...truncated (${displayData.length} total items)`]);
              } else {
                displayData = {
                  ...displayData,
                  _debug_info: `[Data truncated - ${dataStr.length} characters]`,
                };
              }
            }
          }
          console.error('Data:', JSON.stringify(displayData, null, 2));
          console.error('---\n');
          return response;
        },
        (error) => {
          console.error('\n❌ [FREEE API RESPONSE ERROR]');
          console.error('Status:', error.response?.status, error.response?.statusText);
          console.error('URL:', error.config?.url);
          if (error.response?.headers) {
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
          }
          if (error.response?.data) {
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
          }
          console.error('Message:', error.message);
          console.error('---\n');
          return Promise.reject(error);
        }
      );
    }

    // リクエストインターセプター（認証トークン設定）
    this.client.interceptors.request.use(async (config) => {
      let token = this.accessToken;

      // OAuthクライアントが設定されている場合は、有効なトークンを取得
      if (!token && this.oauthClient) {
        try {
          token = await this.oauthClient.getValidAccessToken();
        } catch (error) {
          // 認証エラーの場合はそのまま進める（後でエラーになる）
        }
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    // レスポンスインターセプター（レート制限とエラーハンドリング）
    this.client.interceptors.response.use(
      (response) => {
        // レート制限情報を更新
        this.rateLimiter.updateRateLimit(response.headers);
        return response;
      },
      (error) => {
        // レート制限情報を更新（エラーレスポンスからも）
        if (error.response?.headers) {
          this.rateLimiter.updateRateLimit(error.response.headers);
        }

        if (error.response?.data) {
          const requestId = error.response.headers['x-request-id'];
          throw FreeeError.fromAxiosError(error, requestId);
        }
        throw FreeeError.fromAxiosError(error);
      }
    );
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  setOAuthClient(oauthClient: FreeeOAuthClient): void {
    this.oauthClient = oauthClient;
  }

  getOAuthClient(): FreeeOAuthClient | undefined {
    return this.oauthClient;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    // キャッシュチェック（GETリクエストのみ）
    if (this.enableCache && this.cache) {
      const cacheKey = CacheKeyGenerator.forApiRequest('GET', url, config?.params);
      const cachedData = this.cache.get(cacheKey);

      if (cachedData) {
        logger.debug('Cache hit', { url, cacheKey });
        return cachedData;
      }
    }

    return this.executeWithRetry(async () => {
      await this.rateLimiter.waitIfNeeded();
      const response = await this.client.get(url, config);

      // レスポンスをキャッシュ
      if (this.enableCache && this.cache) {
        const cacheKey = CacheKeyGenerator.forApiRequest('GET', url, config?.params);
        this.cache.set(cacheKey, response.data);
        logger.debug('Data cached', { url, cacheKey });
      }

      return response.data;
    }, `GET ${url}`);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.waitIfNeeded();
      const response = await this.client.post(url, data, config);
      return response.data;
    }, `POST ${url}`);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.waitIfNeeded();
      const response = await this.client.put(url, data, config);
      return response.data;
    }, `PUT ${url}`);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<FreeeApiResponse<T>> {
    return this.executeWithRetry(async () => {
      await this.rateLimiter.waitIfNeeded();
      const response = await this.client.delete(url, config);
      return response.data;
    }, `DELETE ${url}`);
  }

  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimiter.getRateLimitInfo();
  }

  getCacheStats() {
    return this.cache?.getStats() || null;
  }

  clearCache(): void {
    this.cache?.clear();
    logger.info('Cache cleared');
  }

  invalidateCache(pattern?: string): void {
    if (!this.cache) return;

    if (!pattern) {
      this.clearCache();
      return;
    }

    // パターンマッチングによるキャッシュ無効化は簡易実装
    // 実際の実装では正規表現などを使用
    logger.info('Cache invalidation requested', { pattern });
    this.clearCache(); // 簡易実装として全削除
  }

  // 型安全なAPIメソッド
  async getCompanies(): Promise<FreeeCompaniesResponse> {
    return this.get<FreeeCompaniesResponse>('/api/1/companies');
  }

  async getDeals(params: {
    company_id: number;
    start_issue_date?: string;
    end_issue_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<FreeeDealsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.start_issue_date) searchParams.append('start_issue_date', params.start_issue_date);
    if (params.end_issue_date) searchParams.append('end_issue_date', params.end_issue_date);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    return this.get<FreeeDealsResponse>(`/api/1/deals?${searchParams.toString()}`);
  }

  async getAccountItems(companyId: number): Promise<FreeeAccountItemsResponse> {
    return this.get<FreeeAccountItemsResponse>(`/api/1/account_items?company_id=${companyId}`);
  }

  async getPartners(companyId: number): Promise<FreeePartnersResponse> {
    return this.get<FreeePartnersResponse>(`/api/1/partners?company_id=${companyId}`);
  }

  async getSections(companyId: number): Promise<FreeeSectionsResponse> {
    return this.get<FreeeSectionsResponse>(`/api/1/sections?company_id=${companyId}`);
  }

  async getItems(companyId: number): Promise<FreeeItemsResponse> {
    return this.get<FreeeItemsResponse>(`/api/1/items?company_id=${companyId}`);
  }

  async getTags(companyId: number): Promise<FreeeTagsResponse> {
    return this.get<FreeeTagsResponse>(`/api/1/tags?company_id=${companyId}`);
  }

  async getTrialBalance(params: {
    company_id: number;
    fiscal_year?: number;
    start_month?: number;
    end_month?: number;
  }): Promise<FreeeTrialBalanceResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('company_id', params.company_id.toString());
    if (params.fiscal_year) searchParams.append('fiscal_year', params.fiscal_year.toString());
    if (params.start_month) searchParams.append('start_month', params.start_month.toString());
    if (params.end_month) searchParams.append('end_month', params.end_month.toString());

    return this.get<FreeeTrialBalanceResponse>(`/api/1/trial_balance?${searchParams.toString()}`);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        logger.debug(`Executing ${operationName}`, { attempt: attempt + 1 });
        return await operation();
      } catch (error) {
        lastError = error;

        logger.warn(`${operationName} failed`, {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });

        // 最後の試行の場合はリトライしない
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // リトライ条件をチェック
        if (!this.retryConfig.retryCondition(error)) {
          logger.debug(`${operationName} error is not retryable`, { error });
          break;
        }

        // 指数バックオフでリトライ間隔を計算
        const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);
        logger.info(`Retrying ${operationName} in ${delay}ms`, { attempt: attempt + 1 });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    logger.error(`${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`, {
      error: lastError,
    });
    throw lastError;
  }
}
