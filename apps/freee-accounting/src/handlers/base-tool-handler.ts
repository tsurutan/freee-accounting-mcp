/**
 * ツールハンドラーの基底クラス
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { AuthService } from '../services/auth-service.js';
import { ResponseBuilder, MCPToolResponse } from '../utils/response-builder.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { Logger } from '../infrastructure/logger.js';
import { Validator } from '../utils/validator.js';
import { IToolHandler } from '../interfaces/tool-handler.js';
import { MCPToolInfo } from '../types/mcp.js';

/**
 * ツール情報の型定義
 */
export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

/**
 * ツールハンドラーの基底クラス
 */
@injectable()
export abstract class BaseToolHandler implements IToolHandler {
  constructor(
    @inject(TYPES.AuthService) protected authService: AuthService,
    @inject(TYPES.ResponseBuilder) protected responseBuilder: ResponseBuilder,
    @inject(TYPES.ErrorHandler) protected errorHandler: ErrorHandler,
    @inject(TYPES.Logger) protected logger: Logger,
    @inject(TYPES.Validator) protected validator: Validator
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
   * ツール情報を取得（サブクラスで実装）
   */
  abstract getToolInfo(): MCPToolInfo[];

  /**
   * ツールを実行（サブクラスで実装）
   */
  abstract executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>>;

  /**
   * 指定されたツールをサポートするかチェック（サブクラスで実装）
   */
  abstract supportsTool(name: string): boolean;

  /**
   * 認証チェックを実行
   */
  protected checkAuthentication(): Result<boolean, AppError> {
    const authResult = this.authService.checkAuthenticationStatus();
    if (authResult.isErr()) {
      this.logger.warn('Tool execution denied: authentication required', {
        handler: this.constructor.name
      });
      return authResult.map(() => false);
    }
    return authResult.map(() => true);
  }

  /**
   * 認証が必要なツールかどうかを判定（サブクラスでオーバーライド可能）
   */
  protected requiresAuthentication(toolName: string): boolean {
    // デフォルトでは全てのツールで認証が必要
    return true;
  }

  /**
   * 操作ログを記録
   */
  protected logOperation(operation: string, toolName: string, duration: number, success: boolean, args?: any): void {
    this.logger.operation(
      `Tool ${operation}`,
      duration,
      {
        handler: this.constructor.name,
        toolName,
        success,
        argsProvided: !!args,
      }
    );
  }

  /**
   * ツール実行を処理（認証チェック付き）
   */
  async handleToolExecution(name: string, args: any): Promise<MCPToolResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Executing tool', {
        toolName: name,
        handler: this.constructor.name,
        argsProvided: !!args
      });

      // 認証チェック（必要な場合のみ）
      if (this.requiresAuthentication(name)) {
        const authResult = this.checkAuthentication();
        if (authResult.isErr()) {
          const duration = Date.now() - startTime;
          this.logOperation('execute', name, duration, false, args);
          return this.responseBuilder.authError();
        }
      }

      // ツール実行
      const result = await this.executeTool(name, args);
      const duration = Date.now() - startTime;

      if (result.isOk()) {
        this.logOperation('execute', name, duration, true, args);
        return result.value;
      } else {
        this.logOperation('execute', name, duration, false, args);
        return this.responseBuilder.toolError(result.error);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation('execute', name, duration, false, args);
      return this.responseBuilder.toolErrorFromException(error);
    }
  }

  /**
   * ツールが処理可能かチェック
   */
  canHandle(toolName: string): boolean {
    const tools = this.getToolInfo();
    return tools.some(tool => tool.name === toolName);
  }

  /**
   * 引数のバリデーション
   */
  protected async validateArgs<T>(args: any, validationFn: (args: any) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
    try {
      return await validationFn(args);
    } catch (error) {
      return this.errorHandler.wrapAsync(async () => {
        throw error;
      });
    }
  }

  /**
   * 必須フィールドの検証
   */
  protected validateRequiredFields(args: any, requiredFields: string[]): Result<boolean, AppError> {
    for (const field of requiredFields) {
      const result = this.validator.validateRequired(args[field], field);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(true);
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

  /**
   * 成功結果を作成
   */
  protected createSuccessResult(data?: any, message?: string): MCPToolResponse {
    if (data) {
      return this.responseBuilder.toolSuccessWithData(data, message);
    } else {
      return this.responseBuilder.toolSuccess(message || 'ツールが正常に実行されました');
    }
  }

  /**
   * エラー結果を作成
   */
  protected createErrorResult(error: AppError, message?: string): MCPToolResponse {
    return this.responseBuilder.toolError(error);
  }

  /**
   * バリデーションエラー結果を作成
   */
  protected createValidationErrorResult(message: string, field?: string): MCPToolResponse {
    return this.responseBuilder.toolError(
      this.errorHandler.validationError(message, field)
    );
  }

  /**
   * 認証エラー結果を作成
   */
  protected createAuthErrorResult(message?: string): MCPToolResponse {
    return this.responseBuilder.toolError(
      this.errorHandler.authError(message || '認証が必要です')
    );
  }
}
