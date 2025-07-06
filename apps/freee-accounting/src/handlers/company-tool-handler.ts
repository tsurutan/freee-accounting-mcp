/**
 * 事業所関連ツールハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseToolHandler, ToolInfo } from './base-tool-handler.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { FreeeApiClient } from '../infrastructure/freee-api-client.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 事業所関連ツールハンドラー
 */
@injectable()
export class CompanyToolHandler extends BaseToolHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.Validator) validator: any,
    @inject(TYPES.AppConfig) private readonly appConfig: AppConfig,
    @inject(TYPES.FreeeClient) private readonly freeeClient: FreeeApiClient
  ) {
    super(authService, responseBuilder, errorHandler, logger, validator);
  }

  /**
   * 処理可能なツール情報を返す
   */
  getToolInfo(): ToolInfo[] {
    return [
      {
        name: 'get-companies',
        description: '利用可能な事業所一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-current-company',
        description: '現在選択されている事業所の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-account-items',
        description: '勘定科目一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            base_date: {
              type: 'string',
              description: '基準日（YYYY-MM-DD形式、オプション）',
            },
          },
        },
      },
      {
        name: 'get-partners',
        description: '取引先一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '取得件数（デフォルト: 100）',
            },
            offset: {
              type: 'number',
              description: 'オフセット（デフォルト: 0）',
            },
          },
        },
      },
      {
        name: 'get-sections',
        description: '部門一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-items',
        description: '品目一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: '取得件数（デフォルト: 100）',
            },
            offset: {
              type: 'number',
              description: 'オフセット（デフォルト: 0）',
            },
          },
        },
      },
      {
        name: 'get-tags',
        description: 'メモタグ一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  /**
   * ハンドラーの名前を取得
   */
  getName(): string {
    return 'CompanyToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の会社情報、勘定科目、取引先などの基本データを管理するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'get-companies',
      'get-current-company',
      'get-account-items',
      'get-partners',
      'get-sections',
      'get-items',
      'get-tags'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'get-companies':
        return this.getCompanies();

      case 'get-current-company':
        return this.getCurrentCompany();

      case 'get-account-items':
        return this.getAccountItems(args);

      case 'get-partners':
        return this.getPartners(args);

      case 'get-sections':
        return this.getSections();

      case 'get-items':
        return this.getItems(args);

      case 'get-tags':
        return this.getTags();

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * 事業所一覧を取得
   */
  private async getCompanies(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting companies list');

      const response = await this.freeeClient.getCompanies();
      const companies = response.companies;

      const message = this.responseBuilder.formatCompaniesResponse(companies, this.appConfig.companyId);

      this.logger.info('Companies retrieved successfully', {
        count: companies.length,
        currentCompanyId: this.appConfig.companyId
      });

      return this.createSuccessResult({
        companies,
        current_company_id: this.appConfig.companyId,
      }, message);
    }, 'getCompanies');
  }

  /**
   * 現在の事業所情報を取得
   */
  private async getCurrentCompany(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting current company info');

      const companyId = this.appConfig.companyId;
      const response = await this.freeeClient.get(`/api/1/companies/${companyId}`);
      if (response.isErr()) {
        throw response.error;
      }
      const company = response.value.data;

      this.logger.info('Current company retrieved successfully', {
        companyId,
        companyName: company?.name
      });

      return this.createSuccessResult(
        company,
        `現在の事業所情報:\n\n${JSON.stringify(company, null, 2)}`
      );
    }, 'getCurrentCompany');
  }

  /**
   * 勘定科目一覧を取得
   */
  private async getAccountItems(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting account items', { args });

      const companyId = this.appConfig.companyId;
      let url = `/api/1/account_items?company_id=${companyId}`;

      if (args.base_date) {
        const dateValidation = this.validator.validateDateString(args.base_date);
        if (dateValidation.isErr()) {
          return this.createErrorResult(dateValidation.error);
        }
        url += `&base_date=${args.base_date}`;
      }

      const response = await this.freeeClient.get(url);
      if (response.isErr()) {
        throw response.error;
      }
      const accountItems = response.value.data;

      this.logger.info('Account items retrieved successfully', {
        count: accountItems?.account_items?.length || 0
      });

      return this.createSuccessResult(
        accountItems,
        `勘定科目一覧を取得しました。\n件数: ${accountItems?.account_items?.length || 0}件\n\n${JSON.stringify(accountItems, null, 2)}`
      );
    }, 'getAccountItems');
  }

  /**
   * 取引先一覧を取得
   */
  private async getPartners(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting partners', { args });

      const companyId = this.appConfig.companyId;
      const limit = args.limit || 100;
      const offset = args.offset || 0;

      const response = await this.freeeClient.get(
        `/api/1/partners?company_id=${companyId}&limit=${limit}&offset=${offset}`
      );
      if (response.isErr()) {
        throw response.error;
      }
      const partners = response.value.data;

      this.logger.info('Partners retrieved successfully', {
        count: partners?.partners?.length || 0,
        limit,
        offset
      });

      return this.createSuccessResult(
        partners,
        `取引先一覧を取得しました。\n件数: ${partners?.partners?.length || 0}件\n\n${JSON.stringify(partners, null, 2)}`
      );
    }, 'getPartners');
  }

  /**
   * 部門一覧を取得
   */
  private async getSections(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting sections');

      const companyId = this.appConfig.companyId;
      const response = await this.freeeClient.get(`/api/1/sections?company_id=${companyId}`);
      if (response.isErr()) {
        throw response.error;
      }
      const sections = response.value.data;

      this.logger.info('Sections retrieved successfully', {
        count: sections?.sections?.length || 0
      });

      return this.createSuccessResult(
        sections,
        `部門一覧を取得しました。\n件数: ${sections?.sections?.length || 0}件\n\n${JSON.stringify(sections, null, 2)}`
      );
    }, 'getSections');
  }

  /**
   * 品目一覧を取得
   */
  private async getItems(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting items', { args });

      const companyId = this.appConfig.companyId;
      const limit = args.limit || 100;
      const offset = args.offset || 0;

      const response = await this.freeeClient.get(
        `/api/1/items?company_id=${companyId}&limit=${limit}&offset=${offset}`
      );
      if (response.isErr()) {
        throw response.error;
      }
      const items = response.value.data;

      this.logger.info('Items retrieved successfully', {
        count: items?.items?.length || 0,
        limit,
        offset
      });

      return this.createSuccessResult(
        items,
        `品目一覧を取得しました。\n件数: ${items?.items?.length || 0}件\n\n${JSON.stringify(items, null, 2)}`
      );
    }, 'getItems');
  }

  /**
   * メモタグ一覧を取得
   */
  private async getTags(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting tags');

      const companyId = this.appConfig.companyId;
      const response = await this.freeeClient.get(`/api/1/tags?company_id=${companyId}`);
      if (response.isErr()) {
        throw response.error;
      }
      const tags = response.value.data;

      this.logger.info('Tags retrieved successfully', {
        count: tags?.tags?.length || 0
      });

      return this.createSuccessResult(
        tags,
        `メモタグ一覧を取得しました。\n件数: ${tags?.tags?.length || 0}件\n\n${JSON.stringify(tags, null, 2)}`
      );
    }, 'getTags');
  }
}
