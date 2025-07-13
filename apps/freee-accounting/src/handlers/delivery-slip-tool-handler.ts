/**
 * 納品書関連ツールハンドラー
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
import { CreateDeliverySlipDto, UpdateDeliverySlipDto, GetDeliverySlipsDto } from '../utils/validator.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 納品書関連ツールハンドラー
 */
@injectable()
export class DeliverySlipToolHandler extends BaseToolHandler {
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
        name: 'get-delivery-slips',
        description: '納品書一覧を取得します',
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
              description: '納品日開始（YYYY-MM-DD形式）',
            },
            end_issue_date: {
              type: 'string',
              description: '納品日終了（YYYY-MM-DD形式）',
            },
            delivery_slip_number: {
              type: 'string',
              description: '納品書番号',
            },
            description: {
              type: 'string',
              description: '概要',
            },
            delivery_slip_status: {
              type: 'string',
              enum: ['draft', 'applying', 'remanded', 'rejected', 'approved', 'issued'],
              description: '納品書ステータス',
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
        name: 'get-delivery-slip-details',
        description: '指定した納品書の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            delivery_slip_id: {
              type: 'number',
              description: '納品書ID',
            },
          },
          required: ['delivery_slip_id'],
        },
      },
      {
        name: 'create-delivery-slip',
        description: '新しい納品書を作成します',
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
            delivery_slip_number: {
              type: 'string',
              description: '納品書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            delivery_date: {
              type: 'string',
              description: '納品日（YYYY-MM-DD形式）',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            delivery_slip_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            delivery_slip_contents: {
              type: 'array',
              description: '納品内容',
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
          required: ['delivery_slip_contents'],
        },
      },
      {
        name: 'update-delivery-slip',
        description: '既存の納品書を更新します',
        inputSchema: {
          type: 'object',
          properties: {
            delivery_slip_id: {
              type: 'number',
              description: '納品書ID',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            partner_code: {
              type: 'string',
              description: '取引先コード',
            },
            delivery_slip_number: {
              type: 'string',
              description: '納品書番号',
            },
            title: {
              type: 'string',
              description: 'タイトル',
            },
            delivery_date: {
              type: 'string',
              description: '納品日（YYYY-MM-DD形式）',
            },
            message: {
              type: 'string',
              description: 'メッセージ',
            },
            notes: {
              type: 'string',
              description: '備考',
            },
            delivery_slip_layout: {
              type: 'string',
              enum: ['default_classic', 'standard_classic', 'envelope_classic', 'default_modern', 'standard_modern', 'envelope_modern'],
              description: 'レイアウト',
            },
            tax_entry_method: {
              type: 'string',
              enum: ['inclusive', 'exclusive'],
              description: '税込み/税抜き',
            },
            delivery_slip_contents: {
              type: 'array',
              description: '納品内容',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: '納品内容ID（更新時）',
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
          required: ['delivery_slip_id'],
        },
      },
      {
        name: 'get-delivery-slip-templates',
        description: '納品書テンプレート一覧を取得します',
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
    return 'DeliverySlipToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の納品書データを管理するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'get-delivery-slips',
      'get-delivery-slip-details',
      'create-delivery-slip',
      'update-delivery-slip',
      'get-delivery-slip-templates'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'get-delivery-slips':
        return this.getDeliverySlips(args);

      case 'get-delivery-slip-details':
        return this.getDeliverySlipDetails(args);

      case 'create-delivery-slip':
        return this.createDeliverySlip(args);

      case 'update-delivery-slip':
        return this.updateDeliverySlip(args);

      case 'get-delivery-slip-templates':
        return this.getDeliverySlipTemplates(args);

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * 納品書一覧を取得
   */
  private async getDeliverySlips(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting delivery slips list', { args });

      // 引数の検証とDTO作成
      const getDeliverySlipsDto = new GetDeliverySlipsDto();
      Object.assign(getDeliverySlipsDto, args);

      const validationResult = await this.validator.validateDto(getDeliverySlipsDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから納品書一覧を取得
      const deliverySlipsResponse = await this.freeeClient.getDeliverySlips({
        company_id: companyId,
        ...args,
        limit: args.limit || this.appConfig.defaultDealsLimit,
        offset: args.offset || 0,
      });

      const message = this.responseBuilder.formatDeliverySlipsResponse(
        deliverySlipsResponse.delivery_slips,
        companyId,
        args
      );

      this.logger.info('Delivery slips retrieved successfully', {
        companyId,
        deliverySlipsCount: deliverySlipsResponse.delivery_slips.length,
        totalCount: deliverySlipsResponse.meta.total_count,
        filters: args
      });

      return this.createSuccessResult({
        delivery_slips: deliverySlipsResponse.delivery_slips,
        meta: deliverySlipsResponse.meta,
        company_id: companyId,
      }, message);
    }, 'getDeliverySlips');
  }

  /**
   * 納品書詳細を取得
   */
  private async getDeliverySlipDetails(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting delivery slip details', { deliverySlipId: args.delivery_slip_id });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['delivery_slip_id']);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const deliverySlipId = args.delivery_slip_id;

      // freee APIから納品書詳細を取得
      const deliverySlip = await this.freeeClient.getDeliverySlipDetails(deliverySlipId, companyId);

      this.logger.info('Delivery slip details retrieved successfully', {
        deliverySlipId,
        deliverySlipNumber: deliverySlip?.delivery_slip_number,
        status: deliverySlip?.delivery_slip_status
      });

      return this.createSuccessResult(deliverySlip, `納品書詳細を取得しました。\n\n${JSON.stringify(deliverySlip, null, 2)}`);
    }, 'getDeliverySlipDetails');
  }

  /**
   * 納品書を作成
   */
  private async createDeliverySlip(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Creating delivery slip', { args });

      // DTOの作成と検証
      const createDeliverySlipDto = new CreateDeliverySlipDto();
      Object.assign(createDeliverySlipDto, args);

      const validationResult = await this.validator.validateDto(createDeliverySlipDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIで納品書を作成
      const createdDeliverySlip = await this.freeeClient.createDeliverySlip({
        ...createDeliverySlipDto,
        company_id: companyId
      });

      this.logger.info('Delivery slip created successfully', {
        deliverySlipId: createdDeliverySlip?.id,
        deliverySlipNumber: createdDeliverySlip?.delivery_slip_number,
        status: createdDeliverySlip?.delivery_slip_status
      });

      return this.createSuccessResult(
        createdDeliverySlip,
        `納品書を作成しました。\n納品書ID: ${createdDeliverySlip?.id}\n納品書番号: ${createdDeliverySlip?.delivery_slip_number}\nステータス: ${createdDeliverySlip?.delivery_slip_status}`
      );
    }, 'createDeliverySlip');
  }

  /**
   * 納品書を更新
   */
  private async updateDeliverySlip(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Updating delivery slip', { deliverySlipId: args.delivery_slip_id });

      // DTOの作成と検証
      const updateDeliverySlipDto = new UpdateDeliverySlipDto();
      Object.assign(updateDeliverySlipDto, args);

      const validationResult = await this.validator.validateDto(updateDeliverySlipDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;
      const deliverySlipId = updateDeliverySlipDto.delivery_slip_id;

      // freee APIで納品書を更新
      const updatedDeliverySlip = await this.freeeClient.updateDeliverySlip(deliverySlipId, {
        ...updateDeliverySlipDto,
        company_id: companyId
      });

      this.logger.info('Delivery slip updated successfully', {
        deliverySlipId,
        deliverySlipNumber: updatedDeliverySlip?.delivery_slip_number,
        status: updatedDeliverySlip?.delivery_slip_status
      });

      return this.createSuccessResult(
        updatedDeliverySlip,
        `納品書を更新しました。\n納品書ID: ${deliverySlipId}\n納品書番号: ${updatedDeliverySlip?.delivery_slip_number}`
      );
    }, 'updateDeliverySlip');
  }

  /**
   * 納品書テンプレート一覧を取得
   */
  private async getDeliverySlipTemplates(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting delivery slip templates');

      // 事業所IDを取得（OAuthトークンから、または設定ファイルから）
      const oauthCompanyId = this.envConfig.oauthClient?.getCompanyId();
      const companyId = oauthCompanyId ? parseInt(oauthCompanyId, 10) : this.appConfig.companyId;

      // freee APIから納品書テンプレート一覧を取得
      const templatesResponse = await this.freeeClient.getDeliverySlipTemplates(companyId);

      this.logger.info('Delivery slip templates retrieved successfully', {
        companyId,
        templatesCount: templatesResponse.delivery_slip_templates?.length || 0
      });

      return this.createSuccessResult(
        templatesResponse,
        `納品書テンプレート一覧を取得しました。\n\n${JSON.stringify(templatesResponse, null, 2)}`
      );
    }, 'getDeliverySlipTemplates');
  }
}