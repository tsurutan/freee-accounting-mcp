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
      expect(environmentConfig.redirectUri).toBe('urn:ietf:wg:oauth:2.0:oob');
      expect(environmentConfig.useOAuth).toBe(false);
    });

    it('環境変数から値を読み込む', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      process.env.FREEE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
      process.env.FREEE_API_BASE_URL = 'https://api.test.freee.co.jp';
      process.env.DEBUG_FREEE_API = 'true';
      process.env.DEBUG_AXIOS = 'true';
      
      mockFs.existsSync.mockReturnValue(false);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.clientId).toBe('test-client-id');
      expect(environmentConfig.clientSecret).toBe('test-client-secret');
      expect(environmentConfig.redirectUri).toBe('urn:ietf:wg:oauth:2.0:oob');
      expect(environmentConfig.baseUrl).toBe('https://api.test.freee.co.jp');
      expect(environmentConfig.useOAuth).toBe(true);
    });

    it('.envファイルから値を読み込む', () => {
      // Arrange
      const envContent = `
FREEE_CLIENT_ID=file-client-id
# This is a comment
FREEE_CLIENT_SECRET=file-client-secret
FREEE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
`;
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(envContent);

      // Act
      environmentConfig = new EnvironmentConfig();

      // Assert
      expect(environmentConfig.clientId).toBe('file-client-id');
      expect(environmentConfig.clientSecret).toBe('file-client-secret');
      expect(environmentConfig.redirectUri).toBe('urn:ietf:wg:oauth:2.0:oob');
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
        expect(result.error.type).toBe('MISSING_OAUTH_CONFIG');
      }
    });
  });

  describe('oauthConfig', () => {
    it('OAuth設定を正しく返す', () => {
      // Arrange
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      process.env.FREEE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
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
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      process.env.DEBUG_FREEE_API = 'true';
      mockFs.existsSync.mockReturnValue(false);
      environmentConfig = new EnvironmentConfig();

      // Act
      const summary = environmentConfig.getSummary();

      // Assert
      expect(summary).toEqual({
        authMode: 'oauth',
        useOAuth: true,
        hasClientId: true,
        hasClientSecret: true,
        hasOAuthConfig: true,
        baseUrl: 'https://api.freee.co.jp',
        redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
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
