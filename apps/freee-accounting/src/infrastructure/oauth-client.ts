/**
 * freee OAuth2.0認証クライアント
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from './logger.js';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
  company_id?: string;
  external_cid?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  company_id?: string;
  external_cid?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens?: OAuthTokens;
  expiresAt?: number;
}

export class FreeeError extends Error {
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    public statusCode: number,
    public errors?: any[],
    public originalError?: Error,
    requestId?: string
  ) {
    super(message);
    this.name = 'FreeeError';
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.retryable = this.isRetryable(statusCode);

    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  private isRetryable(statusCode: number): boolean {
    return [429, 500, 502, 503, 504].includes(statusCode);
  }
}

export class FreeeOAuthClient {
  private config: OAuthConfig;
  private httpClient: AxiosInstance;
  private authState: AuthState = { isAuthenticated: false };
  private tokenFilePath: string;
  private refreshPromise: Promise<OAuthTokens> | null = null;
  private refreshInProgress = false;
  private retryCount = 0;
  private maxRetries = 3;
  private logger: Logger;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.tokenFilePath = path.join(os.homedir(), '.freee-mcp-tokens.json');
    this.logger = new Logger();

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
          const requestData = {
            url: config.url,
            method: config.method?.toUpperCase(),
            headers: config.headers,
            params: config.params,
            data: config.data ? (typeof config.data === 'string'
              ? config.data.replace(/client_secret=[^&]+/g, 'client_secret=***')
                          .replace(/refresh_token=[^&]+/g, 'refresh_token=***')
                          .replace(/code=[^&]+/g, 'code=***')
              : config.data) : undefined
          };
          this.logger.debug(`🔐 [OAUTH REQUEST] ${JSON.stringify(requestData)}`);
          return config;
        },
        (error) => {
          this.logger.error(`❌ [OAUTH REQUEST ERROR]: ${error.message}`);
          return Promise.reject(error);
        }
      );

      // レスポンスインターセプター
      this.httpClient.interceptors.response.use(
        (response) => {
          const responseData = {
            status: response.status,
            statusText: response.statusText,
            url: response.config?.url,
            headers: response.headers,
            data: response.data ? {
              ...response.data,
              access_token: response.data.access_token ? '***' + response.data.access_token.slice(-4) : undefined,
              refresh_token: response.data.refresh_token ? '***' + response.data.refresh_token.slice(-4) : undefined,
            } : response.data
          };
          this.logger.debug(`🔐 [OAUTH RESPONSE] ${JSON.stringify(responseData)}`);
          return response;
        },
        (error) => {
          const errorData = {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            headers: error.response?.headers,
            errorData: error.response?.data,
            message: error.message
          };
          this.logger.error(`❌ [OAUTH RESPONSE ERROR] ${JSON.stringify(errorData)}`);
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

      const now = Math.floor(Date.now() / 1000);
      const tokens: OAuthTokens = {
        ...response.data,
        created_at: now,
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

      const now = Math.floor(Date.now() / 1000);
      const tokens: OAuthTokens = {
        ...response.data,
        created_at: now,
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
        await this.refreshTokensSynchronized();
        
        if (!this.isTokenValid()) {
          throw new Error('Token is still invalid after refresh');
        }
      } catch (error) {
        this.handleRefreshError(error);
        throw error;
      }
    }

    return this.authState.tokens!.access_token;
  }

  /**
   * 同期化されたトークンリフレッシュ（並行呼び出し対応）
   */
  private async refreshTokensSynchronized(): Promise<void> {
    if (this.refreshInProgress && this.refreshPromise) {
      await this.refreshPromise;
      return;
    }

    this.refreshInProgress = true;
    
    try {
      this.refreshPromise = this.refreshTokens(this.authState.tokens!.refresh_token);
      await this.refreshPromise;
      this.retryCount = 0;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  /**
   * リフレッシュエラーのハンドリング
   */
  private handleRefreshError(error: any): void {
    this.retryCount++;

    if (this.retryCount >= this.maxRetries || this.isCriticalAuthError(error)) {
      this.clearAuth();
    }
  }

  /**
   * 認証状態をクリアすべき重要なエラーかどうかを判定
   */
  private isCriticalAuthError(error: any): boolean {
    const status = error.response?.status;
    return status === 400 || status === 401 || status === 403;
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
   * トークンをファイルに保存（暗号化なし）
   */
  private saveTokensToFile(): void {
    try {
      if (this.authState.isAuthenticated && this.authState.tokens) {
        const tokenData = {
          tokens: this.authState.tokens,
          expiresAt: this.authState.expiresAt,
          savedAt: Date.now(),
        };

        fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokenData, null, 2));
      }
    } catch (error) {
      this.logger.error(`Failed to save tokens to file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ファイルからトークンを読み込み
   */
  private loadTokensFromFile(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const data = fs.readFileSync(this.tokenFilePath, 'utf8');
        const tokenData = JSON.parse(data);

        // トークンの有効期限をチェック
        const now = Math.floor(Date.now() / 1000);
        if (tokenData.expiresAt && now < tokenData.expiresAt) {
          this.authState = {
            isAuthenticated: true,
            tokens: tokenData.tokens,
            expiresAt: tokenData.expiresAt,
          };
        } else {
          // 期限切れの場合はファイルを削除
          this.deleteTokenFile();
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load tokens from file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      this.logger.error(`Failed to delete token file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * トークンを設定
   */
  setTokens(tokens: OAuthTokens): void {
    const expiresAt = tokens.created_at + tokens.expires_in;
    
    this.authState = {
      isAuthenticated: true,
      tokens,
      expiresAt,
    };
    this.saveTokensToFile();
  }

  /**
   * 認証状態をクリア
   */
  clearAuth(): void {
    this.authState = { isAuthenticated: false };
    this.deleteTokenFile();
  }
}