/**
 * 請求書関連ツールハンドラー
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
import { CreateInvoiceDto, UpdateInvoiceDto, GetInvoicesDto } from '../utils/validator.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 請求書関連ツールハンドラー
 */
@injectable()
export class InvoiceToolHandler extends BaseToolHandler {
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
        name: 'get-invoices',
        description: '請求書一覧を取得します',
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
              description: '請求日開始（YYYY-MM-DD形式）',
            },
            end_issue_date: {
              type: 'string',
              description: '請求日終了（YYYY-MM-DD形式）',
            },
            start_due_date: {
              type: 'string',
              description: '期日開始（YYYY-MM-DD形式）',
            },
            end_due_date: {
              type: 'string',
              description: '期日終了（YYYY-MM-DD形式）',
            },
            invoice_number: {
              type: 'string',
              description: '請求書番号',
            },
            description: {
              type: 'string',
              description: '概要',
            },
            invoice_status: {
              type: 'string',
              enum: ['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued', 'sending', 'sent', 'delivered', 'paid'],
              description: '請求書ステータス',
            },
            payment_status: {
              type: 'string',
              enum: ['unsettled', 'settled'],
              description: '入金ステータス',
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
        name: 'get-invoice-details',
        description: '指定した請求書の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: '請求書ID',
            },
          },
          required: ['invoice_id'],
        },
      },
      {
        name: 'create-invoice',
        description: '新しい請求書を作成します',
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
            invoice_number: {
              type: 'string',
              description: '請求書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            due_date: {
              type: 'string',
              description: '期日（YYYY-MM-DD形式）',
            },
            issue_date: {
              type: 'string',
              description: '請求日（YYYY-MM-DD形式）',
            },
            payment_type: {
              type: 'string',
              enum: ['transfer', 'direct_debit'],
              description: '支払方法',
            },
            use_virtual_transfer_account: {
              type: 'string',
              enum: ['not_use', 'use'],
              description: 'バーチャル口座を利用するか',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            invoice_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'carried_forward_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            invoice_contents: {
              type: 'array',
              description: '請求内容',
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
          required: ['due_date', 'invoice_contents'],
        },
      },
      {
        name: 'update-invoice',
        description: '既存の請求書を更新します',
        inputSchema: {
          type: 'object',
          properties: {
            invoice_id: {
              type: 'number',
              description: '請求書ID',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            partner_code: {
              type: 'string',
              description: '取引先コード',
            },
            invoice_number: {
              type: 'string',
              description: '請求書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            due_date: {
              type: 'string',
              description: '期日（YYYY-MM-DD形式）',
            },
            issue_date: {
              type: 'string',
              description: '請求日（YYYY-MM-DD形式）',
            },
            payment_type: {
              type: 'string',
              enum: ['transfer', 'direct_debit'],
              description: '支払方法',
            },
            use_virtual_transfer_account: {
              type: 'string',
              enum: ['not_use', 'use'],
              description: 'バーチャル口座を利用するか',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            invoice_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'carried_forward_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            invoice_contents: {
              type: 'array',
              description: '請求内容',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: '請求内容ID（更新時）',
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
          required: ['invoice_id'],
        },
      },
      {
        name: 'get-invoice-templates',
        description: '請求書テンプレート一覧を取得します',
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
    return 'InvoiceToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の請求書データを管理するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'get-invoices',
      'get-invoice-details',
      'create-invoice',
      'update-invoice',
      'get-invoice-templates'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'get-invoices':
        return this.getInvoices(args);

      case 'get-invoice-details':
        return this.getInvoiceDetails(args);

      case 'create-invoice':
        return this.createInvoice(args);

      case 'update-invoice':
        return this.updateInvoice(args);

      case 'get-invoice-templates':
        return this.getInvoiceTemplates(args);

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * 請求書一覧を取得
   */
  private async getInvoices(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting invoices list', { args });

      // 引数の検証とDTO作成
      const getInvoicesDto = new GetInvoicesDto();
      Object.assign(getInvoicesDto, args);

      const validationResult = await this.validator.validateDto(getInvoicesDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから請求書一覧を取得
      const invoicesResponse = await this.freeeClient.getInvoices({
        company_id: companyId,
        ...args,
        limit: args.limit || this.appConfig.defaultDealsLimit,
        offset: args.offset || 0,
      });

      const message = this.responseBuilder.formatInvoicesResponse(
        invoicesResponse.invoices,
        companyId,
        args
      );

      this.logger.info('Invoices retrieved successfully', {
        companyId,
        invoicesCount: invoicesResponse.invoices.length,
        totalCount: invoicesResponse.meta.total_count,
        filters: args
      });

      return this.createSuccessResult({
        invoices: invoicesResponse.invoices,
        meta: invoicesResponse.meta,
        company_id: companyId,
      }, message);
    }, 'getInvoices');
  }

  /**
   * 請求書詳細を取得
   */
  private async getInvoiceDetails(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting invoice details', { invoiceId: args.invoice_id });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['invoice_id']);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const invoiceId = args.invoice_id;

      // freee APIから請求書詳細を取得
      const invoice = await this.freeeClient.getInvoiceDetails(invoiceId, companyId);

      this.logger.info('Invoice details retrieved successfully', {
        invoiceId,
        invoiceNumber: invoice?.invoice_number,
        status: invoice?.invoice_status
      });

      return this.createSuccessResult(invoice, `請求書詳細を取得しました。\n\n${JSON.stringify(invoice, null, 2)}`);
    }, 'getInvoiceDetails');
  }

  /**
   * 請求書を作成
   */
  private async createInvoice(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Creating invoice', { args });

      // DTOの作成と検証
      const createInvoiceDto = new CreateInvoiceDto();
      Object.assign(createInvoiceDto, args);

      const validationResult = await this.validator.validateDto(createInvoiceDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIで請求書を作成
      const createdInvoice = await this.freeeClient.createInvoice({
        ...createInvoiceDto,
        company_id: companyId
      });

      this.logger.info('Invoice created successfully', {
        invoiceId: createdInvoice?.id,
        invoiceNumber: createdInvoice?.invoice_number,
        status: createdInvoice?.invoice_status
      });

      return this.createSuccessResult(
        createdInvoice,
        `請求書を作成しました。\n請求書ID: ${createdInvoice?.id}\n請求書番号: ${createdInvoice?.invoice_number}\nステータス: ${createdInvoice?.invoice_status}`
      );
    }, 'createInvoice');
  }

  /**
   * 請求書を更新
   */
  private async updateInvoice(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Updating invoice', { invoiceId: args.invoice_id });

      // DTOの作成と検証
      const updateInvoiceDto = new UpdateInvoiceDto();
      Object.assign(updateInvoiceDto, args);

      const validationResult = await this.validator.validateDto(updateInvoiceDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const invoiceId = updateInvoiceDto.invoice_id;

      // freee APIで請求書を更新
      const updatedInvoice = await this.freeeClient.updateInvoice(invoiceId, {
        ...updateInvoiceDto,
        company_id: companyId
      });

      this.logger.info('Invoice updated successfully', {
        invoiceId,
        invoiceNumber: updatedInvoice?.invoice_number,
        status: updatedInvoice?.invoice_status
      });

      return this.createSuccessResult(
        updatedInvoice,
        `請求書を更新しました。\n請求書ID: ${invoiceId}\n請求書番号: ${updatedInvoice?.invoice_number}`
      );
    }, 'updateInvoice');
  }

  /**
   * 請求書テンプレート一覧を取得
   */
  private async getInvoiceTemplates(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting invoice templates');

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから請求書テンプレート一覧を取得
      const templatesResponse = await this.freeeClient.getInvoiceTemplates(companyId);

      this.logger.info('Invoice templates retrieved successfully', {
        companyId,
        templatesCount: templatesResponse.invoice_templates?.length || 0
      });

      return this.createSuccessResult(
        templatesResponse,
        `請求書テンプレート一覧を取得しました。\n\n${JSON.stringify(templatesResponse, null, 2)}`
      );
    }, 'getInvoiceTemplates');
  }
}