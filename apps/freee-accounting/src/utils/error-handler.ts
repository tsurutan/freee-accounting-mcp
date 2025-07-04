/**
 * エラーハンドリングユーティリティ
 */

import { injectable } from 'inversify';
import { Result, ok, err } from 'neverthrow';

/**
 * アプリケーションエラーの型定義
 */
export type AppError =
  | { type: 'AUTH_ERROR'; message: string; retryable: boolean; originalError?: any }
  | { type: 'API_ERROR'; message: string; status?: number; retryable: boolean; originalError?: any }
  | { type: 'VALIDATION_ERROR'; message: string; field?: string; retryable: false; originalError?: any }
  | { type: 'NETWORK_ERROR'; message: string; retryable: boolean; originalError?: any }
  | { type: 'INTERNAL_ERROR'; message: string; retryable: false; originalError?: any }
  | { type: 'NOT_FOUND_ERROR'; message: string; retryable: false; originalError?: any }
  | { type: 'RATE_LIMIT_ERROR'; message: string; retryAfter?: number; retryable: true; originalError?: any };

/**
 * MCPレスポンス用のエラー情報
 */
export interface MCPErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  retryable: boolean;
  status?: number;
  field?: string;
  retryAfter?: number;
}

/**
 * エラーハンドリングクラス
 */
@injectable()
export class ErrorHandler {
  /**
   * 例外をAppErrorに変換
   */
  fromException(error: unknown): AppError {
    if (error instanceof Error) {
      // axios エラーの処理
      if ('response' in error && error.response) {
        const response = error.response as any;
        const status = response.status;

        if (status === 401) {
          return {
            type: 'AUTH_ERROR',
            message: '認証エラー: アクセストークンが無効です',
            retryable: false,
          };
        }

        if (status === 403) {
          return {
            type: 'AUTH_ERROR',
            message: '認証エラー: アクセス権限がありません',
            retryable: false,
          };
        }

        if (status === 404) {
          return {
            type: 'NOT_FOUND_ERROR',
            message: 'リソースが見つかりません',
            retryable: false,
          };
        }

        if (status === 429) {
          const retryAfter = response.headers?.['retry-after'];
          return {
            type: 'RATE_LIMIT_ERROR',
            message: 'レート制限に達しました',
            retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
            retryable: true,
          };
        }

        if (status >= 500) {
          return {
            type: 'API_ERROR',
            message: `サーバーエラー: ${error.message}`,
            status,
            retryable: true,
          };
        }

        return {
          type: 'API_ERROR',
          message: `APIエラー: ${error.message}`,
          status,
          retryable: false,
        };
      }

      // ネットワークエラーの処理
      if ('code' in error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return {
          type: 'NETWORK_ERROR',
          message: 'ネットワークエラー: APIサーバーに接続できません',
          retryable: true,
        };
      }

      // その他のエラー
      return {
        type: 'INTERNAL_ERROR',
        message: error.message || '内部エラーが発生しました',
        retryable: false,
      };
    }

    // 不明なエラー
    return {
      type: 'INTERNAL_ERROR',
      message: '不明なエラーが発生しました',
      retryable: false,
    };
  }

  /**
   * AppErrorをMCPレスポンス用のエラー情報に変換
   */
  toMCPError(error: AppError): MCPErrorResponse {
    const baseError = {
      timestamp: new Date().toISOString(),
      retryable: error.retryable,
    };

    switch (error.type) {
      case 'AUTH_ERROR':
        return {
          ...baseError,
          error: '認証エラー',
          message: error.message,
        };

      case 'API_ERROR':
        return {
          ...baseError,
          error: 'APIエラー',
          message: error.message,
          status: error.status,
        };

      case 'VALIDATION_ERROR':
        return {
          ...baseError,
          error: 'バリデーションエラー',
          message: error.message,
          field: error.field,
        };

      case 'NETWORK_ERROR':
        return {
          ...baseError,
          error: 'ネットワークエラー',
          message: error.message,
        };

      case 'NOT_FOUND_ERROR':
        return {
          ...baseError,
          error: 'リソースが見つかりません',
          message: error.message,
        };

      case 'RATE_LIMIT_ERROR':
        return {
          ...baseError,
          error: 'レート制限エラー',
          message: error.message,
          retryAfter: error.retryAfter,
        };

      case 'INTERNAL_ERROR':
      default:
        return {
          ...baseError,
          error: '内部エラー',
          message: error.message,
        };
    }
  }

  /**
   * 非同期処理をResult型でラップ
   */
  async wrapAsync<T>(
    operation: () => Promise<T>
  ): Promise<Result<T, AppError>> {
    try {
      const result = await operation();
      return ok(result);
    } catch (error) {
      return err(this.fromException(error));
    }
  }

  /**
   * 同期処理をResult型でラップ
   */
  wrapSync<T>(
    operation: () => T
  ): Result<T, AppError> {
    try {
      const result = operation();
      return ok(result);
    } catch (error) {
      return err(this.fromException(error));
    }
  }

  /**
   * バリデーションエラーを作成
   */
  validationError(message: string, field?: string): AppError {
    return {
      type: 'VALIDATION_ERROR',
      message,
      field,
      retryable: false,
    };
  }

  /**
   * 認証エラーを作成
   */
  authError(message: string, retryable: boolean = false): AppError {
    return {
      type: 'AUTH_ERROR',
      message,
      retryable,
    };
  }

  /**
   * APIエラーを作成
   */
  apiError(message: string, status?: number, retryable: boolean = false): AppError {
    return {
      type: 'API_ERROR',
      message,
      status,
      retryable,
    };
  }

  /**
   * システムエラーを作成
   */
  systemError(message: string, error?: any): AppError {
    return {
      type: 'INTERNAL_ERROR',
      message,
      retryable: false,
      originalError: error,
    };
  }

  /**
   * エラーを処理してAppErrorに変換
   */
  handleError(error: any): AppError {
    return this.fromException(error);
  }
}
