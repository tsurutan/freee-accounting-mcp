/**
 * OAuth認証クライアントのテスト
 */

import { FreeeOAuthClient } from '../auth';
import { OAuthConfig } from '@mcp-server/types';

// axios をモック
jest.mock('axios');

describe('FreeeOAuthClient', () => {
  let oauthClient: FreeeOAuthClient;
  let config: OAuthConfig;

  beforeEach(() => {
    config = {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      redirectUri: 'http://localhost:3000/callback',
      baseUrl: 'https://api.freee.co.jp',
    };
    oauthClient = new FreeeOAuthClient(config);
  });

  describe('generateAuthUrl', () => {
    it('should generate correct auth URL without state', () => {
      const authUrl = oauthClient.generateAuthUrl();

      expect(authUrl).toContain('https://api.freee.co.jp/oauth/authorize');
      expect(authUrl).toContain('client_id=test_client_id');
      expect(authUrl).toContain('redirect_uri=http%3A//localhost%3A3000/callback');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('scope=read%20write');
    });

    it('should generate correct auth URL with state', () => {
      const state = 'test_state_123';
      const authUrl = oauthClient.generateAuthUrl(state);

      expect(authUrl).toContain('state=test_state_123');
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
    });
  });
});
