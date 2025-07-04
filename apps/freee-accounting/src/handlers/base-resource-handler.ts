/**
 * リソースハンドラーの基底クラス
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { AuthService } from '../services/auth-service.js';
import { ResponseBuilder, MCPResourceResponse } from '../utils/response-builder.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { Logger } from '../infrastructure/logger.js';
import { IResourceHandler } from '../interfaces/resource-handler.js';
import { MCPResourceInfo } from '../types/mcp.js';

/**
 * リソース情報の型定義
 */
export interface ResourceInfo {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * リソースハンドラーの基底クラス
 */
@injectable()
export abstract class BaseResourceHandler implements IResourceHandler {
  constructor(
    @inject(TYPES.AuthService) protected authService: AuthService,
    @inject(TYPES.ResponseBuilder) protected responseBuilder: ResponseBuilder,
    @inject(TYPES.ErrorHandler) protected errorHandler: ErrorHandler,
    @inject(TYPES.Logger) protected logger: Logger
  ) {}

  /**
   * ハンドラーの名前を取得（サブクラスで実装）
   */
  abstract getName(): string;

  /**
   * ハンドラーの説明を取得（サブクラスで実装）
   */
  abstract getDescription(): string;

  /**
   * リソース情報を取得（サブクラスで実装）
   */
  abstract getResourceInfo(): MCPResourceInfo[];

  /**
   * リソースを読み取り（サブクラスで実装）
   */
  abstract readResource(uri: string): Promise<Result<MCPResourceResponse, AppError>>;

  /**
   * 指定されたURIをサポートするかチェック（サブクラスで実装）
   */
  abstract supportsUri(uri: string): boolean;

  /**
   * 認証チェックを実行
   */
  protected checkAuthentication(): Result<boolean, AppError> {
    const authResult = this.authService.checkAuthenticationStatus();
    if (authResult.isErr()) {
      this.logger.warn('Resource access denied: authentication required', { 
        handler: this.constructor.name 
      });
      return authResult.map(() => false);
    }
    return authResult.map(() => true);
  }

  /**
   * 認証エラーレスポンスを生成
   */
  protected createAuthErrorResponse(uri: string): MCPResourceResponse {
    const authError = this.errorHandler.authError('認証が必要です');
    return this.responseBuilder.resourceError(uri, authError);
  }

  /**
   * 操作ログを記録
   */
  protected logOperation(operation: string, uri: string, duration: number, success: boolean): void {
    this.logger.operation(
      `Resource ${operation}`,
      duration,
      {
        handler: this.constructor.name,
        uri,
        success,
      }
    );
  }

  /**
   * リソース読み取りを実行（認証チェック付き）
   */
  async handleReadResource(uri: string): Promise<MCPResourceResponse> {
    const startTime = Date.now();
    
    try {
      // 認証チェック
      const authResult = this.checkAuthentication();
      if (authResult.isErr()) {
        const duration = Date.now() - startTime;
        this.logOperation('read', uri, duration, false);
        return this.createAuthErrorResponse(uri);
      }

      // リソース読み取り
      const result = await this.readResource(uri);
      const duration = Date.now() - startTime;

      if (result.isOk()) {
        this.logOperation('read', uri, duration, true);
        return result.value;
      } else {
        this.logOperation('read', uri, duration, false);
        return this.responseBuilder.resourceError(uri, result.error);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation('read', uri, duration, false);
      return this.responseBuilder.resourceErrorFromException(uri, error);
    }
  }

  /**
   * URIがこのハンドラーで処理可能かチェック
   */
  canHandle(uri: string): boolean {
    const resources = this.getResourceInfo();
    return resources.some(resource => resource.uri === uri);
  }

  /**
   * URIパターンマッチング（ワイルドカード対応）
   */
  protected matchUriPattern(uri: string, pattern: string): boolean {
    // 単純なワイルドカード対応（* を .* に変換）
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(uri);
  }

  /**
   * URIからパラメータを抽出
   */
  protected extractUriParams(uri: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // 簡単なパラメータ抽出（{param} 形式）
    const patternParts = pattern.split('/');
    const uriParts = uri.split('/');
    
    if (patternParts.length !== uriParts.length) {
      return params;
    }
    
    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const uriPart = uriParts[i];
      
      if (patternPart?.startsWith('{') && patternPart.endsWith('}')) {
        const paramName = patternPart.slice(1, -1);
        if (uriPart) {
          params[paramName] = uriPart;
        }
      }
    }
    
    return params;
  }

  /**
   * エラーハンドリング付きの非同期操作実行
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<Result<T, AppError>> {
    try {
      this.logger.debug(`Starting ${operationName}`, { handler: this.constructor.name });
      const result = await operation();
      this.logger.debug(`Completed ${operationName}`, { handler: this.constructor.name });
      return ok(result);
    } catch (error) {
      this.logger.error(`Failed ${operationName}`, {
        handler: this.constructor.name,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      // AppErrorの場合は直接返す
      if (this.isAppError(error)) {
        return err(error);
      }

      return err(this.errorHandler.fromException(error));
    }
  }

  /**
   * AppErrorかどうかを判定
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error && 'retryable' in error;
  }
}
