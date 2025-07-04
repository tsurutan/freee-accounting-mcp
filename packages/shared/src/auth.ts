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
      baseURL: 'https://accounts.secure.freee.co.jp',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // デバッグ用: axiosリクエスト/レスポンスのログ出力（OAuth認証）
    if (process.env.DEBUG_AXIOS === 'true') {
      // リクエストインターセプター
      this.httpClient.interceptors.request.use(
        (config) => {
          console.error('\n🔐 [OAUTH REQUEST]');
          console.error('URL:', config.url);
          console.error('Method:', config.method?.toUpperCase());
          console.error('Headers:', JSON.stringify(config.headers, null, 2));
          if (config.params) {
            console.error('Params:', JSON.stringify(config.params, null, 2));
          }
          if (config.data) {
            // OAuth認証データは機密情報なので一部マスク
            const maskedData = typeof config.data === 'string'
              ? config.data.replace(/client_secret=[^&]+/g, 'client_secret=***')
                          .replace(/refresh_token=[^&]+/g, 'refresh_token=***')
                          .replace(/code=[^&]+/g, 'code=***')
              : config.data;
            console.error('Data:', maskedData);
          }
          console.error('---');
          return config;
        },
        (error) => {
          console.error('❌ [OAUTH REQUEST ERROR]', error);
          return Promise.reject(error);
        }
      );

      // レスポンスインターセプター
      this.httpClient.interceptors.response.use(
        (response) => {
          console.error('\n🔐 [OAUTH RESPONSE]');
          console.error('Status:', response.status, response.statusText);
          console.error('URL:', response.config?.url);
          console.error('Headers:', JSON.stringify(response.headers, null, 2));

          // OAuth認証レスポンスは機密情報なので一部マスク
          const maskedData = response.data ? {
            ...response.data,
            access_token: response.data.access_token ? '***' + response.data.access_token.slice(-4) : undefined,
            refresh_token: response.data.refresh_token ? '***' + response.data.refresh_token.slice(-4) : undefined,
          } : response.data;
          console.error('Data:', JSON.stringify(maskedData, null, 2));
          console.error('---\n');
          return response;
        },
        (error) => {
          console.error('\n❌ [OAUTH RESPONSE ERROR]');
          console.error('Status:', error.response?.status, error.response?.statusText);
          console.error('URL:', error.config?.url);
          if (error.response?.headers) {
            console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
          }
          if (error.response?.data) {
            console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
          }
          console.error('Message:', error.message);
          console.error('---\n');
          return Promise.reject(error);
        }
      );
    }

    // 保存されたトークンを読み込み
    this.loadTokensFromFile();
  }

  /**
   * 認証URLを生成
   */
  generateAuthUrl(state?: string, enableCompanySelection: boolean = true): string {
    // stateが指定されていない場合はランダムな文字列を生成（CSRF対策）
    const stateValue = state || this.generateRandomState();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: stateValue,
    });

    // 事業所選択機能の制御
    if (enableCompanySelection) {
      params.append('prompt', 'select_company');
    }

    return `https://accounts.secure.freee.co.jp/public_api/authorize?${params.toString()}`;
  }

  /**
   * CSRF対策用のランダムなstate文字列を生成
   */
  private generateRandomState(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
        '/public_api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokens: OAuthTokens = {
        ...response.data,
        created_at: Math.floor(Date.now() / 1000),
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error: any) {
      const errorMessage = this.getDetailedErrorMessage(error, 'Failed to exchange code for tokens');
      throw new FreeeError(
        errorMessage,
        error.response?.status || 500,
        error.response?.data?.errors,
        error,
        error.response?.headers?.['x-request-id']
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
        '/public_api/token',
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokens: OAuthTokens = {
        ...response.data,
        created_at: Math.floor(Date.now() / 1000),
      };

      this.setTokens(tokens);
      return tokens;
    } catch (error: any) {
      const errorMessage = this.getDetailedErrorMessage(error, 'Failed to refresh tokens');
      throw new FreeeError(
        errorMessage,
        error.response?.status || 500,
        error.response?.data?.errors,
        error,
        error.response?.headers?.['x-request-id']
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
   * 認証されている事業所IDを取得
   */
  getCompanyId(): string | null {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return null;
    }
    return this.authState.tokens.company_id || null;
  }

  /**
   * 外部連携IDを取得
   */
  getExternalCid(): string | null {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return null;
    }
    return this.authState.tokens.external_cid || null;
  }

  /**
   * 事業所選択が有効かどうかを判定
   */
  isCompanySelectionEnabled(): boolean {
    return !!this.getCompanyId();
  }

  /**
   * 詳細なエラーメッセージを生成
   */
  private getDetailedErrorMessage(error: any, defaultMessage: string): string {
    if (!error.response) {
      return `${defaultMessage}: ネットワークエラーまたはサーバーに接続できません`;
    }

    const status = error.response.status;
    const data = error.response.data;

    // freee API固有のエラーメッセージ
    if (data?.errors && Array.isArray(data.errors)) {
      const errorMessages = data.errors.map((err: any) => err.message || err.code).join(', ');
      return `${defaultMessage}: ${errorMessages}`;
    }

    // HTTPステータスコード別のメッセージ
    switch (status) {
      case 400:
        return `${defaultMessage}: リクエストパラメータが不正です`;
      case 401:
        return `${defaultMessage}: 認証に失敗しました。クライアントIDまたはシークレットを確認してください`;
      case 403:
        return `${defaultMessage}: アクセス権限がありません`;
      case 404:
        return `${defaultMessage}: 指定されたリソースが見つかりません`;
      case 429:
        return `${defaultMessage}: レート制限に達しました。しばらく待ってから再試行してください`;
      case 500:
        return `${defaultMessage}: freeeサーバーでエラーが発生しました`;
      case 502:
      case 503:
      case 504:
        return `${defaultMessage}: freeeサーバーが一時的に利用できません`;
      default:
        return `${defaultMessage}: HTTPエラー ${status}`;
    }
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
      console.error('Failed to save tokens to file:', error);
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
      console.error('Failed to load tokens from file:', error);
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
      console.error('Failed to delete token file:', error);
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
