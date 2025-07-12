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

// OAuthClientのモック
const mockOAuthClient = {
  getAuthState: jest.fn(),
  getValidAccessToken: jest.fn(),
  generateAuthUrl: jest.fn(),
  exchangeCodeForTokens: jest.fn(),
  refreshTokens: jest.fn(),
  getCompanyId: jest.fn(),
  getExternalCid: jest.fn(),
  isCompanySelectionEnabled: jest.fn(),
};

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
      validationError: jest.fn(),
      systemError: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      auth: jest.fn(),
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
    // Clean up container to prevent memory leaks
    if (container) {
      container.unbindAll();
    }
  });

  describe('generateAuthUrl', () => {
    it('OAuth認証URLを正常に生成する', () => {
      // Arrange
      const mockEnvConfigWithOAuth = {
        ...mockEnvConfig,
        useOAuth: true,
        oauthClient: mockOAuthClient
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithOAuth);
      authService = container.get(AuthService);

      const expectedUrl = 'https://accounts.secure.freee.co.jp/public_api/authorize?response_type=code&client_id=test&redirect_uri=http://localhost:3000/callback&state=test_state&prompt=select_company';
      mockOAuthClient.generateAuthUrl.mockReturnValue(expectedUrl);

      // Act
      const result = authService.generateAuthUrl('http://localhost:3000/callback', 'test_state');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(expectedUrl);
      }
      expect(mockOAuthClient.generateAuthUrl).toHaveBeenCalledWith('test_state', true);
    });

    it('OAuth設定なしの場合はエラーを返す', () => {
      // Arrange
      const mockEnvConfigWithoutOAuth = {
        ...mockEnvConfig,
        useOAuth: false,
        oauthClient: undefined
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithoutOAuth);
      authService = container.get(AuthService);

      // Act
      const result = authService.generateAuthUrl('http://localhost:3000/callback');

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockErrorHandler.authError).toHaveBeenCalled();
    });
  });

  describe('exchangeAuthCode', () => {
    it('認証コードを正常に交換する', async () => {
      // Arrange
      const mockEnvConfigWithOAuth = {
        ...mockEnvConfig,
        useOAuth: true,
        oauthClient: mockOAuthClient
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithOAuth);
      authService = container.get(AuthService);

      const mockTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        company_id: '123456',
        external_cid: 'test_external_cid'
      };
      mockOAuthClient.exchangeCodeForTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await authService.exchangeAuthCode('test_auth_code');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockTokens);
      }
      expect(mockOAuthClient.exchangeCodeForTokens).toHaveBeenCalledWith('test_auth_code');
    });

    it('認証コードが空の場合はエラーを返す', async () => {
      // Arrange
      const mockEnvConfigWithOAuth = {
        ...mockEnvConfig,
        useOAuth: true,
        oauthClient: mockOAuthClient
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithOAuth);
      authService = container.get(AuthService);

      // Act
      const result = await authService.exchangeAuthCode('');

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockErrorHandler.validationError).toHaveBeenCalledWith('認証コードが必要です', 'code');
    });

    it('OAuth設定なしの場合はエラーを返す', async () => {
      // Arrange
      const mockEnvConfigWithoutOAuth = {
        ...mockEnvConfig,
        useOAuth: false,
        oauthClient: undefined
      } as any;
      container.unbind(TYPES.EnvironmentConfig);
      container.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithoutOAuth);
      authService = container.get(AuthService);

      // Act
      const result = await authService.exchangeAuthCode('test_code');

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockErrorHandler.authError).toHaveBeenCalled();
    });
  });

  describe('checkAuthenticationStatus', () => {
    it('OAuth認証モードで未認証の場合', () => {
      // Arrange
      mockOAuthClient.getAuthState.mockReturnValue({
        isAuthenticated: false,
        expiresAt: null,
        tokens: null
      });
      mockOAuthClient.getCompanyId.mockReturnValue(null);
      mockOAuthClient.getExternalCid.mockReturnValue(null);

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

    it('OAuth認証モードで認証済みの場合', () => {
      // Arrange
      const mockTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        scope: 'read write'
      };
      mockOAuthClient.getAuthState.mockReturnValue({
        isAuthenticated: true,
        expiresAt: Date.now() / 1000 + 3600,
        tokens: mockTokens
      });
      mockOAuthClient.getCompanyId.mockReturnValue('123456');
      mockOAuthClient.getExternalCid.mockReturnValue('test_external_cid');

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
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isAuthenticated).toBe(true);
        expect(result.value.authMode).toBe('oauth');
        expect(result.value.companyId).toBe('123456');
        expect(result.value.externalCid).toBe('test_external_cid');
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
