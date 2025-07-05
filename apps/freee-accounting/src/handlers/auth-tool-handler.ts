/**
 * 認証関連ツールハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseToolHandler } from './base-tool-handler.js';
import { AppError } from '../utils/error-handler.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { MCPToolInfo } from '../types/mcp.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 認証関連ツールハンドラー
 */
@injectable()
export class AuthToolHandler extends BaseToolHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.Validator) validator: any,
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig
  ) {
    super(authService, responseBuilder, errorHandler, logger, validator);
  }

  /**
   * ハンドラーの名前を取得
   */
  getName(): string {
    return 'AuthToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の認証関連ツールを提供するハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = ['get-auth-url', 'exchange-code', 'get-health'];
    return supportedTools.includes(name);
  }

  /**
   * 認証が必要なツールかどうかを判定
   */
  protected requiresAuthentication(toolName: string): boolean {
    // 認証関連ツールは認証不要
    return false;
  }

  /**
   * 処理可能なツール情報を返す
   */
  getToolInfo(): MCPToolInfo[] {
    return [
      {
        name: 'generate-auth-url',
        description: 'freee OAuth認証URLを生成します（OAuth認証使用時のみ）',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'CSRF保護用のstate パラメータ（オプション）',
            },
            enable_company_selection: {
              type: 'boolean',
              description: '事業所選択を有効にするかどうか（デフォルト: true）',
            },
          },
        },
      },
      {
        name: 'exchange-auth-code',
        description: '認証コードをアクセストークンに交換します（OAuth認証使用時のみ）',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'OAuth認証コード',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'check-auth-status',
        description: '現在の認証状態を確認します（直接トークン認証またはOAuth認証）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'generate-auth-url':
        return this.generateAuthUrl(args);

      case 'exchange-auth-code':
        return this.exchangeAuthCode(args);

      case 'check-auth-status':
        return this.checkAuthStatus();

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * OAuth認証URLを生成
   */
  private async generateAuthUrl(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Generating OAuth auth URL', { args });

      const state = args?.state as string | undefined;
      const enableCompanySelection = args?.enable_company_selection !== false; // デフォルトtrue

      const redirectUri = this.envConfig.oauthConfig?.redirectUri || 'urn:ietf:wg:oauth:2.0:oob';
      const authUrlResult = this.authService.generateAuthUrl(redirectUri, state);

      if (authUrlResult.isErr()) {
        return this.createErrorResult(authUrlResult.error);
      }

      const authUrl = authUrlResult.value;
      const companySelectionNote = enableCompanySelection
        ? '\n\n※ 事業所選択が有効になっています。認証時に事業所を選択してください。'
        : '\n\n※ 事業所選択が無効になっています。全ての事業所にアクセス可能になります。';

      const message = `認証URL: ${authUrl}\n\nこのURLにアクセスしてfreeeアカウントで認証を行ってください。${companySelectionNote}`;

      this.logger.info('OAuth auth URL generated successfully', {
        enableCompanySelection,
        hasState: !!state
      });

      return this.createSuccessResult({ authUrl, enableCompanySelection }, message);
    }, 'generateAuthUrl');
  }

  /**
   * 認証コードをアクセストークンに交換
   */
  private async exchangeAuthCode(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Exchanging auth code for tokens');

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['code']);
      if (validationResult.isErr()) {
        return this.createErrorResult(validationResult.error);
      }

      const code = args.code as string;
      const tokensResult = await this.authService.exchangeAuthCode(code);

      if (tokensResult.isErr()) {
        return this.createErrorResult(tokensResult.error);
      }

      const tokens = tokensResult.value;

      // 事業所情報を含む詳細な認証完了メッセージ
      let message = `認証が完了しました。\nアクセストークンの有効期限: ${new Date((tokens.created_at + tokens.expires_in) * 1000).toLocaleString()}`;

      if (tokens.company_id) {
        message += `\n選択された事業所ID: ${tokens.company_id}`;
      }

      if (tokens.external_cid) {
        message += `\n外部連携ID: ${tokens.external_cid}`;
      }

      message += `\nスコープ: ${tokens.scope}`;

      this.logger.info('Auth code exchange completed successfully', {
        companyId: tokens.company_id,
        externalCid: tokens.external_cid,
        scope: tokens.scope
      });

      return this.createSuccessResult(tokens, message);
    }, 'exchangeAuthCode');
  }

  /**
   * 認証状態を確認
   */
  private async checkAuthStatus(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Checking authentication status');

      const authDetailsResult = this.authService.getAuthDetails();

      if (authDetailsResult.isErr()) {
        // 認証エラーの場合でも、状態情報として返す
        const summary = this.authService.getAuthSummary();
        return this.createSuccessResult(
          {
            isAuthenticated: false,
            error: authDetailsResult.error.message,
            authMode: 'none'
          },
          summary
        );
      }

      const authState = authDetailsResult.value;
      const summary = this.authService.getAuthSummary();

      this.logger.info('Auth status retrieved successfully', {
        isAuthenticated: authState.isAuthenticated,
        authMode: authState.authMode
      });

      return this.createSuccessResult(authState, summary);
    }, 'checkAuthStatus');
  }

  /**
   * トークンの有効期限をチェック
   */
  async checkTokenExpiry(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Checking token expiry');

      const expiryResult = this.authService.checkTokenExpiry();

      if (expiryResult.isErr()) {
        return this.createErrorResult(expiryResult.error);
      }

      const expiryInfo = expiryResult.value;
      let message = `トークン有効性: ${expiryInfo.isValid ? '有効' : '無効'}`;

      if (expiryInfo.expiresIn !== undefined) {
        const hours = Math.floor(expiryInfo.expiresIn / 3600);
        const minutes = Math.floor((expiryInfo.expiresIn % 3600) / 60);
        message += `\n残り時間: ${hours}時間${minutes}分`;
      }

      return this.createSuccessResult(expiryInfo, message);
    }, 'checkTokenExpiry');
  }

  /**
   * 認証設定の概要を取得
   */
  async getAuthConfigSummary(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Getting auth config summary');

      const summary = this.envConfig.getSummary();
      const validation = this.envConfig.validate();

      const data = {
        ...summary,
        isValid: validation.isOk(),
        validationError: validation.isErr() ? validation.error.message : null,
      };

      return this.createSuccessResult(data, JSON.stringify(data, null, 2));
    }, 'getAuthConfigSummary');
  }
}
