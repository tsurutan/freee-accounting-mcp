/**
 * EnvironmentConfig ユニットテスト
 */

import 'reflect-metadata';
import { EnvironmentConfig } from '../../../config/environment-config.js';
import * as fs from 'fs';
import * as path from 'path';

// fsモジュールをモック
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('EnvironmentConfig', () => {
  let environmentConfig: EnvironmentConfig;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };
    
    // 環境変数をクリア
    delete process.env.FREEE_ACCESS_TOKEN;
    delete process.env.FREEE_CLIENT_ID;
    delete process.env.FREEE_CLIENT_SECRET;
    delete process.env.FREEE_REDIRECT_URI;
    delete process.env.FREEE_API_BASE_URL;
    delete process.env.DEBUG_FREEE_API;
    delete process.env.DEBUG_AXIOS;

    // fsモックをリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('デフォルト値で初期化される', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.baseUrl).toBe('https://api.freee.co.jp');
      expect(environmentConfig.redirectUri).toBe('http://localhost:3000/callback');
      expect(environmentConfig.useDirectToken).toBe(false);
      expect(environmentConfig.useOAuth).toBe(false);
    });

    it('環境変数から値を読み込む', () => {
      // Arrange
      process.env.FREEE_ACCESS_TOKEN = 'test-access-token';
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      process.env.FREEE_REDIRECT_URI = 'http://localhost:8080/callback';
      process.env.FREEE_API_BASE_URL = 'https://api.test.freee.co.jp';
      process.env.DEBUG_FREEE_API = 'true';
      process.env.DEBUG_AXIOS = 'true';
      
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.accessToken).toBe('test-access-token');
      expect(environmentConfig.clientId).toBe('test-client-id');
      expect(environmentConfig.clientSecret).toBe('test-client-secret');
      expect(environmentConfig.redirectUri).toBe('http://localhost:8080/callback');
      expect(environmentConfig.baseUrl).toBe('https://api.test.freee.co.jp');
      expect(environmentConfig.useDirectToken).toBe(true);
      expect(environmentConfig.useOAuth).toBe(false);
    });

    it('.envファイルから値を読み込む', () => {
      // Arrange
      const envContent = `
FREEE_ACCESS_TOKEN=file-access-token
FREEE_CLIENT_ID=file-client-id
# This is a comment
FREEE_CLIENT_SECRET=file-client-secret
FREEE_REDIRECT_URI=http://localhost:9000/callback
`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(envContent);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.accessToken).toBe('file-access-token');
      expect(environmentConfig.clientId).toBe('file-client-id');
      expect(environmentConfig.clientSecret).toBe('file-client-secret');
      expect(environmentConfig.redirectUri).toBe('http://localhost:9000/callback');
    });

    it('.envファイル読み込みエラーを適切に処理する', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Act & Assert
      expect(() => new EnvironmentConfig()).not.toThrow();
    });
  });

  describe('useDirectToken', () => {
    it('アクセストークンがある場合trueを返す', () => {
      // Arrange
      process.env.FREEE_ACCESS_TOKEN = 'test-token';
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.useDirectToken).toBe(true);
    });

    it('アクセストークンがない場合falseを返す', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.useDirectToken).toBe(false);
    });
  });

  describe('useOAuth', () => {
    it('OAuth設定がある場合trueを返す', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.useOAuth).toBe(true);
    });

    it('OAuth設定が不完全な場合falseを返す', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      // CLIENT_SECRETなし
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.useOAuth).toBe(false);
    });
  });

  describe('validate', () => {
    it('直接トークン認証の場合、有効な設定で成功する', () => {
      // Arrange
      process.env.FREEE_ACCESS_TOKEN = 'valid-token';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const result = environmentConfig.validate();

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('直接トークン認証の場合、トークンがないと失敗する', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const result = environmentConfig.validate();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('MISSING_TOKEN');
      }
    });

    it('OAuth認証の場合、有効な設定で成功する', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const result = environmentConfig.validate();

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('OAuth認証の場合、設定が不完全だと失敗する', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      // CLIENT_SECRETなし
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const result = environmentConfig.validate();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('MISSING_OAUTH_CONFIG');
      }
    });

    it('認証設定がない場合失敗する', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const result = environmentConfig.validate();

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('MISSING_TOKEN');
      }
    });
  });

  describe('oauthConfig', () => {
    it('OAuth設定を正しく返す', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      process.env.FREEE_REDIRECT_URI = 'http://localhost:8080/callback';
      process.env.FREEE_API_BASE_URL = 'https://api.test.freee.co.jp';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const config = environmentConfig.oauthConfig;

      // Assert
      expect(config).toEqual({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:8080/callback',
        baseUrl: 'https://api.test.freee.co.jp',
      });
    });

    it('OAuth設定がない場合undefinedを返す', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const config = environmentConfig.oauthConfig;

      // Assert
      expect(config).toBeUndefined();
    });
  });

  describe('getSummary', () => {
    it('設定サマリーを正しく返す', () => {
      // Arrange
      process.env.FREEE_ACCESS_TOKEN = 'test-token';
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.DEBUG_FREEE_API = 'true';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const summary = environmentConfig.getSummary();

      // Assert
      expect(summary).toEqual({
        authMode: 'direct_token',
        useDirectToken: true,
        useOAuth: false,
        hasAccessToken: true,
        hasClientId: true,
        hasClientSecret: false,
        hasOAuthConfig: false,
        baseUrl: 'https://api.freee.co.jp',
        redirectUri: 'http://localhost:3000/callback',
        debug: {
          freeeApi: true,
          axios: false,
        },
      });
    });
  });

  describe('oauthClient', () => {
    it('OAuth設定がある場合、OAuthクライアントを返す', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const client = environmentConfig.oauthClient;

      // Assert
      expect(client).toBeDefined();
    });

    it('OAuth設定がない場合、undefinedを返す', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const client = environmentConfig.oauthClient;

      // Assert
      expect(client).toBeUndefined();
    });
  });
});
