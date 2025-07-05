/**
 * 環境変数の管理と検証
 */

import { injectable } from 'inversify';
import convict from 'convict';
import { Result, ok, err } from 'neverthrow';
import { FreeeOAuthClient } from '@mcp-server/shared';
import { OAuthConfig } from '@mcp-server/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 環境変数の型定義
 */
export interface EnvironmentVariables {
  freee: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl: string;
  };
  debug: {
    freeeApi: boolean;
    axios: boolean;
  };
}

/**
 * 認証エラーの型定義
 */
export type AuthError =
  | { type: 'MISSING_TOKEN'; message: string }
  | { type: 'MISSING_OAUTH_CONFIG'; message: string }
  | { type: 'INVALID_TOKEN'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string };

/**
 * 環境変数設定クラス
 */
@injectable()
export class EnvironmentConfig {
  private config: ReturnType<typeof convict<EnvironmentVariables>>;
  private _oauthClient?: FreeeOAuthClient;

  constructor() {
    // .envファイルを手動で読み込み（MCP Inspector対応）
    this.loadEnvFile();

    // convictスキーマの定義
    this.config = convict({
      freee: {
        clientId: {
          doc: 'freee OAuth client ID',
          format: String,
          default: '',
          env: 'FREEE_CLIENT_ID',
        },
        clientSecret: {
          doc: 'freee OAuth client secret',
          format: String,
          default: '',
          env: 'FREEE_CLIENT_SECRET',
          sensitive: true,
        },
        redirectUri: {
          doc: 'freee OAuth redirect URI',
          format: String,
          default: 'urn:ietf:wg:oauth:2.0:oob',
          env: 'FREEE_REDIRECT_URI',
        },
        baseUrl: {
          doc: 'freee API base URL',
          format: String,
          default: 'https://api.freee.co.jp',
          env: 'FREEE_API_BASE_URL',
        },
      },
      debug: {
        freeeApi: {
          doc: 'Enable freee API debug logging',
          format: Boolean,
          default: false,
          env: 'DEBUG_FREEE_API',
        },
        axios: {
          doc: 'Enable axios debug logging',
          format: Boolean,
          default: false,
          env: 'DEBUG_AXIOS',
        },
      },
    });

    // 設定の検証
    this.config.validate({ allowed: 'strict' });
  }

  /**
   * .envファイルを手動で読み込み
   */
  private loadEnvFile(): void {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=');
              process.env[key] = value;
            }
          }
        });
      }
    } catch (error) {
      // 環境変数読み込みエラーは無視（MCP Inspector使用時）
    }
  }

  /**
   * OAuth認証を使用するかどうか
   */
  get useOAuth(): boolean {
    return !!(this.config.get('freee.clientId') && this.config.get('freee.clientSecret'));
  }

  /**
   * クライアントIDを取得
   */
  get clientId(): string {
    return this.config.get('freee.clientId');
  }

  /**
   * クライアントシークレットを取得
   */
  get clientSecret(): string {
    return this.config.get('freee.clientSecret');
  }

  /**
   * リダイレクトURIを取得
   */
  get redirectUri(): string {
    return this.config.get('freee.redirectUri');
  }

  /**
   * 認証モードを取得
   */
  get authMode(): string {
    return 'oauth';
  }

  /**
   * クライアントIDが設定されているかチェック
   */
  get hasClientId(): boolean {
    return !!this.config.get('freee.clientId');
  }

  /**
   * OAuth設定を取得
   */
  get oauthConfig(): OAuthConfig | undefined {
    if (!this.useOAuth) return undefined;

    return {
      clientId: this.config.get('freee.clientId'),
      clientSecret: this.config.get('freee.clientSecret'),
      redirectUri: this.config.get('freee.redirectUri'),
      baseUrl: this.config.get('freee.baseUrl'),
    };
  }

  /**
   * OAuthクライアントを取得
   */
  get oauthClient(): FreeeOAuthClient | undefined {
    if (!this._oauthClient && this.oauthConfig) {
      this._oauthClient = new FreeeOAuthClient(this.oauthConfig);
    }
    return this._oauthClient;
  }

  /**
   * ベースURLを取得
   */
  get baseUrl(): string {
    return this.config.get('freee.baseUrl');
  }

  /**
   * デバッグ設定を取得
   */
  get debugConfig() {
    return {
      freeeApi: this.config.get('debug.freeeApi'),
      axios: this.config.get('debug.axios'),
    };
  }

  /**
   * デバッグモードかどうかを判定
   */
  isDebugMode(): boolean {
    return this.config.get('debug.freeeApi') || this.config.get('debug.axios');
  }

  /**
   * 環境変数の検証
   */
  validate(): Result<boolean, AuthError> {
    // OAuth設定が部分的に存在するかチェック
    const clientId = this.config.get('freee.clientId');
    const clientSecret = this.config.get('freee.clientSecret');
    
    if (clientId || clientSecret) {
      if (!clientId) {
        return err({
          type: 'MISSING_OAUTH_CONFIG',
          message: 'FREEE_CLIENT_ID が設定されていません'
        });
      }
      if (!clientSecret) {
        return err({
          type: 'MISSING_OAUTH_CONFIG',
          message: 'FREEE_CLIENT_SECRET が設定されていません'
        });
      }
      return ok(true);
    }

    return err({
      type: 'MISSING_OAUTH_CONFIG',
      message: 'OAuth設定（FREEE_CLIENT_ID, FREEE_CLIENT_SECRET）を設定してください'
    });
  }

  /**
   * 設定の概要を取得（デバッグ用）
   */
  getSummary() {
    return {
      authMode: this.useOAuth ? 'oauth' : 'none',
      useOAuth: this.useOAuth,
      hasClientId: !!this.config.get('freee.clientId'),
      hasClientSecret: !!this.config.get('freee.clientSecret'),
      hasOAuthConfig: this.useOAuth,
      baseUrl: this.config.get('freee.baseUrl'),
      redirectUri: this.config.get('freee.redirectUri'),
      debug: this.debugConfig,
    };
  }
}
