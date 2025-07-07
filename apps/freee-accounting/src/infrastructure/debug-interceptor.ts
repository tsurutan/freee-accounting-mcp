/**
 * デバッグ用インターセプター
 */

import { injectable, inject } from 'inversify';
import { Logger } from './logger.js';
import { TYPES } from '../container/types.js';

// Forward declaration for FreeeClient
interface FreeeClient {
  [key: string]: any;
}

/**
 * デバッグ設定
 */
export interface DebugConfig {
  enableFreeeApi: boolean;
  enableAxios: boolean;
  enableMcpInspector: boolean;
  maxDataLength: number;
  maskSensitiveData: boolean;
}

/**
 * デバッグ用インターセプター
 */
@injectable()
export class DebugInterceptor {
  private config: DebugConfig;

  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {
    this.config = {
      enableFreeeApi: process.env.DEBUG_FREEE_API === 'true',
      enableAxios: process.env.DEBUG_AXIOS === 'true',
      enableMcpInspector: process.env.MCP_INSPECTOR === 'true',
      maxDataLength: parseInt(process.env.DEBUG_MAX_DATA_LENGTH || '2000'),
      maskSensitiveData: process.env.DEBUG_MASK_SENSITIVE !== 'false',
    };

    this.logger.debug('DebugInterceptor initialized', this.config);
  }

  /**
   * FreeeClientにインターセプターを設定
   */
  setupInterceptors(client: FreeeClient): void {
    if (!this.shouldEnableDebug()) {
      return;
    }

    const axiosInstance = (client as any).client;
    if (!axiosInstance) {
      this.logger.warn('Cannot access axios instance for debug interceptors');
      return;
    }

    // リクエストインターセプター
    axiosInstance.interceptors.request.use(
      (config: any) => {
        this.logRequest(config);
        return config;
      },
      (error: any) => {
        this.logRequestError(error);
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    axiosInstance.interceptors.response.use(
      (response: any) => {
        this.logResponse(response);
        return response;
      },
      (error: any) => {
        this.logResponseError(error);
        return Promise.reject(error);
      }
    );

    this.logger.info('Debug interceptors setup completed');
  }

  /**
   * デバッグを有効にするかどうか
   */
  private shouldEnableDebug(): boolean {
    return this.config.enableFreeeApi || this.config.enableAxios;
  }

  /**
   * リクエストをログ出力
   */
  private logRequest(config: any): void {
    if (this.config.enableMcpInspector) {
      // MCP Inspector使用時はconsole.logを使用しない
      this.logger.debug('API Request', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: this.maskHeaders(config.headers),
        params: config.params,
        data: this.truncateData(config.data),
      });
    } else {
      // MCP Framework logger使用
      const requestData = {
        url: config.url,
        method: config.method?.toUpperCase(),
        headers: this.maskHeaders(config.headers),
        params: config.params,
        data: config.data ? this.truncateData(config.data) : undefined
      };
      this.logger.debug(`📡 [FREEE API REQUEST] ${JSON.stringify(requestData)}`);
    }
  }

  /**
   * レスポンスをログ出力
   */
  private logResponse(response: any): void {
    if (this.config.enableMcpInspector) {
      // MCP Inspector使用時はconsole.logを使用しない
      this.logger.debug('API Response', {
        status: response.status,
        statusText: response.statusText,
        url: response.config?.url,
        headers: response.headers,
        data: this.truncateData(response.data),
      });
    } else {
      // MCP Framework logger使用
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        url: response.config?.url,
        headers: response.headers,
        data: this.truncateData(response.data)
      };
      this.logger.debug(`📡 [FREEE API RESPONSE] ${JSON.stringify(responseData)}`);
    }
  }

  /**
   * リクエストエラーをログ出力
   */
  private logRequestError(error: any): void {
    if (this.config.enableMcpInspector) {
      this.logger.error('API Request Error', {
        message: error.message,
        config: error.config ? {
          method: error.config.method,
          url: error.config.url,
        } : undefined,
      });
    } else {
      const errorData = {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method
      };
      this.logger.error(`❌ [FREEE API REQUEST ERROR] ${JSON.stringify(errorData)}`);
    }
  }

  /**
   * レスポンスエラーをログ出力
   */
  private logResponseError(error: any): void {
    if (this.config.enableMcpInspector) {
      this.logger.error('API Response Error', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data ? this.truncateData(error.response.data) : undefined,
      });
    } else {
      const errorData = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data ? this.truncateData(error.response.data) : undefined
      };
      this.logger.error(`❌ [FREEE API RESPONSE ERROR] ${JSON.stringify(errorData)}`);
    }
  }

  /**
   * ヘッダーの機密情報をマスク
   */
  private maskHeaders(headers: any): any {
    if (!this.config.maskSensitiveData || !headers) {
      return headers;
    }

    const masked = { ...headers };

    // Authorizationヘッダーをマスク
    if (masked.Authorization && typeof masked.Authorization === 'string') {
      masked.Authorization = masked.Authorization.replace(/Bearer .+/, 'Bearer ***');
    }

    // その他の機密情報をマスク (Authorization は上で処理済みなので除外)
    const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'Cookie', 'X-API-Key', 'X-Auth-Token'];
    for (const key of sensitiveKeys) {
      if (masked[key]) {
        masked[key] = '***';
      }
    }

    return masked;
  }

  /**
   * データを切り詰め
   */
  private truncateData(data: any): any {
    if (!data) return data;

    try {
      const dataStr = JSON.stringify(data);
      if (dataStr.length <= this.config.maxDataLength) {
        return data;
      }

      // 配列の場合は要素数を制限
      if (Array.isArray(data)) {
        const truncated = data.slice(0, 3);
        return [
          ...truncated,
          `...truncated (${data.length} total items, showing first 3)`
        ];
      }

      // オブジェクトの場合は切り詰め情報を追加
      if (typeof data === 'object') {
        return {
          ...data,
          _debug_info: `[Data truncated - ${dataStr.length} characters, max: ${this.config.maxDataLength}]`,
        };
      }

      // 文字列の場合は直接切り詰め
      if (typeof data === 'string') {
        return `${data.substring(0, this.config.maxDataLength)  }...`;
      }

      return data;
    } catch (error) {
      return '[Error serializing data for debug output]';
    }
  }

  /**
   * デバッグ設定を更新
   */
  updateConfig(config: Partial<DebugConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Debug config updated', this.config);
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * デバッグ統計を取得
   */
  getDebugStats(): Record<string, any> {
    return {
      config: this.config,
      isEnabled: this.shouldEnableDebug(),
      environment: {
        DEBUG_FREEE_API: process.env.DEBUG_FREEE_API,
        DEBUG_AXIOS: process.env.DEBUG_AXIOS,
        MCP_INSPECTOR: process.env.MCP_INSPECTOR,
        DEBUG_MAX_DATA_LENGTH: process.env.DEBUG_MAX_DATA_LENGTH,
        DEBUG_MASK_SENSITIVE: process.env.DEBUG_MASK_SENSITIVE,
      },
    };
  }
}
