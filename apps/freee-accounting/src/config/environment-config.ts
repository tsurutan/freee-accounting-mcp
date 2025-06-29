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
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
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
  private config: convict.Config<EnvironmentVariables>;
  private _oauthClient?: FreeeOAuthClient;

  constructor() {
    // .envファイルを手動で読み込み（MCP Inspector対応）
    this.loadEnvFile();

    // convictスキーマの定義
    this.config = convict({
      freee: {
        accessToken: {
          doc: 'freee API access token',
          format: String,
          default: '',
          env: 'FREEE_ACCESS_TOKEN',
          sensitive: true,
        },
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
          default: 'http://localhost:3000/callback',
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
   * 直接トークン認証を使用するかどうか
   */
  get useDirectToken(): boolean {
    return !!this.config.get('freee.accessToken');
  }

  /**
   * OAuth認証を使用するかどうか
   */
  get useOAuth(): boolean {
    return !this.useDirectToken &&
           !!(this.config.get('freee.clientId') && this.config.get('freee.clientSecret'));
  }

  /**
   * アクセストークンを取得
   */
  get accessToken(): string | undefined {
    return this.config.get('freee.accessToken') || undefined;
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
   * デバッグ設定を取得
   */
  get debugConfig() {
    return {
      freeeApi: this.config.get('debug.freeeApi'),
      axios: this.config.get('debug.axios'),
    };
  }

  /**
   * 環境変数の検証
   */
  validate(): Result<boolean, AuthError> {
    if (this.useDirectToken) {
      const token = this.accessToken;
      if (!token || token.length < 10) {
        return err({
          type: 'INVALID_TOKEN',
          message: 'FREEE_ACCESS_TOKEN が短すぎます'
        });
      }
      return ok(true);
    }

    if (this.useOAuth) {
      const config = this.oauthConfig;
      if (!config?.clientId) {
        return err({
          type: 'MISSING_OAUTH_CONFIG',
          message: 'FREEE_CLIENT_ID が設定されていません'
        });
      }
      if (!config?.clientSecret) {
        return err({
          type: 'MISSING_OAUTH_CONFIG',
          message: 'FREEE_CLIENT_SECRET が設定されていません'
        });
      }
      return ok(true);
    }

    return err({
      type: 'MISSING_TOKEN',
      message: 'FREEE_ACCESS_TOKEN または OAuth設定を設定してください'
    });
  }

  /**
   * 設定の概要を取得（デバッグ用）
   */
  getSummary() {
    return {
      authMode: this.useDirectToken ? 'direct_token' : this.useOAuth ? 'oauth' : 'none',
      hasAccessToken: !!this.accessToken,
      hasClientId: !!this.config.get('freee.clientId'),
      hasClientSecret: !!this.config.get('freee.clientSecret'),
      redirectUri: this.config.get('freee.redirectUri'),
      baseUrl: this.config.get('freee.baseUrl'),
      debug: this.debugConfig,
    };
  }
}
