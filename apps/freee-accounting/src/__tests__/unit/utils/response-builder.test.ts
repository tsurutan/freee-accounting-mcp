/**
 * ResponseBuilder ユニットテスト
 */

import 'reflect-metadata';
import { ResponseBuilder } from '../../../utils/response-builder.js';
import { ErrorHandler, AppError } from '../../../utils/error-handler.js';

describe('ResponseBuilder', () => {
  let responseBuilder: ResponseBuilder;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    mockErrorHandler = {
      toMCPError: jest.fn(),
      authError: jest.fn(),
      validationError: jest.fn(),
      fromException: jest.fn(),
    } as any;

    responseBuilder = new ResponseBuilder(mockErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('toolSuccess', () => {
    it('成功レスポンスを正しく生成する', () => {
      // Arrange
      const data = { id: 1, name: 'test' };
      const message = 'Success message';

      // Act
      const result = responseBuilder.toolSuccess(message);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: message,
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('データなしの成功レスポンスを正しく生成する', () => {
      // Arrange
      const message = 'Success message';

      // Act
      const result = responseBuilder.toolSuccess(message);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: message,
        },
      ]);
      expect(result.isError).toBe(false);
    });
  });

  describe('toolError', () => {
    it('エラーレスポンスを正しく生成する', () => {
      // Arrange
      const appError: AppError = {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        retryable: false,
      };
      const mcpError = {
        error: 'バリデーションエラー',
        message: 'Invalid input',
        timestamp: new Date().toISOString(),
        retryable: false,
      };
      mockErrorHandler.toMCPError.mockReturnValue(mcpError);

      // Act
      const result = responseBuilder.toolError(appError);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'エラー: Invalid input',
        },
      ]);
      expect(result.isError).toBe(true);
      expect(mockErrorHandler.toMCPError).toHaveBeenCalledWith(appError);
    });
  });

  describe('toolErrorFromException', () => {
    it('例外からエラーレスポンスを正しく生成する', () => {
      // Arrange
      const exception = new Error('Something went wrong');
      const appError: AppError = {
        type: 'INTERNAL_ERROR',
        message: 'Something went wrong',
        retryable: false,
      };
      const mcpError = {
        error: '内部エラー',
        message: 'Something went wrong',
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      mockErrorHandler.fromException.mockReturnValue(appError);
      mockErrorHandler.toMCPError.mockReturnValue(mcpError);

      // Act
      const result = responseBuilder.toolErrorFromException(exception);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'エラー: Something went wrong',
        },
      ]);
      expect(result.isError).toBe(true);
      expect(mockErrorHandler.fromException).toHaveBeenCalledWith(exception);
      expect(mockErrorHandler.toMCPError).toHaveBeenCalledWith(appError);
    });
  });

  describe('resourceSuccess', () => {
    it('リソース成功レスポンスを正しく生成する', () => {
      // Arrange
      const uri = 'freee://companies/123';
      const data = { id: 123, name: 'Test Company' };

      // Act
      const result = responseBuilder.resourceSuccess(uri, data);

      // Assert
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.uri).toBe(uri);
      expect(result.contents[0]?.mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0]?.text || '')).toEqual(data);
    });
  });

  describe('resourceError', () => {
    it('リソースエラーレスポンスを正しく生成する', () => {
      // Arrange
      const uri = 'freee://companies/123';
      const appError: AppError = {
        type: 'NOT_FOUND_ERROR',
        message: 'Company not found',
        retryable: false,
      };
      const mcpError = {
        error: 'リソースが見つかりません',
        message: 'Company not found',
        timestamp: new Date().toISOString(),
        retryable: false,
      };
      mockErrorHandler.toMCPError.mockReturnValue(mcpError);

      // Act
      const result = responseBuilder.resourceError(uri, appError);

      // Assert
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]?.uri).toBe(uri);
      expect(result.contents[0]?.mimeType).toBe('application/json');
      expect(JSON.parse(result.contents[0]?.text || '')).toEqual(mcpError);
      expect(mockErrorHandler.toMCPError).toHaveBeenCalledWith(appError);
    });
  });

  describe('authError', () => {
    it('認証エラーレスポンスを正しく生成する', () => {
      // Arrange
      const message = 'Authentication required';
      const appError: AppError = {
        type: 'AUTH_ERROR',
        message,
        retryable: false,
      };
      const mcpError = {
        error: '認証エラー',
        message,
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      mockErrorHandler.authError.mockReturnValue(appError);
      mockErrorHandler.toMCPError.mockReturnValue(mcpError);

      // Act
      const result = responseBuilder.authError(message);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: `エラー: ${message}`,
        },
      ]);
      expect(result.isError).toBe(true);
      expect(mockErrorHandler.authError).toHaveBeenCalledWith(message);
      expect(mockErrorHandler.toMCPError).toHaveBeenCalledWith(appError);
    });
  });

  describe('validationError', () => {
    it('バリデーションエラーレスポンスを正しく生成する', () => {
      // Arrange
      const message = 'Invalid email format';
      const field = 'email';
      const appError: AppError = {
        type: 'VALIDATION_ERROR',
        message,
        field,
        retryable: false,
      };
      const mcpError = {
        error: 'バリデーションエラー',
        message,
        timestamp: new Date().toISOString(),
        retryable: false,
        field,
      };

      mockErrorHandler.validationError.mockReturnValue(appError);
      mockErrorHandler.toMCPError.mockReturnValue(mcpError);

      // Act
      const result = responseBuilder.validationError(message, field);

      // Assert
      expect(result.content).toEqual([
        {
          type: 'text',
          text: `エラー: ${message}`,
        },
      ]);
      expect(result.isError).toBe(true);
      expect(mockErrorHandler.validationError).toHaveBeenCalledWith(message, field);
      expect(mockErrorHandler.toMCPError).toHaveBeenCalledWith(appError);
    });
  });

  describe('formatDealsResponse', () => {
    it('取引データを正しくフォーマットする', () => {
      // Arrange
      const deals = [
        { id: 1, issue_date: '2024-01-01', type: 'income', amount: 1000 },
        { id: 2, issue_date: '2024-01-02', type: 'expense', amount: 500 },
      ];
      const companyId = 123;
      const period = { startDate: '2024-01-01', endDate: '2024-01-31' };

      // Act
      const result = responseBuilder.formatDealsResponse(deals, companyId, period);

      // Assert
      expect(result).toContain('取引一覧を取得しました');
      expect(result).toContain('期間: 2024-01-01 ～ 2024-01-31');
      expect(result).toContain('事業所ID: 123');
      expect(result).toContain('取引件数: 2件');
    });

    it('取引データが空の場合を正しく処理する', () => {
      // Arrange
      const deals: any[] = [];
      const companyId = 123;
      const period = { startDate: '2024-01-01', endDate: '2024-01-31' };

      // Act
      const result = responseBuilder.formatDealsResponse(deals, companyId, period);

      // Assert
      expect(result).toContain('取引データがありません');
      expect(result).toContain('期間: 2024-01-01 ～ 2024-01-31');
      expect(result).toContain('事業所ID: 123');
    });
  });
});
