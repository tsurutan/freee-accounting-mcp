/**
 * 認証サービス
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig, AuthError } from '../config/environment-config.js';
import { Logger } from '../infrastructure/logger.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';

/**
 * 認証状態の型定義
 */
export interface AuthState {
  isAuthenticated: boolean;
  authMode: 'direct_token' | 'oauth' | 'none';
  expiresAt?: number;
  companyId?: number;
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
export class AuthService {
  constructor(
    @inject(TYPES.EnvironmentConfig) private envConfig: EnvironmentConfig,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler
  ) {}

  /**
   * 認証状態をチェック
   */
  checkAuthenticationStatus(): Result<AuthState, AppError> {
    this.logger.debug('Checking authentication status');

    if (this.envConfig.useDirectToken) {
      // 直接トークン認証の場合
      const validation = this.envConfig.validate();
      if (validation.isErr()) {
        const authError = this.errorHandler.authError(validation.error.message);
        this.logger.warn('Direct token authentication failed', { error: validation.error });
        return err(authError);
      }

      this.logger.info('Direct token authentication successful');
      return ok({
        isAuthenticated: true,
        authMode: 'direct_token',
      });
    }

    if (this.envConfig.useOAuth && this.envConfig.oauthClient) {
      // OAuth認証の場合
      const authState = this.envConfig.oauthClient.getAuthState();
      
      if (!authState.isAuthenticated) {
        const authError = this.errorHandler.authError(
          'OAuth認証が必要です。generate-auth-url ツールを使用して認証を開始してください'
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
        companyId: this.envConfig.oauthClient.getCompanyId(),
        externalCid: this.envConfig.oauthClient.getExternalCid(),
        scope: authState.tokens?.scope,
        tokens: authState.tokens,
      });
    }

    // 認証設定が不正
    const authError = this.errorHandler.authError(
      'FREEE_ACCESS_TOKEN または OAuth設定（FREEE_CLIENT_ID, FREEE_CLIENT_SECRET）を設定してください'
    );
    this.logger.error('Authentication configuration is invalid');
    return err(authError);
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
  generateAuthUrl(state?: string, enableCompanySelection: boolean = true): Result<string, AppError> {
    if (!this.envConfig.useOAuth || !this.envConfig.oauthClient) {
      const error = this.errorHandler.authError(
        'OAuth認証が設定されていません。FREEE_ACCESS_TOKENを使用している場合、このツールは不要です。'
      );
      this.logger.warn('OAuth not configured for auth URL generation');
      return err(error);
    }

    try {
      const authUrl = this.envConfig.oauthClient.generateAuthUrl(state, enableCompanySelection);
      this.logger.info('OAuth auth URL generated', { 
        enableCompanySelection,
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
        'OAuth認証が設定されていません。FREEE_ACCESS_TOKENを使用している場合、このツールは不要です。'
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
        companyId: this.envConfig.oauthClient.getCompanyId(),
        externalCid: this.envConfig.oauthClient.getExternalCid(),
        scope: oauthState.tokens?.scope,
        tokens: oauthState.tokens,
      });
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
      case 'direct_token':
        return '認証済み（直接トークン認証）\n認証方式: ACCESS_TOKEN';
      
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
        return '認証設定が不正です。FREEE_ACCESS_TOKEN または OAuth設定を設定してください。';
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

    if (authState.authMode === 'direct_token') {
      // 直接トークンの場合、有効期限は不明
      return ok({ isValid: true });
    }

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
   * 認証ログを記録
   */
  logAuthEvent(event: string, context?: Record<string, any>): void {
    this.logger.auth(event, undefined, context);
  }
}
