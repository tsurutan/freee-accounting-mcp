/**
 * AuthToolHandler ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { AuthToolHandler } from '../../../handlers/auth-tool-handler.js';
import { AuthService } from '../../../services/auth-service.js';
import { ResponseBuilder } from '../../../utils/response-builder.js';
import { ErrorHandler } from '../../../utils/error-handler.js';
import { Logger } from '../../../infrastructure/logger.js';
import { Validator } from '../../../utils/validator.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

describe('AuthToolHandler', () => {
  let container: Container;
  let authToolHandler: AuthToolHandler;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockResponseBuilder: jest.Mocked<ResponseBuilder>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let mockLogger: jest.Mocked<Logger>;
  let mockValidator: jest.Mocked<Validator>;

  beforeEach(() => {
    container = new Container();

    // モックの作成
    mockAuthService = {
      checkAuthenticationStatus: jest.fn(),
      generateAuthUrl: jest.fn(),
      exchangeCodeForToken: jest.fn(),
    } as any;

    mockResponseBuilder = {
      toolSuccess: jest.fn(),
      toolError: jest.fn(),
      authError: jest.fn(),
    } as any;

    mockErrorHandler = {
      authError: jest.fn(),
      validationError: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockValidator = {
      validateRequired: jest.fn(),
    } as any;

    // DIコンテナにモックを登録
    container.bind(TYPES.AuthService).toConstantValue(mockAuthService);
    container.bind(TYPES.ResponseBuilder).toConstantValue(mockResponseBuilder);
    container.bind(TYPES.ErrorHandler).toConstantValue(mockErrorHandler);
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(TYPES.Validator).toConstantValue(mockValidator);
    container.bind(AuthToolHandler).toSelf();

    authToolHandler = container.get(AuthToolHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getToolInfo', () => {
    it('ツール情報を正しく返す', () => {
      // Act
      const result = authToolHandler.getToolInfo();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.name).toBe('generate-auth-url');
      expect(result[1]?.name).toBe('exchange-auth-code');
      expect(result[2]?.name).toBe('check-auth-status');
    });
  });

  describe('executeTool', () => {
    describe('generate-auth-url', () => {
      it('認証URL生成が成功する場合', async () => {
        // Arrange
        const args = { state: 'test-state', enable_company_selection: true };
        const authUrl = 'https://accounts.freee.co.jp/oauth/authorize?...';
        const successResponse = { content: [{ type: 'text' as const, text: 'Success' }], isError: false };

        mockAuthService.generateAuthUrl.mockReturnValue(ok(authUrl));
        mockResponseBuilder.toolSuccess.mockReturnValue(successResponse);

        // Act
        const result = await authToolHandler.executeTool('generate-auth-url', args);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockAuthService.generateAuthUrl).toHaveBeenCalledWith(
          'http://localhost:3000/callback',
          'test-state'
        );
        expect(mockResponseBuilder.toolSuccess).toHaveBeenCalledWith(
          { authUrl },
          expect.stringContaining('OAuth認証URLを生成しました')
        );
      });

      it('認証URL生成が失敗する場合', async () => {
        // Arrange
        const args = { state: 'test-state' };
        const error = { type: 'AUTH_ERROR', message: 'OAuth not configured', retryable: false };
        const errorResponse = { content: [{ type: 'text' as const, text: 'Error' }], isError: true };

        mockAuthService.generateAuthUrl.mockReturnValue(err(error as any));
        mockResponseBuilder.toolError.mockReturnValue(errorResponse);

        // Act
        const result = await authToolHandler.executeTool('generate-auth-url', args);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockResponseBuilder.toolError).toHaveBeenCalledWith(error);
      });
    });

    describe('exchange-auth-code', () => {
      it('認証コード交換が成功する場合', async () => {
        // Arrange
        const args = { code: 'auth-code-123' };
        const tokenResponse = {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'default',
          created_at: Math.floor(Date.now() / 1000),
        };
        const successResponse = { content: [{ type: 'text' as const, text: 'Success' }], isError: false };

        mockValidator.validateRequired.mockReturnValue(ok('auth-code-123'));
        mockAuthService.exchangeCodeForToken.mockResolvedValue(ok(tokenResponse));
        mockResponseBuilder.toolSuccess.mockReturnValue(successResponse);

        // Act
        const result = await authToolHandler.executeTool('exchange-auth-code', args);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockValidator.validateRequired).toHaveBeenCalledWith('auth-code-123', 'code');
        expect(mockAuthService.exchangeCodeForToken).toHaveBeenCalledWith(
          'auth-code-123',
          'http://localhost:3000/callback'
        );
        expect(mockResponseBuilder.toolSuccess).toHaveBeenCalledWith(
          tokenResponse,
          expect.stringContaining('アクセストークンを取得しました')
        );
      });

      it('認証コードが未指定の場合', async () => {
        // Arrange
        const args = {};
        const validationError = { type: 'VALIDATION_ERROR', message: 'code は必須です', retryable: false };
        const errorResponse = { content: [{ type: 'text' as const, text: 'Error' }], isError: true };

        mockValidator.validateRequired.mockReturnValue(err(validationError as any));
        mockResponseBuilder.toolError.mockReturnValue(errorResponse);

        // Act
        const result = await authToolHandler.executeTool('exchange-auth-code', args);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockValidator.validateRequired).toHaveBeenCalledWith(undefined, 'code');
        expect(mockResponseBuilder.toolError).toHaveBeenCalledWith(validationError);
      });

      it('認証コード交換が失敗する場合', async () => {
        // Arrange
        const args = { code: 'invalid-code' };
        const error = { type: 'AUTH_ERROR', message: 'Invalid authorization code', retryable: false };
        const errorResponse = { content: [{ type: 'text' as const, text: 'Error' }], isError: true };

        mockValidator.validateRequired.mockReturnValue(ok('invalid-code'));
        mockAuthService.exchangeCodeForToken.mockResolvedValue(err(error as any));
        mockResponseBuilder.toolError.mockReturnValue(errorResponse);

        // Act
        const result = await authToolHandler.executeTool('exchange-auth-code', args);

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockResponseBuilder.toolError).toHaveBeenCalledWith(error);
      });
    });

    describe('check-auth-status', () => {
      it('認証状態確認が成功する場合', async () => {
        // Arrange
        const authState = {
          isAuthenticated: true,
          authMode: 'direct_token' as const,
          companyId: '2067140',
        };
        const successResponse = { content: [{ type: 'text' as const, text: 'Success' }], isError: false };

        mockAuthService.checkAuthenticationStatus.mockReturnValue(ok(authState));
        mockResponseBuilder.toolSuccess.mockReturnValue(successResponse);

        // Act
        const result = await authToolHandler.executeTool('check-auth-status', {});

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockAuthService.checkAuthenticationStatus).toHaveBeenCalled();
        expect(mockResponseBuilder.toolSuccess).toHaveBeenCalledWith(
          authState,
          expect.stringContaining('認証状態を確認しました')
        );
      });

      it('認証状態確認が失敗する場合', async () => {
        // Arrange
        const error = { type: 'AUTH_ERROR', message: 'Authentication failed', retryable: false };
        const errorResponse = { content: [{ type: 'text' as const, text: 'Error' }], isError: true };

        mockAuthService.checkAuthenticationStatus.mockReturnValue(err(error as any));
        mockResponseBuilder.toolError.mockReturnValue(errorResponse);

        // Act
        const result = await authToolHandler.executeTool('check-auth-status', {});

        // Assert
        expect(result.isOk()).toBe(true);
        expect(mockResponseBuilder.toolError).toHaveBeenCalledWith(error);
      });
    });

    describe('unknown tool', () => {
      it('未知のツール名の場合エラーを返す', async () => {
        // Arrange
        const unknownError = { type: 'API_ERROR', message: 'Unknown tool: unknown-tool', retryable: false };
        mockErrorHandler.apiError = jest.fn().mockReturnValue(unknownError);

        // Act
        const result = await authToolHandler.executeTool('unknown-tool', {});

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error).toEqual(unknownError);
        }
        expect(mockErrorHandler.apiError).toHaveBeenCalledWith('Unknown tool: unknown-tool', 404);
      });
    });
  });

  describe('requiresAuthentication', () => {
    it('認証関連ツールは認証不要と判定する', () => {
      // Act & Assert
      expect((authToolHandler as any).requiresAuthentication('generate-auth-url')).toBe(false);
      expect((authToolHandler as any).requiresAuthentication('exchange-auth-code')).toBe(false);
      expect((authToolHandler as any).requiresAuthentication('check-auth-status')).toBe(false);
    });

    it('その他のツールは認証必要と判定する', () => {
      // Act & Assert
      expect((authToolHandler as any).requiresAuthentication('other-tool')).toBe(true);
    });
  });
});
