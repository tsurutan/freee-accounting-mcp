/**
 * DebugInterceptor ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { DebugInterceptor } from '../../../infrastructure/debug-interceptor.js';
import { Logger } from '../../../infrastructure/logger.js';
import { TYPES } from '../../../container/types.js';

describe('DebugInterceptor', () => {
  let container: Container;
  let debugInterceptor: DebugInterceptor;
  let mockLogger: jest.Mocked<Logger>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };

    container = new Container();

    // モックの作成
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // DIコンテナにモックを登録
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(DebugInterceptor).toSelf();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化される', () => {
      // Arrange
      process.env.DEBUG_FREEE_API = undefined;
      process.env.DEBUG_AXIOS = undefined;
      process.env.MCP_INSPECTOR = undefined;

      // Act
      debugInterceptor = container.get(DebugInterceptor);

      // Assert
      const config = debugInterceptor.getConfig();
      expect(config.enableFreeeApi).toBe(false);
      expect(config.enableAxios).toBe(false);
      expect(config.enableMcpInspector).toBe(false);
      expect(config.maxDataLength).toBe(2000);
      expect(config.maskSensitiveData).toBe(true);
    });

    it('環境変数に基づいて設定される', () => {
      // Arrange
      process.env.DEBUG_FREEE_API = 'true';
      process.env.DEBUG_AXIOS = 'true';
      process.env.MCP_INSPECTOR = 'true';
      process.env.DEBUG_MAX_DATA_LENGTH = '5000';
      process.env.DEBUG_MASK_SENSITIVE = 'false';

      // Act
      debugInterceptor = container.get(DebugInterceptor);

      // Assert
      const config = debugInterceptor.getConfig();
      expect(config.enableFreeeApi).toBe(true);
      expect(config.enableAxios).toBe(true);
      expect(config.enableMcpInspector).toBe(true);
      expect(config.maxDataLength).toBe(5000);
      expect(config.maskSensitiveData).toBe(false);
    });
  });

  describe('setupInterceptors', () => {
    beforeEach(() => {
      process.env.DEBUG_FREEE_API = 'true';
      debugInterceptor = container.get(DebugInterceptor);
    });

    it('デバッグが無効の場合、インターセプターを設定しない', () => {
      // Arrange
      process.env.DEBUG_FREEE_API = 'false';
      debugInterceptor = container.get(DebugInterceptor);
      
      const mockClient = {
        client: {
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
          },
        },
      };

      // Act
      debugInterceptor.setupInterceptors(mockClient as any);

      // Assert
      expect(mockClient.client.interceptors.request.use).not.toHaveBeenCalled();
      expect(mockClient.client.interceptors.response.use).not.toHaveBeenCalled();
    });

    it('axiosインスタンスがない場合、警告を出力する', () => {
      // Arrange
      const mockClient = {};

      // Act
      debugInterceptor.setupInterceptors(mockClient as any);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot access axios instance for debug interceptors'
      );
    });

    it('正常にインターセプターを設定する', () => {
      // Arrange
      const mockClient = {
        client: {
          interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() },
          },
        },
      };

      // Act
      debugInterceptor.setupInterceptors(mockClient as any);

      // Assert
      expect(mockClient.client.interceptors.request.use).toHaveBeenCalled();
      expect(mockClient.client.interceptors.response.use).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Debug interceptors setup completed');
    });
  });

  describe('shouldEnableDebug', () => {
    it('いずれかのデバッグフラグが有効な場合trueを返す', () => {
      // Arrange
      process.env.DEBUG_FREEE_API = 'true';
      debugInterceptor = container.get(DebugInterceptor);

      // Act
      const result = (debugInterceptor as any).shouldEnableDebug();

      // Assert
      expect(result).toBe(true);
    });

    it('すべてのデバッグフラグが無効な場合falseを返す', () => {
      // Arrange
      process.env.DEBUG_FREEE_API = 'false';
      process.env.DEBUG_AXIOS = 'false';
      debugInterceptor = container.get(DebugInterceptor);

      // Act
      const result = (debugInterceptor as any).shouldEnableDebug();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('maskHeaders', () => {
    beforeEach(() => {
      debugInterceptor = container.get(DebugInterceptor);
    });

    it('機密データをマスクする', () => {
      // Arrange
      const headers = {
        'Authorization': 'Bearer secret-token',
        'X-API-Key': 'api-key-123',
        'Content-Type': 'application/json',
      };

      // Act
      const result = (debugInterceptor as any).maskHeaders(headers);

      // Assert
      expect(result.Authorization).toBe('Bearer ***');
      expect(result['X-API-Key']).toBe('***');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('マスクが無効な場合、元のヘッダーを返す', () => {
      // Arrange
      process.env.DEBUG_MASK_SENSITIVE = 'false';
      debugInterceptor = container.get(DebugInterceptor);
      
      const headers = {
        'Authorization': 'Bearer secret-token',
        'Content-Type': 'application/json',
      };

      // Act
      const result = (debugInterceptor as any).maskHeaders(headers);

      // Assert
      expect(result.Authorization).toBe('Bearer secret-token');
      expect(result['Content-Type']).toBe('application/json');
    });
  });

  describe('truncateData', () => {
    beforeEach(() => {
      process.env.DEBUG_MAX_DATA_LENGTH = '50';
      debugInterceptor = container.get(DebugInterceptor);
    });

    it('データが制限以下の場合、そのまま返す', () => {
      // Arrange
      const data = { name: 'test' };

      // Act
      const result = (debugInterceptor as any).truncateData(data);

      // Assert
      expect(result).toEqual(data);
    });

    it('データが制限を超える場合、切り詰める', () => {
      // Arrange
      const longData = { name: 'a'.repeat(100) };

      // Act
      const result = (debugInterceptor as any).truncateData(longData);

      // Assert
      expect(typeof result).toBe('string');
      expect(result).toContain('...[truncated]');
      expect(result.length).toBeLessThanOrEqual(50 + '...[truncated]'.length);
    });

    it('undefinedデータを正しく処理する', () => {
      // Act
      const result = (debugInterceptor as any).truncateData(undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      debugInterceptor = container.get(DebugInterceptor);
    });

    it('設定を正しく更新する', () => {
      // Arrange
      const newConfig = {
        enableFreeeApi: true,
        maxDataLength: 1000,
      };

      // Act
      debugInterceptor.updateConfig(newConfig);

      // Assert
      const config = debugInterceptor.getConfig();
      expect(config.enableFreeeApi).toBe(true);
      expect(config.maxDataLength).toBe(1000);
      expect(mockLogger.info).toHaveBeenCalledWith('Debug config updated', config);
    });
  });

  describe('getDebugStats', () => {
    beforeEach(() => {
      process.env.DEBUG_FREEE_API = 'true';
      process.env.DEBUG_AXIOS = 'false';
      debugInterceptor = container.get(DebugInterceptor);
    });

    it('デバッグ統計を正しく取得する', () => {
      // Act
      const stats = debugInterceptor.getDebugStats();

      // Assert
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('isEnabled');
      expect(stats).toHaveProperty('environment');
      expect(stats.isEnabled).toBe(true);
      expect(stats.environment.DEBUG_FREEE_API).toBe('true');
      expect(stats.environment.DEBUG_AXIOS).toBe('false');
    });
  });
});
