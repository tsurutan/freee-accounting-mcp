/**
 * OAuth認証クライアントのテスト
 */

import { FreeeOAuthClient } from '../auth';
import { OAuthConfig } from '@mcp-server/types';
import * as fs from 'fs';

// axios をモック
jest.mock('axios');

// fs をモック
jest.mock('fs');

describe('FreeeOAuthClient', () => {
  let oauthClient: FreeeOAuthClient;
  let config: OAuthConfig;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock fs methods to return false (no token file exists)
    jest.mocked(fs.existsSync).mockReturnValue(false);
    jest.mocked(fs.readFileSync).mockReturnValue('');
    jest.mocked(fs.writeFileSync).mockImplementation(() => {});
    jest.mocked(fs.unlinkSync).mockImplementation(() => {});
    
    config = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      redirectUri: 'urn:ietf:wg:oauth:2.0:oob',
      baseUrl: 'https://api.freee.co.jp',
    };
    oauthClient = new FreeeOAuthClient(config);
  });

  describe('generateAuthUrl', () => {
    it('should generate correct auth URL without state (company selection enabled)', () => {
      const authUrl = oauthClient.generateAuthUrl();

      expect(authUrl).toContain('https://accounts.secure.freee.co.jp/public_api/authorize');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('prompt=select_company');
      expect(authUrl).toContain('state='); // ランダムなstateが生成される
    });

    it('should generate correct auth URL with state', () => {
      const state = 'test_state_123';
      const authUrl = oauthClient.generateAuthUrl(state);

      expect(authUrl).toContain('state=test_state_123');
      expect(authUrl).toContain('prompt=select_company');
    });

    it('should generate auth URL without company selection when disabled', () => {
      const authUrl = oauthClient.generateAuthUrl(undefined, false);

      expect(authUrl).toContain('https://accounts.secure.freee.co.jp/public_api/authorize');
      expect(authUrl).not.toContain('prompt=select_company');
      expect(authUrl).toContain('state='); // ランダムなstateが生成される
    });

    it('should generate auth URL with company selection when explicitly enabled', () => {
      const authUrl = oauthClient.generateAuthUrl(undefined, true);

      expect(authUrl).toContain('prompt=select_company');
    });
  });

  describe('getAuthState', () => {
    it('should return initial unauthenticated state', () => {
      const authState = oauthClient.getAuthState();

      expect(authState.isAuthenticated).toBe(false);
      expect(authState.tokens).toBeUndefined();
      expect(authState.expiresAt).toBeUndefined();
    });
  });

  describe('setTokens', () => {
    it('should set tokens and update auth state', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      oauthClient.setTokens(tokens);
      const authState = oauthClient.getAuthState();

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.tokens).toEqual(tokens);
      expect(authState.expiresAt).toBe(tokens.created_at + tokens.expires_in);
    });

    it('should set tokens with company information', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
        company_id: '123456',
        external_cid: 'ext_123456',
      };

      oauthClient.setTokens(tokens);

      expect(oauthClient.getCompanyId()).toBe('123456');
      expect(oauthClient.getExternalCid()).toBe('ext_123456');
      expect(oauthClient.isCompanySelectionEnabled()).toBe(true);
    });
  });

  describe('isTokenValid', () => {
    it('should return false when not authenticated', () => {
      expect(oauthClient.isTokenValid()).toBe(false);
    });

    it('should return true when token is valid', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      oauthClient.setTokens(tokens);
      expect(oauthClient.isTokenValid()).toBe(true);
    });

    it('should return false when token is expired', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };

      oauthClient.setTokens(tokens);
      expect(oauthClient.isTokenValid()).toBe(false);
    });
  });

  describe('getCurrentAccessToken', () => {
    it('should return null when not authenticated', () => {
      expect(oauthClient.getCurrentAccessToken()).toBeNull();
    });

    it('should return access token when valid', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      oauthClient.setTokens(tokens);
      expect(oauthClient.getCurrentAccessToken()).toBe('test_access_token');
    });

    it('should return null when token is expired', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };

      oauthClient.setTokens(tokens);
      expect(oauthClient.getCurrentAccessToken()).toBeNull();
    });
  });

  describe('company information methods', () => {
    it('should return null when not authenticated', () => {
      expect(oauthClient.getCompanyId()).toBeNull();
      expect(oauthClient.getExternalCid()).toBeNull();
      expect(oauthClient.isCompanySelectionEnabled()).toBe(false);
    });

    it('should return company information when authenticated', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
        company_id: '123456',
        external_cid: 'ext_123456',
      };

      oauthClient.setTokens(tokens);

      expect(oauthClient.getCompanyId()).toBe('123456');
      expect(oauthClient.getExternalCid()).toBe('ext_123456');
      expect(oauthClient.isCompanySelectionEnabled()).toBe(true);
    });

    it('should handle tokens without company information', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      oauthClient.setTokens(tokens);

      expect(oauthClient.getCompanyId()).toBeNull();
      expect(oauthClient.getExternalCid()).toBeNull();
      expect(oauthClient.isCompanySelectionEnabled()).toBe(false);
    });
  });

  describe('clearAuth', () => {
    it('should clear authentication state', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        created_at: Math.floor(Date.now() / 1000),
      };

      oauthClient.setTokens(tokens);
      expect(oauthClient.getAuthState().isAuthenticated).toBe(true);

      oauthClient.clearAuth();
      const authState = oauthClient.getAuthState();

      expect(authState.isAuthenticated).toBe(false);
      expect(authState.tokens).toBeUndefined();
      expect(authState.expiresAt).toBeUndefined();

      // Company information should also be cleared
      expect(oauthClient.getCompanyId()).toBeNull();
      expect(oauthClient.getExternalCid()).toBeNull();
      expect(oauthClient.isCompanySelectionEnabled()).toBe(false);
    });
  });
});
