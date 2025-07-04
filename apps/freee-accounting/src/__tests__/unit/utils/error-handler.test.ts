/**
 * ErrorHandler ユニットテスト
 */

import 'reflect-metadata';
import { ErrorHandler, AppError } from '../../../utils/error-handler.js';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('fromException', () => {
    it('axios 401エラーを正しく変換する', () => {
      // Arrange
      const axiosError = new Error('Request failed with status code 401');
      (axiosError as any).response = {
        status: 401,
        data: { message: 'Unauthorized' }
      };

      // Act
      const result = errorHandler.fromException(axiosError);

      // Assert
      expect(result.type).toBe('AUTH_ERROR');
      expect(result.message).toBe('認証エラー: アクセストークンが無効です');
      expect(result.retryable).toBe(false);
    });

    it('axios 403エラーを正しく変換する', () => {
      // Arrange
      const axiosError = new Error('Request failed with status code 403');
      (axiosError as any).response = {
        status: 403,
        data: { message: 'Forbidden' }
      };

      // Act
      const result = errorHandler.fromException(axiosError);

      // Assert
      expect(result.type).toBe('AUTH_ERROR');
      expect(result.message).toBe('認証エラー: アクセス権限がありません');
      expect(result.retryable).toBe(false);
    });

    it('axios 404エラーを正しく変換する', () => {
      // Arrange
      const axiosError = new Error('Request failed with status code 404');
      (axiosError as any).response = {
        status: 404,
        data: { message: 'Not Found' }
      };

      // Act
      const result = errorHandler.fromException(axiosError);

      // Assert
      expect(result.type).toBe('NOT_FOUND_ERROR');
      expect(result.message).toBe('リソースが見つかりません');
      expect(result.retryable).toBe(false);
    });

    it('axios 429エラーを正しく変換する', () => {
      // Arrange
      const axiosError = new Error('Request failed with status code 429');
      (axiosError as any).response = {
        status: 429,
        headers: { 'retry-after': '60' },
        data: { message: 'Too Many Requests' }
      };

      // Act
      const result = errorHandler.fromException(axiosError);

      // Assert
      expect(result.type).toBe('RATE_LIMIT_ERROR');
      expect(result.message).toBe('レート制限に達しました');
      expect(result.retryable).toBe(true);
      expect((result as any).retryAfter).toBe(60);
    });

    it('axios 500エラーを正しく変換する', () => {
      // Arrange
      const axiosError = new Error('Request failed with status code 500');
      (axiosError as any).response = {
        status: 500,
        data: { message: 'Internal Server Error' }
      };

      // Act
      const result = errorHandler.fromException(axiosError);

      // Assert
      expect(result.type).toBe('API_ERROR');
      expect(result.message).toContain('サーバーエラー:');
      expect(result.retryable).toBe(true);
      expect((result as any).status).toBe(500);
    });

    it('ネットワークエラーを正しく変換する', () => {
      // Arrange
      const networkError = new Error('connect ECONNREFUSED 127.0.0.1:80');
      (networkError as any).code = 'ECONNREFUSED';

      // Act
      const result = errorHandler.fromException(networkError);

      // Assert
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toBe('ネットワークエラー: APIサーバーに接続できません');
      expect(result.retryable).toBe(true);
    });

    it('一般的なErrorを正しく変換する', () => {
      // Arrange
      const genericError = new Error('Something went wrong');

      // Act
      const result = errorHandler.fromException(genericError);

      // Assert
      expect(result.type).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('Something went wrong');
      expect(result.retryable).toBe(false);
    });

    it('非Errorオブジェクトを正しく変換する', () => {
      // Arrange
      const unknownError = 'string error';

      // Act
      const result = errorHandler.fromException(unknownError);

      // Assert
      expect(result.type).toBe('INTERNAL_ERROR');
      expect(result.message).toBe('不明なエラーが発生しました');
      expect(result.retryable).toBe(false);
    });
  });

  describe('authError', () => {
    it('認証エラーを正しく生成する', () => {
      // Act
      const result = errorHandler.authError('Custom auth error');

      // Assert
      expect(result.type).toBe('AUTH_ERROR');
      expect(result.message).toBe('Custom auth error');
      expect(result.retryable).toBe(false);
    });
  });

  describe('validationError', () => {
    it('バリデーションエラーを正しく生成する', () => {
      // Act
      const result = errorHandler.validationError('Invalid input', 'email');

      // Assert
      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid input');
      expect((result as any).field).toBe('email');
      expect(result.retryable).toBe(false);
    });

    it('フィールド指定なしのバリデーションエラーを正しく生成する', () => {
      // Act
      const result = errorHandler.validationError('Invalid input');

      // Assert
      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Invalid input');
      expect((result as any).field).toBeUndefined();
      expect(result.retryable).toBe(false);
    });
  });

  describe('apiError', () => {
    it('APIエラーを正しく生成する', () => {
      // Act
      const result = errorHandler.apiError('API call failed', 400);

      // Assert
      expect(result.type).toBe('API_ERROR');
      expect(result.message).toBe('API call failed');
      expect((result as any).status).toBe(400);
      expect(result.retryable).toBe(false);
    });
  });

  describe('toMCPError', () => {
    it('AppErrorをMCPエラーに変換する', () => {
      // Arrange
      const appError: AppError = {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        field: 'email',
        retryable: false
      };

      // Act
      const result = errorHandler.toMCPError(appError);

      // Assert
      expect(result.error).toBe('バリデーションエラー');
      expect(result.message).toBe('Invalid input');
      expect(result.retryable).toBe(false);
      expect(result.field).toBe('email');
      expect(result.timestamp).toBeDefined();
    });
  });
});
