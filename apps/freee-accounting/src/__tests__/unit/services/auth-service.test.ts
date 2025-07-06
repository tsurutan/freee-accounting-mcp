/**
 * AuthService ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { AuthService } from '../../../services/auth-service.js';
import { EnvironmentConfig } from '../../../config/environment-config.js';
import { ErrorHandler } from '../../../utils/error-handler.js';
import { Logger } from '../../../infrastructure/logger.js';
import { TYPES } from '../../../container/types.js';

describe('AuthService', () => {
  let container: Container;
  let authService: AuthService;
  let mockEnvConfig: jest.Mocked<EnvironmentConfig>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    container = new Container();

    // モックの作成
    mockEnvConfig = {
      useOAuth: true,
      validate: jest.fn(),
      getSummary: jest.fn(),
    } as any;

    mockErrorHandler = {
      authError: jest.fn(),
      fromException: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // DIコンテナにモックを登録
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfig);
    container.bind(TYPES.ErrorHandler).toConstantValue(mockErrorHandler);
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(AuthService).toSelf();

    authService = container.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAuthenticationStatus', () => {
    it('OAuth認証モードの場合', () => {
      // Arrange
      const mockOAuthClient = {
        getAuthState: jest.fn().mockReturnValue({
          isAuthenticated: false,
          expiresAt: null,
          tokens: null
        }),
        getCompanyId: jest.fn().mockReturnValue(null),
        getExternalCid: jest.fn().mockReturnValue(null)
      };

      const mockEnvConfigWithOAuth = {
        ...mockEnvConfig,
        useOAuth: true,
        oauthClient: mockOAuthClient
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithOAuth);
      authService = container.get(AuthService);

      // Act
      const result = authService.checkAuthenticationStatus();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(mockErrorHandler.authError).toHaveBeenCalled();
      }
    });

    it('認証設定がない場合', () => {
      // Arrange
      const mockEnvConfigWithoutAuth = {
        ...mockEnvConfig,
        useOAuth: false,
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithoutAuth);
      authService = container.get(AuthService);

      // Act
      const result = authService.checkAuthenticationStatus();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(mockErrorHandler.authError).toHaveBeenCalled();
      }
    });
  });

  describe('healthCheck', () => {
    it('ヘルス状態を正常に取得する', async () => {
      // Act
      const healthResult = await authService.healthCheck();

      // Assert
      expect(healthResult.isOk()).toBe(true);
      if (healthResult.isOk()) {
        expect(healthResult.value.status).toBe('degraded');
        expect(healthResult.value.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('getStats', () => {
    it('統計情報を正常に取得する', async () => {
      // Act
      const stats = await authService.getStats();

      // Assert
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulRequests');
      expect(stats).toHaveProperty('failedRequests');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('lastRequestAt');
    });
  });
});
