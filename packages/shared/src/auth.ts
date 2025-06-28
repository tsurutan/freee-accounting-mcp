/**
 * freee OAuth2.0認証クライアント
 */

import axios, { AxiosInstance } from 'axios';
import {
  OAuthConfig,
  OAuthTokens,
  OAuthTokenResponse,
  AuthState,
  FreeeError
} from '@mcp-server/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { tokenEncryption, SecurityAuditor } from './security';

export class FreeeOAuthClient {
  private config: OAuthConfig;
  private httpClient: AxiosInstance;
  private authState: AuthState = { isAuthenticated: false };
  private tokenFilePath: string;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.tokenFilePath = path.join(os.homedir(), '.freee-mcp-tokens.json');

    this.httpClient = axios.create({
      baseURL: config.baseUrl || 'https://api.freee.co.jp',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // 保存されたトークンを読み込み
    this.loadTokensFromFile();
  }

  /**
   * 認証URLを生成
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'read write',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.baseUrl || 'https://api.freee.co.jp'}/oauth/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      });

      const response = await this.httpClient.post<OAuthTokenResponse>(
        '/oauth/token',
        params.toString()
      );

      const tokens: OAuthTokens = {
        ...response.data,
        created_at: Math.floor(Date.now() / 1000),
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error: any) {
      throw new FreeeError(
        'Failed to exchange code for tokens',
        error.response?.status || 500,
        error.response?.data?.errors
      );
    }
  }

  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      });

      const response = await this.httpClient.post<OAuthTokenResponse>(
        '/oauth/token',
        params.toString()
      );

      const tokens: OAuthTokens = {
        ...response.data,
        created_at: Math.floor(Date.now() / 1000),
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error: any) {
      throw new FreeeError(
        'Failed to refresh tokens',
        error.response?.status || 500,
        error.response?.data?.errors
      );
    }
  }

  /**
   * 現在の認証状態を取得
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * アクセストークンを取得（必要に応じて自動更新）
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      throw new FreeeError('Not authenticated', 401);
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.authState.expiresAt || 0;

    // トークンの有効期限が5分以内の場合は更新
    if (now >= expiresAt - 300) {
      try {
        await this.refreshTokens(this.authState.tokens.refresh_token);
      } catch (error) {
        // リフレッシュに失敗した場合は認証状態をクリア
        this.clearAuth();
        throw error;
      }
    }

    return this.authState.tokens!.access_token;
  }

  /**
   * トークンが有効かどうかをチェック
   */
  isTokenValid(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = this.authState.expiresAt || 0;

    return now < expiresAt;
  }

  /**
   * アクセストークンを取得（期限切れの場合はnullを返す）
   */
  getCurrentAccessToken(): string | null {
    if (!this.isTokenValid()) {
      return null;
    }
    return this.authState.tokens!.access_token;
  }

  /**
   * トークンをファイルに保存（暗号化）
   */
  private saveTokensToFile(): void {
    try {
      if (this.authState.isAuthenticated && this.authState.tokens) {
        const tokenData = {
          tokens: this.authState.tokens,
          expiresAt: this.authState.expiresAt,
          savedAt: Date.now(),
        };

        // トークンデータを暗号化
        const encryptedData = tokenEncryption.encrypt(JSON.stringify(tokenData));
        fs.writeFileSync(this.tokenFilePath, encryptedData);

        SecurityAuditor.log('tokens_saved', 'low', {
          tokenFilePath: this.tokenFilePath,
          expiresAt: this.authState.expiresAt
        });
      }
    } catch (error) {
      SecurityAuditor.log('token_save_failed', 'medium', { error: error instanceof Error ? error.message : 'Unknown error' });
      console.warn('Failed to save tokens to file:', error);
    }
  }

  /**
   * ファイルからトークンを読み込み（復号化）
   */
  private loadTokensFromFile(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const encryptedData = fs.readFileSync(this.tokenFilePath, 'utf8');

        let tokenData;
        try {
          // 暗号化されたデータかチェック
          if (tokenEncryption.isEncrypted(encryptedData)) {
            const decryptedData = tokenEncryption.decrypt(encryptedData);
            tokenData = JSON.parse(decryptedData);
          } else {
            // 古い形式（非暗号化）の場合
            tokenData = JSON.parse(encryptedData);
            // 次回保存時に暗号化される
          }
        } catch (decryptError) {
          SecurityAuditor.log('token_decrypt_failed', 'high', {
            error: decryptError instanceof Error ? decryptError.message : 'Unknown error'
          });
          throw decryptError;
        }

        // トークンの有効期限をチェック
        const now = Math.floor(Date.now() / 1000);
        if (tokenData.expiresAt && now < tokenData.expiresAt) {
          this.authState = {
            isAuthenticated: true,
            tokens: tokenData.tokens,
            expiresAt: tokenData.expiresAt,
          };

          SecurityAuditor.log('tokens_loaded', 'low', {
            expiresAt: tokenData.expiresAt,
            remainingTime: tokenData.expiresAt - now
          });
        } else {
          // 期限切れの場合はファイルを削除
          SecurityAuditor.log('tokens_expired', 'low', { expiresAt: tokenData.expiresAt });
          this.deleteTokenFile();
        }
      }
    } catch (error) {
      SecurityAuditor.log('token_load_failed', 'medium', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.warn('Failed to load tokens from file:', error);
      this.deleteTokenFile();
    }
  }

  /**
   * トークンファイルを削除
   */
  private deleteTokenFile(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
      }
    } catch (error) {
      console.warn('Failed to delete token file:', error);
    }
  }

  /**
   * トークンを設定（オーバーライド）
   */
  setTokens(tokens: OAuthTokens): void {
    this.authState = {
      isAuthenticated: true,
      tokens,
      expiresAt: tokens.created_at + tokens.expires_in,
    };
    this.saveTokensToFile();
  }

  /**
   * 認証状態をクリア（オーバーライド）
   */
  clearAuth(): void {
    this.authState = { isAuthenticated: false };
    this.deleteTokenFile();
  }
}
