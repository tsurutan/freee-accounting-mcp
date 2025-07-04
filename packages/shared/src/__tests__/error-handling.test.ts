/**
 * エラーハンドリングのテスト
 */

import { FreeeOAuthClient } from '../auth';
import { FreeeError, OAuthConfig } from '@mcp-server/types';
import axios from 'axios';

// axios をモック
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FreeeOAuthClient Error Handling', () => {
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

    // axios.create のモック
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('exchangeCodeForTokens error handling', () => {
    it('should handle 401 authentication error', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            errors: [
              {
                type: 'authentication_error',
                message: 'Invalid client credentials'
              }
            ]
          },
          headers: {
            'x-request-id': 'req_123456'
          }
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.exchangeCodeForTokens('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code for tokens: ネットワークエラーまたはサーバーに接続できません');
    });

    it('should handle 400 bad request error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                type: 'validation_error',
                message: 'Invalid authorization code'
              }
            ]
          }
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.exchangeCodeForTokens('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code for tokens: Invalid authorization code');
    });

    it('should handle 429 rate limit error', async () => {
      const errorResponse = {
        response: {
          status: 429,
          data: {}
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.exchangeCodeForTokens('test_code'))
        .rejects
        .toThrow('Failed to exchange code for tokens: レート制限に達しました。しばらく待ってから再試行してください');
    });

    it('should handle 500 server error', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: {}
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.exchangeCodeForTokens('test_code'))
        .rejects
        .toThrow('Failed to exchange code for tokens: freeeサーバーでエラーが発生しました');
    });

    it('should handle network error', async () => {
      const networkError = {
        message: 'Network Error',
        code: 'ECONNREFUSED'
      };

      mockedAxios.post.mockRejectedValue(networkError);

      await expect(oauthClient.exchangeCodeForTokens('test_code'))
        .rejects
        .toThrow('Failed to exchange code for tokens: ネットワークエラーまたはサーバーに接続できません');
    });
  });

  describe('refreshTokens error handling', () => {
    it('should handle invalid refresh token error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                type: 'invalid_grant',
                message: 'Invalid refresh token'
              }
            ]
          }
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.refreshTokens('invalid_refresh_token'))
        .rejects
        .toThrow('Failed to refresh tokens: Invalid refresh token');
    });

    it('should handle expired refresh token error', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            errors: [
              {
                type: 'invalid_grant',
                message: 'Refresh token has expired'
              }
            ]
          }
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      await expect(oauthClient.refreshTokens('expired_refresh_token'))
        .rejects
        .toThrow('Failed to refresh tokens: Refresh token has expired');
    });
  });

  describe('FreeeError properties', () => {
    it('should create FreeeError with correct properties', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: {
            errors: [
              {
                type: 'authentication_error',
                message: 'Invalid credentials'
              }
            ]
          },
          headers: {
            'x-request-id': 'req_123456'
          }
        }
      };

      mockedAxios.post.mockRejectedValue(errorResponse);

      try {
        await oauthClient.exchangeCodeForTokens('invalid_code');
      } catch (error) {
        expect(error).toBeInstanceOf(FreeeError);
        if (error instanceof FreeeError) {
          expect(error.statusCode).toBe(401);
          expect(error.requestId).toBe('req_123456');
          expect(error.retryable).toBe(false);
          expect(error.errors).toEqual([
            {
              type: 'authentication_error',
              message: 'Invalid credentials'
            }
          ]);
        }
      }
    });
  });
});
