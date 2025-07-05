/**
 * MCPサーバーの共通ミドルウェア
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { ErrorHandler } from '../utils/error-handler.js';

/**
 * リクエスト情報の型定義
 */
export interface RequestInfo {
  method: string;
  params?: any;
  timestamp: Date;
  requestId: string;
}

/**
 * レスポンス情報の型定義
 */
export interface ResponseInfo {
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * ミドルウェア統合クラス
 */
@injectable()
export class Middleware {
  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig,
    @inject(TYPES.ErrorHandler) private readonly errorHandler: ErrorHandler
  ) {}

  /**
   * リクエストログミドルウェア
   */
  logRequest(requestInfo: RequestInfo): void {
    this.logger.info('MCP Request received', {
      method: requestInfo.method,
      requestId: requestInfo.requestId,
      timestamp: requestInfo.timestamp.toISOString(),
      hasParams: !!requestInfo.params,
    });

    // デバッグモードの場合、詳細なパラメータもログ出力
    if (this.envConfig.isDebugMode()) {
      this.logger.debug('Request parameters', {
        requestId: requestInfo.requestId,
        params: requestInfo.params,
      });
    }
  }

  /**
   * レスポンスログミドルウェア
   */
  logResponse(requestInfo: RequestInfo, responseInfo: ResponseInfo): void {
    const logLevel = responseInfo.success ? 'info' : 'error';
    
    this.logger.log(logLevel, 'MCP Request completed', {
      method: requestInfo.method,
      requestId: requestInfo.requestId,
      success: responseInfo.success,
      duration: responseInfo.duration,
      error: responseInfo.error?.message,
    });

    // パフォーマンス警告
    if (responseInfo.duration > 5000) {
      this.logger.warn('Slow request detected', {
        method: requestInfo.method,
        requestId: requestInfo.requestId,
        duration: responseInfo.duration,
      });
    }
  }

  /**
   * エラーハンドリングミドルウェア
   */
  handleError(error: Error, requestInfo: RequestInfo): any {
    this.logger.error('MCP Request error', {
      method: requestInfo.method,
      requestId: requestInfo.requestId,
      error: error.message,
      stack: error.stack,
    });

    // エラーハンドラーでMCP形式のレスポンスに変換
    return this.errorHandler.handleError(error);
  }

  /**
   * 認証チェックミドルウェア
   */
  checkAuthentication(requestInfo: RequestInfo): boolean {
    // 認証が不要なメソッド
    const publicMethods = [
      'list_resources',
      'list_tools',
      'list_prompts',
      'get_prompt',
      'get-auth-url',
      'get-health',
    ];

    if (publicMethods.includes(requestInfo.method)) {
      return true;
    }

    // 認証が必要なメソッドの場合、環境変数をチェック
    const envSummary = this.envConfig.getSummary();
    
    if (!envSummary.hasClientId) {
      this.logger.warn('Authentication required but not configured', {
        method: requestInfo.method,
        requestId: requestInfo.requestId,
      });
      return false;
    }

    return true;
  }

  /**
   * レート制限チェックミドルウェア
   */
  checkRateLimit(requestInfo: RequestInfo): boolean {
    // 簡単なレート制限実装（実際の実装では Redis などを使用）
    // ここでは基本的なチェックのみ
    
    this.logger.debug('Rate limit check', {
      method: requestInfo.method,
      requestId: requestInfo.requestId,
    });

    // 現在は常に許可（将来的に実装）
    return true;
  }

  /**
   * リクエスト前処理ミドルウェア
   */
  preprocessRequest(method: string, params?: any): RequestInfo {
    const requestInfo: RequestInfo = {
      method,
      params,
      timestamp: new Date(),
      requestId: this.generateRequestId(),
    };

    // リクエストログ
    this.logRequest(requestInfo);

    // 認証チェック
    if (!this.checkAuthentication(requestInfo)) {
      throw new Error('認証が必要です。環境変数を設定してください。');
    }

    // レート制限チェック
    if (!this.checkRateLimit(requestInfo)) {
      throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
    }

    return requestInfo;
  }

  /**
   * リクエスト後処理ミドルウェア
   */
  postprocessResponse(
    requestInfo: RequestInfo,
    startTime: number,
    result?: any,
    error?: Error
  ): any {
    const duration = Date.now() - startTime;
    const responseInfo: ResponseInfo = {
      success: !error,
      duration,
      error,
    };

    // レスポンスログ
    this.logResponse(requestInfo, responseInfo);

    // エラーがある場合はエラーハンドリング
    if (error) {
      return this.handleError(error, requestInfo);
    }

    return result;
  }

  /**
   * リクエストIDを生成
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ミドルウェアラッパー関数
   */
  wrap<T extends any[], R>(
    method: string,
    handler: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      let requestInfo: RequestInfo;
      
      try {
        // リクエスト前処理
        requestInfo = this.preprocessRequest(method, args[0]);
        
        // 実際のハンドラー実行
        const result = await handler(...args);
        
        // リクエスト後処理
        return this.postprocessResponse(requestInfo, startTime, result);
      } catch (error) {
        // エラー処理
        requestInfo = requestInfo! || {
          method,
          params: args[0],
          timestamp: new Date(),
          requestId: this.generateRequestId(),
        };
        
        return this.postprocessResponse(
          requestInfo,
          startTime,
          undefined,
          error as Error
        );
      }
    };
  }
}
