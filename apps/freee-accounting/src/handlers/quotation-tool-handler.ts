/**
 * 見積書関連ツールハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseToolHandler, ToolInfo } from './base-tool-handler.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { FreeeApiClient } from '../infrastructure/freee-api-client.js';
import { DateUtils } from '../utils/date-utils.js';
import { CreateQuotationDto, UpdateQuotationDto, GetQuotationsDto } from '../utils/validator.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 見積書関連ツールハンドラー
 */
@injectable()
export class QuotationToolHandler extends BaseToolHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.Validator) validator: any,
    @inject(TYPES.AppConfig) private readonly appConfig: AppConfig,
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig,
    @inject(TYPES.DateUtils) private readonly dateUtils: DateUtils,
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
        name: 'get-quotations',
        description: '見積書一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            partner_code: {
              type: 'string',
              description: '取引先コード',
            },
            start_issue_date: {
              type: 'string',
              description: '見積日開始（YYYY-MM-DD形式）',
            },
            end_issue_date: {
              type: 'string',
              description: '見積日終了（YYYY-MM-DD形式）',
            },
            quotation_number: {
              type: 'string',
              description: '見積書番号',
            },
            description: {
              type: 'string',
              description: '概要',
            },
            quotation_status: {
              type: 'string',
              enum: ['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued'],
              description: '見積書ステータス',
            },
            limit: {
              type: 'number',
              description: '取得件数（デフォルト: 100, 最大: 1000）',
            },
            offset: {
              type: 'number',
              description: 'オフセット（デフォルト: 0）',
            },
          },
        },
      },
      {
        name: 'get-quotation-details',
        description: '指定した見積書の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            quotation_id: {
              type: 'number',
              description: '見積書ID',
            },
          },
          required: ['quotation_id'],
        },
      },
      {
        name: 'create-quotation',
        description: '新しい見積書を作成します',
        inputSchema: {
          type: 'object',
          properties: {
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            partner_code: {
              type: 'string',
              description: '取引先コード',
            },
            quotation_number: {
              type: 'string',
              description: '見積書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            quotation_date: {
              type: 'string',
              description: '見積日（YYYY-MM-DD形式）',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            quotation_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            quotation_contents: {
              type: 'array',
              description: '見積内容',
              items: {
                type: 'object',
                properties: {
                  order: {
                    type: 'number',
                    description: '順序',
                  },
                  type: {
                    type: 'string',
                    enum: ['normal', 'discount', 'text'],
                    description: '行の種類',
                  },
                  qty: {
                    type: 'number',
                    description: '数量',
                  },
                  unit: {
                    type: 'string',
                    description: '単位',
                  },
                  unit_price: {
                    type: 'number',
                    description: '単価',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  vat: {
                    type: 'number',
                    description: '消費税額',
                  },
                  reduced_vat: {
                    type: 'boolean',
                    description: '軽減税率対象かどうか',
                  },
                  description: {
                    type: 'string',
                    description: '内容',
                  },
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  item_id: {
                    type: 'number',
                    description: '品目ID',
                  },
                  section_id: {
                    type: 'number',
                    description: '部門ID',
                  },
                  tag_ids: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'メモタグID',
                  },
                  segment_1_tag_id: {
                    type: 'number',
                    description: 'セグメント1ID',
                  },
                  segment_2_tag_id: {
                    type: 'number',
                    description: 'セグメント2ID',
                  },
                  segment_3_tag_id: {
                    type: 'number',
                    description: 'セグメント3ID',
                  },
                },
                required: ['order', 'type'],
              },
            },
          },
          required: ['quotation_contents'],
        },
      },
      {
        name: 'update-quotation',
        description: '既存の見積書を更新します',
        inputSchema: {
          type: 'object',
          properties: {
            quotation_id: {
              type: 'number',
              description: '見積書ID',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            partner_code: {
              type: 'string',
              description: '取引先コード',
            },
            quotation_number: {
              type: 'string',
              description: '見積書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            quotation_date: {
              type: 'string',
              description: '見積日（YYYY-MM-DD形式）',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            quotation_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            quotation_contents: {
              type: 'array',
              description: '見積内容',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: '見積内容ID（更新時）',
                  },
                  order: {
                    type: 'number',
                    description: '順序',
                  },
                  type: {
                    type: 'string',
                    enum: ['normal', 'discount', 'text'],
                    description: '行の種類',
                  },
                  qty: {
                    type: 'number',
                    description: '数量',
                  },
                  unit: {
                    type: 'string',
                    description: '単位',
                  },
                  unit_price: {
                    type: 'number',
                    description: '単価',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  vat: {
                    type: 'number',
                    description: '消費税額',
                  },
                  reduced_vat: {
                    type: 'boolean',
                    description: '軽減税率対象かどうか',
                  },
                  description: {
                    type: 'string',
                    description: '内容',
                  },
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  item_id: {
                    type: 'number',
                    description: '品目ID',
                  },
                  section_id: {
                    type: 'number',
                    description: '部門ID',
                  },
                  tag_ids: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'メモタグID',
                  },
                  segment_1_tag_id: {
                    type: 'number',
                    description: 'セグメント1ID',
                  },
                  segment_2_tag_id: {
                    type: 'number',
                    description: 'セグメント2ID',
                  },
                  segment_3_tag_id: {
                    type: 'number',
                    description: 'セグメント3ID',
                  },
                },
                required: ['order', 'type'],
              },
            },
          },
          required: ['quotation_id'],
        },
      },
      {
        name: 'get-quotation-templates',
        description: '見積書テンプレート一覧を取得します',
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
    return 'QuotationToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の見積書データを管理するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'get-quotations',
      'get-quotation-details',
      'create-quotation',
      'update-quotation',
      'get-quotation-templates'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'get-quotations':
        return this.getQuotations(args);

      case 'get-quotation-details':
        return this.getQuotationDetails(args);

      case 'create-quotation':
        return this.createQuotation(args);

      case 'update-quotation':
        return this.updateQuotation(args);

      case 'get-quotation-templates':
        return this.getQuotationTemplates(args);

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * 見積書一覧を取得
   */
  private async getQuotations(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting quotations list', { args });

      // 引数の検証とDTO作成
      const getQuotationsDto = new GetQuotationsDto();
      Object.assign(getQuotationsDto, args);

      const validationResult = await this.validator.validateDto(getQuotationsDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから見積書一覧を取得
      const quotationsResponse = await this.freeeClient.getQuotations({
        company_id: companyId,
        ...args,
        limit: args.limit || this.appConfig.defaultDealsLimit,
        offset: args.offset || 0,
      });

      const message = this.responseBuilder.formatQuotationsResponse(
        quotationsResponse.quotations,
        companyId,
        args
      );

      this.logger.info('Quotations retrieved successfully', {
        companyId,
        quotationsCount: quotationsResponse.quotations.length,
        totalCount: quotationsResponse.meta.total_count,
        filters: args
      });

      return this.createSuccessResult({
        quotations: quotationsResponse.quotations,
        meta: quotationsResponse.meta,
        company_id: companyId,
      }, message);
    }, 'getQuotations');
  }

  /**
   * 見積書詳細を取得
   */
  private async getQuotationDetails(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting quotation details', { quotationId: args.quotation_id });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['quotation_id']);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const quotationId = args.quotation_id;

      // freee APIから見積書詳細を取得
      const quotation = await this.freeeClient.getQuotationDetails(quotationId, companyId);

      this.logger.info('Quotation details retrieved successfully', {
        quotationId,
        quotationNumber: quotation?.quotation_number,
        status: quotation?.quotation_status
      });

      return this.createSuccessResult(quotation, `見積書詳細を取得しました。\n\n${JSON.stringify(quotation, null, 2)}`);
    }, 'getQuotationDetails');
  }

  /**
   * 見積書を作成
   */
  private async createQuotation(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Creating quotation', { args });

      // DTOの作成と検証
      const createQuotationDto = new CreateQuotationDto();
      Object.assign(createQuotationDto, args);

      const validationResult = await this.validator.validateDto(createQuotationDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIで見積書を作成
      const createdQuotation = await this.freeeClient.createQuotation({
        ...createQuotationDto,
        company_id: companyId
      });

      this.logger.info('Quotation created successfully', {
        quotationId: createdQuotation?.id,
        quotationNumber: createdQuotation?.quotation_number,
        status: createdQuotation?.quotation_status
      });

      return this.createSuccessResult(
        createdQuotation,
        `見積書を作成しました。\n見積書ID: ${createdQuotation?.id}\n見積書番号: ${createdQuotation?.quotation_number}\nステータス: ${createdQuotation?.quotation_status}`
      );
    }, 'createQuotation');
  }

  /**
   * 見積書を更新
   */
  private async updateQuotation(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Updating quotation', { quotationId: args.quotation_id });

      // DTOの作成と検証
      const updateQuotationDto = new UpdateQuotationDto();
      Object.assign(updateQuotationDto, args);

      const validationResult = await this.validator.validateDto(updateQuotationDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const quotationId = updateQuotationDto.quotation_id;

      // freee APIで見積書を更新
      const updatedQuotation = await this.freeeClient.updateQuotation(quotationId, {
        ...updateQuotationDto,
        company_id: companyId
      });

      this.logger.info('Quotation updated successfully', {
        quotationId,
        quotationNumber: updatedQuotation?.quotation_number,
        status: updatedQuotation?.quotation_status
      });

      return this.createSuccessResult(
        updatedQuotation,
        `見積書を更新しました。\n見積書ID: ${quotationId}\n見積書番号: ${updatedQuotation?.quotation_number}`
      );
    }, 'updateQuotation');
  }

  /**
   * 見積書テンプレート一覧を取得
   */
  private async getQuotationTemplates(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting quotation templates');

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから見積書テンプレート一覧を取得
      const templatesResponse = await this.freeeClient.getQuotationTemplates(companyId);

      this.logger.info('Quotation templates retrieved successfully', {
        companyId,
        templatesCount: templatesResponse.quotation_templates?.length || 0
      });

      return this.createSuccessResult(
        templatesResponse,
        `見積書テンプレート一覧を取得しました。\n\n${JSON.stringify(templatesResponse, null, 2)}`
      );
    }, 'getQuotationTemplates');
  }
}