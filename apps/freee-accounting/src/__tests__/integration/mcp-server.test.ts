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

// Server クラスのモック
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
  close: jest.fn(),
};

const mockTransport = {
  start: jest.fn(),
  close: jest.fn(),
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => mockServer),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => mockTransport),
}));

describe('MCPServer Integration', () => {
  let container: ServiceContainer;
  let mcpServer: MCPServer;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };

    // テスト用環境変数を設定
    process.env.FREEE_ACCESS_TOKEN = 'test-access-token';
    process.env.FREEE_CLIENT_ID = 'test-client-id';
    process.env.FREEE_CLIENT_SECRET = 'test-client-secret';

    // DIコンテナを初期化
    container = new ServiceContainer();
    mcpServer = container.get(MCPServer);

    // モックをリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
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
      // Assert
      expect(mockServer.setRequestHandler).toHaveBeenCalled();
      
      // 最低限のハンドラーが設定されていることを確認
      const calls = mockServer.setRequestHandler.mock.calls;
      const handlerTypes = calls.map(call => call[0]);
      
      // リソース関連ハンドラー
      expect(handlerTypes.some(type => type.method === 'resources/list')).toBe(true);
      expect(handlerTypes.some(type => type.method === 'resources/read')).toBe(true);
      
      // ツール関連ハンドラー
      expect(handlerTypes.some(type => type.method === 'tools/list')).toBe(true);
      expect(handlerTypes.some(type => type.method === 'tools/call')).toBe(true);
      
      // プロンプト関連ハンドラー
      expect(handlerTypes.some(type => type.method === 'prompts/list')).toBe(true);
      expect(handlerTypes.some(type => type.method === 'prompts/get')).toBe(true);
    });
  });

  describe('start', () => {
    it('サーバーが正常に開始される', async () => {
      // Arrange
      mockTransport.start.mockResolvedValue(undefined);
      mockServer.connect.mockResolvedValue(undefined);

      // Act
      await mcpServer.start();

      // Assert
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockTransport.start).toHaveBeenCalled();
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
      mockTransport.close.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Act
      await mcpServer.stop();

      // Assert
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
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
      // Assert
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      expect(Server).toHaveBeenCalledWith({
        name: 'freee-accounting-mcp',
        version: '0.1.0',
      });
    });

    it('環境設定が正しく読み込まれる', () => {
      // Act
      const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);

      // Assert
      expect(envConfig.accessToken).toBe('test-access-token');
      expect(envConfig.clientId).toBe('test-client-id');
      expect(envConfig.clientSecret).toBe('test-client-secret');
      expect(envConfig.useDirectToken).toBe(true);
    });

    it('アプリケーション設定が正しく読み込まれる', () => {
      // Act
      const appConfig = container.get<AppConfig>(TYPES.AppConfig);

      // Assert
      expect(appConfig.companyId).toBe(2067140);
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
        invalidContainer.get(MCPServer);
      }).toThrow();
    });
  });

  describe('lifecycle', () => {
    it('完全なライフサイクルを実行できる', async () => {
      // Arrange
      mockTransport.start.mockResolvedValue(undefined);
      mockServer.connect.mockResolvedValue(undefined);
      mockTransport.close.mockResolvedValue(undefined);
      mockServer.close.mockResolvedValue(undefined);

      // Act
      await mcpServer.start();
      await mcpServer.stop();

      // Assert
      expect(mockServer.connect).toHaveBeenCalled();
      expect(mockTransport.start).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
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
