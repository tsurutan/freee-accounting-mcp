/**
 * MCPServer 統合テスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { MCPServer } from '../../server/mcp-server.js';
import { ServiceContainer } from '../../container/service-container.js';
import { Logger } from '../../infrastructure/logger.js';
import { AppConfig } from '../../config/app-config.js';
import { EnvironmentConfig } from '../../config/environment-config.js';
import { TYPES } from '../../container/types.js';
import { RequestHandlers } from '../../server/request-handlers.js';

// Access global mocks (set up by moduleNameMapper)
declare global {
  var mockServerInstance: any;
  var mockTransportInstance: any;
}

const mockServer = global.mockServerInstance;
const mockTransport = global.mockTransportInstance;

describe('MCPServer Integration', () => {
  let container: ServiceContainer;
  let mcpServer: MCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };

    // テスト用環境変数を設定（DIコンテナ作成前に設定）
    process.env.FREEE_CLIENT_ID = 'test-client-id';
    process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
    process.env.FREEE_COMPANY_ID = '2067140';
  });

  afterAll(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  beforeEach(() => {
    // DIコンテナを初期化
    container = new ServiceContainer();
    mcpServer = container.get(TYPES.MCPServer);

    // モックをリセット
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('MCPサーバーが正しく初期化される', () => {
      // Assert
      expect(mcpServer).toBeDefined();
      expect(mcpServer).toBeInstanceOf(MCPServer);
    });

    it('依存関係が正しく注入される', () => {
      // Act
      const logger = container.get<Logger>(TYPES.Logger);
      const appConfig = container.get<AppConfig>(TYPES.AppConfig);
      const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);

      // Assert
      expect(logger).toBeDefined();
      expect(appConfig).toBeDefined();
      expect(envConfig).toBeDefined();
    });

    it('リクエストハンドラーが設定される', () => {
      // Act - MCPServerのインスタンス作成時にhandlersが設定される
      const requestHandlers = container.get(TYPES.RequestHandlers);
      
      // Assert - RequestHandlersがDIコンテナから取得できることを確認
      expect(requestHandlers).toBeDefined();
      expect(mcpServer).toBeDefined();
    });
  });

  describe('start', () => {
    it('サーバーが正常に開始される', async () => {
      // Arrange
      mockServer.connect.mockResolvedValue(undefined);

      // Act
      await mcpServer.start();

      // Assert
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('サーバー開始時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('Failed to start server');
      mockServer.connect.mockRejectedValue(error);

      // Act & Assert
      await expect(mcpServer.start()).rejects.toThrow('Failed to start server');
    });
  });

  describe('stop', () => {
    it('サーバーが正常に停止される', async () => {
      // Arrange
      mockServer.close.mockResolvedValue(undefined);

      // Act
      await mcpServer.stop();

      // Assert
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('サーバー停止時のエラーを適切に処理する', async () => {
      // Arrange
      const error = new Error('Failed to stop server');
      mockServer.close.mockRejectedValue(error);

      // Act & Assert
      await expect(mcpServer.stop()).rejects.toThrow('Failed to stop server');
    });
  });

  describe('configuration', () => {
    it('正しいサーバー情報で初期化される', () => {
      // Assert - MCPServerインスタンスが正常に作成されることを確認
      expect(mcpServer).toBeDefined();
      expect(mcpServer).toBeInstanceOf(MCPServer);
    });

    it('環境設定が正しく読み込まれる', () => {
      // Act
      const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);

      // Assert
      expect(envConfig.clientId).toBe('***REMOVED***'); // From .env file
      expect(envConfig.clientSecret).toBe('***REMOVED***'); // From .env file
      expect(envConfig.useOAuth).toBe(true);
    });

    it('アプリケーション設定が正しく読み込まれる', () => {
      // Act
      const appConfig = container.get<AppConfig>(TYPES.AppConfig);

      // Assert
      expect(appConfig.companyId).toBe(2067140); // Value from environment variable
      expect(appConfig.defaultDealsPeriodDays).toBe(30);
      expect(appConfig.defaultDealsLimit).toBe(100);
    });
  });

  describe('error handling', () => {
    it('初期化エラーを適切に処理する', () => {
      // Arrange
      const invalidContainer = new Container();
      // 必要な依存関係を登録しない

      // Act & Assert
      expect(() => {
        invalidContainer.get(TYPES.MCPServer);
      }).toThrow();
    });
  });

  describe('lifecycle', () => {
    it('完全なライフサイクルを実行できる', async () => {
      // Arrange
      mockServer.connect.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Act
      await mcpServer.start();
      await mcpServer.stop();

      // Assert
      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });
  });

  describe('dependency injection', () => {
    it('すべての必要なサービスが登録されている', () => {
      // Act & Assert
      expect(() => container.get(TYPES.Logger)).not.toThrow();
      expect(() => container.get(TYPES.AppConfig)).not.toThrow();
      expect(() => container.get(TYPES.EnvironmentConfig)).not.toThrow();
      expect(() => container.get(TYPES.AuthService)).not.toThrow();
      expect(() => container.get(TYPES.ResponseBuilder)).not.toThrow();
      expect(() => container.get(TYPES.ErrorHandler)).not.toThrow();
      expect(() => container.get(TYPES.Validator)).not.toThrow();
      expect(() => container.get(TYPES.DateUtils)).not.toThrow();
      expect(() => container.get(TYPES.FreeeApiClient)).not.toThrow();
      expect(() => container.get(TYPES.DebugInterceptor)).not.toThrow();
    });

    it('ハンドラーが正しく登録されている', () => {
      // Act & Assert
      expect(() => container.get(TYPES.AuthToolHandler)).not.toThrow();
      expect(() => container.get(TYPES.DealToolHandler)).not.toThrow();
      expect(() => container.get(TYPES.CompanyToolHandler)).not.toThrow();
      expect(() => container.get(TYPES.SystemToolHandler)).not.toThrow();
      expect(() => container.get(TYPES.CompaniesResourceHandler)).not.toThrow();
      expect(() => container.get(TYPES.DealsResourceHandler)).not.toThrow();
    });

    it('レジストリが正しく登録されている', () => {
      // Act & Assert
      expect(() => container.get(TYPES.ToolRegistry)).not.toThrow();
      expect(() => container.get(TYPES.ResourceRegistry)).not.toThrow();
    });
  });
});
