/**
 * freee API クライアント
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { FreeeApiResponse, FreeeError } from '@mcp-server/types';
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

    // リクエストインターセプター
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

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // デバッグ用ログ（一時的）
        console.error('FreeeClient Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data_type: typeof response.data,
          data_keys: response.data ? Object.keys(response.data) : null,
          data_sample: response.data
        });

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

      logger.info('response data=', response.data);
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
