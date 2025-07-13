/**
 * 環境変数の管理と検証
 */

import { injectable } from 'inversify';
import convict from 'convict';
import { Result, ok, err } from 'neverthrow';
import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { FreeeOAuthClient, OAuthConfig } from '../infrastructure/oauth-client.js';


/**
 * 環境変数の型定義
 */
export interface EnvironmentVariables {
  freee: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    baseUrl: string;
    companyId: number;
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
  private readonly config: ReturnType<typeof convict<EnvironmentVariables>>;
  private _oauthClient?: FreeeOAuthClient;

  constructor() {
    // .envファイルを最初に読み込み、convict初期化前に環境変数を設定
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
        companyId: {
          doc: 'freee company ID',
          format: 'int',
          default: 123456,
          env: 'FREEE_COMPANY_ID',
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

    // convictが環境変数を正しく読み込んでいない場合の緊急対処
    if (!this.config.get('freee.clientId') && process.env.FREEE_CLIENT_ID) {
      this.config.set('freee.clientId', process.env.FREEE_CLIENT_ID);
    }
    
    if (!this.config.get('freee.clientSecret') && process.env.FREEE_CLIENT_SECRET) {
      this.config.set('freee.clientSecret', process.env.FREEE_CLIENT_SECRET);
    }
    
    // 設定の検証
    this.config.validate({ allowed: 'strict' });
  }

  /**
   * .envファイルを読み込み（dotenv使用、複数パス対応）
   */
  private loadEnvFile(): void {
    try {
      // srcとdist両方に対応した複数の.envファイルパスを試行
      const envPaths = [
        path.join(process.cwd(), '.env'),
        path.join(__dirname, '../../../.env'),
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../../../../.env'),
        path.join(__dirname, '../../.env'),
        path.resolve(process.cwd(), 'apps/freee-accounting/.env'),
      ];

      for (const envPath of envPaths) {
        if (envPath && fs.existsSync(envPath)) {
          const result = dotenvConfig({ path: envPath });
          if (!result.error) {
            break; // 最初に成功したファイルで終了
          }
        }
      }
    } catch (error) {
      // .envファイル読み込みエラーは無視（環境変数があれば動作する）
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
   * 事業所IDを取得
   */
  get companyId(): number {
    return this.config.get('freee.companyId');
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
