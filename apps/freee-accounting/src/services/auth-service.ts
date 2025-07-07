/**
 * 認証サービス
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig, AuthError } from '../config/environment-config.js';
import { Logger } from '../infrastructure/logger.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { IAuthService, ServiceHealthStatus } from '../interfaces/service.js';
import { OAuthTokenResponse, AuthContext } from '../types/api.js';
import { OAuthTokens } from '@mcp-server/types';

/**
 * 認証状態の型定義
 */
export interface AuthState {
  isAuthenticated: boolean;
  authMode: 'oauth' | 'none';
  expiresAt?: number;
  companyId?: string | number;
  externalCid?: string;
  scope?: string;
  tokens?: any;
}

/**
 * 認証結果の型定義
 */
export interface AuthResult {
  isAuthenticated: boolean;
  errorMessage?: string;
}

/**
 * 認証サービスクラス
 */
@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig,
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.ErrorHandler) private readonly errorHandler: ErrorHandler
  ) {}

  /**
   * サービスの名前を取得
   */
  getName(): string {
    return 'AuthService';
  }

  /**
   * サービスの説明を取得
   */
  getDescription(): string {
    return 'freee会計の認証機能を提供するサービス';
  }

  /**
   * サービスの健全性をチェック
   */
  async healthCheck(): Promise<Result<ServiceHealthStatus, AppError>> {
    try {
      const authState = this.checkAuthenticationStatus();
      const status: ServiceHealthStatus = {
        status: authState.isOk() ? 'healthy' : 'degraded',
        message: authState.isOk() ? '認証サービスは正常です' : '認証に問題があります',
        details: {
          authMode: this.envConfig.authMode,
          hasClientId: this.envConfig.hasClientId,
        },
        timestamp: new Date(),
      };
      return ok(status);
    } catch (error) {
      return err(this.errorHandler.systemError('認証サービスのヘルスチェックに失敗しました', error));
    }
  }

  /**
   * サービスの統計情報を取得
   */
  async getStats(): Promise<any> {
    return {
      totalRequests: 0, // 実装時に追加
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastRequestAt: null,
    };
  }

  /**
   * 認証状態をチェック
   */
  checkAuthenticationStatus(): Result<AuthState, AppError> {
    this.logger.debug('Checking authentication status');

    // OAuth設定の詳細チェック
    if (!this.envConfig.useOAuth) {
      const authError = this.errorHandler.authError(
        'OAuth認証が無効です。環境変数を確認してください:\n' +
        '1. .envファイルを作成 (例: .env.exampleを参考)\n' +
        '2. FREEE_CLIENT_ID=your_client_id\n' +
        '3. FREEE_CLIENT_SECRET=your_client_secret\n' +
        '4. FREEE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob'
      );
      this.logger.error('OAuth not configured - missing environment variables');
      return err(authError);
    }

    if (!this.envConfig.oauthClient) {
      const authError = this.errorHandler.authError(
        'OAuthクライアントの初期化に失敗しました。環境変数を確認してください:\n' +
        '- FREEE_CLIENT_ID: ' + (process.env.FREEE_CLIENT_ID ? '✓ 設定済み' : '❌ 未設定') + '\n' +
        '- FREEE_CLIENT_SECRET: ' + (process.env.FREEE_CLIENT_SECRET ? '✓ 設定済み' : '❌ 未設定') + '\n' +
        '- FREEE_REDIRECT_URI: ' + (process.env.FREEE_REDIRECT_URI ? '✓ 設定済み' : '❌ 未設定')
      );
      this.logger.error('OAuth client initialization failed', {
        hasClientId: !!process.env.FREEE_CLIENT_ID,
        hasClientSecret: !!process.env.FREEE_CLIENT_SECRET,
        hasRedirectUri: !!process.env.FREEE_REDIRECT_URI
      });
      return err(authError);
    }

    // OAuth認証の場合
    const authState = this.envConfig.oauthClient.getAuthState();

    if (!authState.isAuthenticated) {
      const authError = this.errorHandler.authError(
        'OAuth認証が必要です。以下の手順で認証を開始してください:\n' +
        '1. generate-auth-url ツールを実行\n' +
        '2. 表示されたURLをブラウザで開く\n' +
        '3. freeeアカウントでログイン\n' +
        '4. 認証コードを取得\n' +
        '5. exchange-auth-code ツールで認証コードを設定'
      );
      this.logger.warn('OAuth authentication required');
      return err(authError);
    }

    this.logger.info('OAuth authentication successful', {
      companyId: this.envConfig.oauthClient.getCompanyId(),
      externalCid: this.envConfig.oauthClient.getExternalCid(),
    });

    return ok({
      isAuthenticated: true,
      authMode: 'oauth',
      expiresAt: authState.expiresAt,
      companyId: this.envConfig.oauthClient.getCompanyId() || undefined,
      externalCid: this.envConfig.oauthClient.getExternalCid(),
      scope: authState.tokens?.scope,
      tokens: authState.tokens,
    } as AuthState);
  }

  /**
   * 認証が必要かどうかをチェック（簡易版）
   */
  isAuthenticationRequired(): boolean {
    const result = this.checkAuthenticationStatus();
    return result.isErr();
  }

  /**
   * OAuth認証URLを生成
   */
  generateAuthUrl(redirectUri: string, state?: string): Result<string, AppError> {
    if (!this.envConfig.useOAuth || !this.envConfig.oauthClient) {
      const error = this.errorHandler.authError(
        'OAuth認証が設定されていません。'
      );
      this.logger.warn('OAuth not configured for auth URL generation');
      return err(error);
    }

    try {
      // enableCompanySelectionはデフォルトでtrueに設定
      const authUrl = this.envConfig.oauthClient.generateAuthUrl(state, true);
      this.logger.info('OAuth auth URL generated', {
        redirectUri,
        state: state ? 'provided' : 'none'
      });
      return ok(authUrl);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Failed to generate OAuth auth URL', { error });
      return err(appError);
    }
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  async exchangeAuthCode(code: string): Promise<Result<any, AppError>> {
    if (!this.envConfig.useOAuth || !this.envConfig.oauthClient) {
      const error = this.errorHandler.authError(
        'OAuth認証が設定されていません。'
      );
      this.logger.warn('OAuth not configured for token exchange');
      return err(error);
    }

    if (!code) {
      const error = this.errorHandler.validationError('認証コードが必要です', 'code');
      this.logger.warn('Auth code exchange attempted without code');
      return err(error);
    }

    try {
      this.logger.info('Exchanging auth code for tokens');
      const tokens = await this.envConfig.oauthClient.exchangeCodeForTokens(code);

      this.logger.info('Auth code exchange successful', {
        companyId: tokens.company_id,
        externalCid: tokens.external_cid,
        scope: tokens.scope,
        expiresIn: tokens.expires_in,
      });

      return ok(tokens);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Auth code exchange failed', { error });
      return err(appError);
    }
  }

  /**
   * 認証状態の詳細情報を取得
   */
  getAuthDetails(): Result<AuthState, AppError> {
    const authResult = this.checkAuthenticationStatus();

    if (authResult.isErr()) {
      return authResult;
    }

    const authState = authResult.value;

    // OAuth認証の場合、追加情報を取得
    if (authState.authMode === 'oauth' && this.envConfig.oauthClient) {
      const oauthState = this.envConfig.oauthClient.getAuthState();

      return ok({
        ...authState,
        expiresAt: oauthState.expiresAt,
        companyId: this.envConfig.oauthClient.getCompanyId() || undefined,
        externalCid: this.envConfig.oauthClient.getExternalCid(),
        scope: oauthState.tokens?.scope,
        tokens: oauthState.tokens,
      } as AuthState);
    }

    return ok(authState);
  }

  /**
   * 認証状態のサマリーを取得
   */
  getAuthSummary(): string {
    const authResult = this.checkAuthenticationStatus();

    if (authResult.isErr()) {
      return `未認証: ${authResult.error.message}`;
    }

    const authState = authResult.value;

    switch (authState.authMode) {
      case 'oauth':
        let summary = '認証済み（OAuth認証）';

        if (authState.expiresAt) {
          const expiresAt = new Date(authState.expiresAt * 1000).toLocaleString();
          summary += `\nトークン有効期限: ${expiresAt}`;
        }

        if (authState.companyId) {
          summary += `\n認証済み事業所ID: ${authState.companyId}`;
        }

        if (authState.externalCid) {
          summary += `\n外部連携ID: ${authState.externalCid}`;
        }

        if (authState.scope) {
          summary += `\nスコープ: ${authState.scope}`;
        }

        if (this.envConfig.oauthClient) {
          summary += `\n事業所選択: ${this.envConfig.oauthClient.isCompanySelectionEnabled() ? '有効' : '無効'}`;
        }

        return summary;

      default:
        return '認証設定が不正です。OAuth設定を設定してください。';
    }
  }

  /**
   * トークンの有効期限をチェック
   */
  checkTokenExpiry(): Result<{ isValid: boolean; expiresIn?: number }, AppError> {
    const authResult = this.checkAuthenticationStatus();

    if (authResult.isErr()) {
      return err(authResult.error);
    }

    const authState = authResult.value;

    if (authState.authMode === 'oauth' && authState.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = authState.expiresAt - now;

      return ok({
        isValid: expiresIn > 0,
        expiresIn: Math.max(0, expiresIn),
      });
    }

    return ok({ isValid: true });
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<Result<OAuthTokens, AppError>> {
    if (!this.envConfig.useOAuth || !this.envConfig.oauthClient) {
      return err(this.errorHandler.authError('OAuth認証が設定されていません'));
    }

    try {
      const tokenResponse = await this.envConfig.oauthClient.exchangeCodeForTokens(code);
      this.logger.info('Token exchange successful');
      return ok(tokenResponse);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Token exchange failed', { error });
      return err(appError);
    }
  }

  /**
   * リフレッシュトークンでアクセストークンを更新
   */
  async refreshToken(refreshToken: string): Promise<Result<OAuthTokens, AppError>> {
    if (!this.envConfig.useOAuth || !this.envConfig.oauthClient) {
      return err(this.errorHandler.authError('OAuth認証が設定されていません'));
    }

    try {
      const tokenResponse = await this.envConfig.oauthClient.refreshTokens(refreshToken);
      this.logger.info('Token refresh successful');
      return ok(tokenResponse);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Token refresh failed', { error });
      return err(appError);
    }
  }

  /**
   * 現在の認証コンテキストを取得
   */
  getAuthContext(): AuthContext {
    if (this.envConfig.useOAuth && this.envConfig.oauthClient) {
      const authState = this.envConfig.oauthClient.getAuthState();
      return {
        isAuthenticated: authState.isAuthenticated,
        authMode: 'oauth',
        accessToken: authState.tokens?.access_token,
        refreshToken: authState.tokens?.refresh_token,
        expiresAt: authState.expiresAt ? new Date(authState.expiresAt) : undefined,
      };
    }

    return {
      isAuthenticated: false,
      authMode: 'none',
    };
  }

  /**
   * 認証コンテキストを設定
   */
  setAuthContext(context: AuthContext): void {
    // 現在の実装では、環境変数ベースの認証のため、
    // 動的な認証コンテキストの設定はサポートしていません
    this.logger.warn('Dynamic auth context setting is not supported in current implementation');
  }

  /**
   * 認証状態をチェック
   */
  isAuthenticated(): boolean {
    const context = this.getAuthContext();
    return context.isAuthenticated;
  }

  /**
   * トークンの有効性をチェック
   */
  async validateToken(token: string): Promise<Result<boolean, AppError>> {
    try {
      // 簡単なAPI呼び出しでトークンの有効性をチェック
      // 実際の実装では、freee APIの軽量なエンドポイントを呼び出す
      this.logger.info('Token validation not implemented yet');
      return ok(true);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Token validation failed', { error });
      return err(appError);
    }
  }

  /**
   * ログアウト
   */
  async logout(): Promise<Result<void, AppError>> {
    try {
      if (this.envConfig.useOAuth && this.envConfig.oauthClient) {
        // OAuthクライアントの状態をクリア（現在の実装では手動でのクリアはサポートしていません）
        this.logger.info('OAuth state clear not implemented');
      }
      this.logger.info('Logout successful');
      return ok(undefined);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Logout failed', { error });
      return err(appError);
    }
  }

  /**
   * 認証ログを記録
   */
  logAuthEvent(event: string, context?: Record<string, any>): void {
    this.logger.auth(event, undefined, context);
  }
}
