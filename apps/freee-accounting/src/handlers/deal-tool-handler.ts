/**
 * 取引関連ツールハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseToolHandler, ToolInfo } from './base-tool-handler.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { FreeeApiClient } from '../infrastructure/freee-api-client.js';
import { DateUtils } from '../utils/date-utils.js';
import { CreateDealDto, UpdateDealDto, GetDealsDto } from '../utils/validator.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * 取引関連ツールハンドラー
 */
@injectable()
export class DealToolHandler extends BaseToolHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.Validator) validator: any,
    @inject(TYPES.AppConfig) private readonly appConfig: AppConfig,
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
        name: 'get-deals',
        description: '取引一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: '開始日（YYYY-MM-DD形式）',
            },
            end_date: {
              type: 'string',
              description: '終了日（YYYY-MM-DD形式）',
            },
            year: {
              type: 'number',
              description: '年（月と組み合わせて使用）',
            },
            month: {
              type: 'number',
              description: '月（年と組み合わせて使用）',
            },
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
        name: 'get-deal-details',
        description: '指定した取引の詳細情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'number',
              description: '取引ID',
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'create-deal',
        description: '新しい取引を作成します',
        inputSchema: {
          type: 'object',
          properties: {
            issue_date: {
              type: 'string',
              description: '取引日（YYYY-MM-DD形式）',
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: '取引タイプ（income: 収入, expense: 支出）',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID（オプション）',
            },
            ref_number: {
              type: 'string',
              description: '管理番号（オプション）',
            },
            details: {
              type: 'array',
              description: '取引明細',
              items: {
                type: 'object',
                properties: {
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  entry_side: {
                    type: 'string',
                    enum: ['credit', 'debit'],
                    description: '貸借（credit: 貸方, debit: 借方）',
                  },
                  description: {
                    type: 'string',
                    description: '備考（オプション）',
                  },
                },
                required: ['account_item_id', 'tax_code', 'amount', 'entry_side'],
              },
            },
          },
          required: ['issue_date', 'type', 'details'],
        },
      },
      {
        name: 'update-deal',
        description: '既存の取引を更新します',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'number',
              description: '取引ID',
            },
            issue_date: {
              type: 'string',
              description: '取引日（YYYY-MM-DD形式）',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID',
            },
            ref_number: {
              type: 'string',
              description: '管理番号',
            },
            details: {
              type: 'array',
              description: '取引明細',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: '明細ID（更新時）',
                  },
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  entry_side: {
                    type: 'string',
                    enum: ['credit', 'debit'],
                    description: '貸借（credit: 貸方, debit: 借方）',
                  },
                  description: {
                    type: 'string',
                    description: '備考',
                  },
                },
                required: ['account_item_id', 'tax_code', 'amount', 'entry_side'],
              },
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'delete-deal',
        description: '取引を削除します',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'number',
              description: '取引ID',
            },
          },
          required: ['deal_id'],
        },
      },
    ];
  }

  /**
   * ハンドラーの名前を取得
   */
  getName(): string {
    return 'DealToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の取引データを管理するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'get-deals',
      'get-deal-details',
      'create-deal',
      'update-deal',
      'delete-deal'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'get-deals':
        return this.getDeals(args);

      case 'get-deal-details':
        return this.getDealDetails(args);

      case 'create-deal':
        return this.createDeal(args);

      case 'update-deal':
        return this.updateDeal(args);

      case 'delete-deal':
        return this.deleteDeal(args);

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * 取引一覧を取得
   */
  private async getDeals(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting deals list', { args });

      // 引数の検証とDTO作成
      const getDealsDto = new GetDealsDto();
      Object.assign(getDealsDto, args);

      const validationResult = await this.validator.validateDto(getDealsDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      const companyId = this.appConfig.companyId;
      let startDate: string;
      let endDate: string;

      // 日付範囲の決定
      if (args.year && args.month) {
        const yearMonthValidation = this.validator.validateYearMonth(args.year, args.month);
        if (yearMonthValidation.isErr()) {
          throw yearMonthValidation.error;
        }
        const dateRange = this.dateUtils.getMonthDateRange(args.year, args.month);
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      } else if (args.start_date && args.end_date) {
        const startValidation = this.validator.validateDateString(args.start_date);
        const endValidation = this.validator.validateDateString(args.end_date);
        if (startValidation.isErr()) throw startValidation.error;
        if (endValidation.isErr()) throw endValidation.error;
        startDate = args.start_date;
        endDate = args.end_date;
      } else {
        // デフォルトは過去30日
        const dateRange = this.dateUtils.getDateRange(this.appConfig.defaultDealsPeriodDays);
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      }

      // freee APIから取引一覧を取得
      const dealsResponse = await this.freeeClient.getDeals({
        company_id: companyId,
        start_issue_date: startDate,
        end_issue_date: endDate,
        limit: args.limit || this.appConfig.defaultDealsLimit,
        offset: args.offset || 0,
      });

      const message = this.responseBuilder.formatDealsResponse(
        dealsResponse.deals,
        companyId,
        { startDate, endDate }
      );

      this.logger.info('Deals retrieved successfully', {
        companyId,
        dealsCount: dealsResponse.deals.length,
        totalCount: dealsResponse.meta.total_count,
        period: { startDate, endDate }
      });

      return this.createSuccessResult({
        deals: dealsResponse.deals,
        meta: dealsResponse.meta,
        period: { startDate, endDate },
        company_id: companyId,
      }, message);
    }, 'getDeals');
  }

  /**
   * 取引詳細を取得
   */
  private async getDealDetails(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting deal details', { dealId: args.deal_id });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['deal_id']);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      const companyId = this.appConfig.companyId;
      const dealId = args.deal_id;

      // freee APIから取引詳細を取得
      const deal = await this.freeeClient.getDealDetails(dealId, companyId);

      this.logger.info('Deal details retrieved successfully', {
        dealId,
        dealType: deal?.type,
        amount: deal?.amount
      });

      return this.createSuccessResult(deal, `取引詳細を取得しました。\n\n${JSON.stringify(deal, null, 2)}`);
    }, 'getDealDetails');
  }

  /**
   * 取引を作成
   */
  private async createDeal(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Creating deal', { args });

      // DTOの作成と検証
      const createDealDto = new CreateDealDto();
      Object.assign(createDealDto, args);

      const validationResult = await this.validator.validateDto(createDealDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 取引明細の貸借バランス検証
      const balanceValidation = this.validator.validateDealBalance(createDealDto.details);
      if (balanceValidation.isErr()) {
        throw balanceValidation.error;
      }

      const companyId = this.appConfig.companyId;

      // freee APIで取引を作成
      const createdDeal = await this.freeeClient.createDeal({
        ...createDealDto,
        company_id: companyId
      });

      this.logger.info('Deal created successfully', {
        dealId: createdDeal?.id,
        dealType: createdDeal?.type,
        amount: createdDeal?.amount
      });

      return this.createSuccessResult(
        createdDeal,
        `取引を作成しました。\n取引ID: ${createdDeal?.id}\n取引タイプ: ${createdDeal?.type}\n金額: ${createdDeal?.amount}`
      );
    }, 'createDeal');
  }

  /**
   * 取引を更新
   */
  private async updateDeal(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Updating deal', { dealId: args.deal_id });

      // DTOの作成と検証
      const updateDealDto = new UpdateDealDto();
      Object.assign(updateDealDto, args);

      const validationResult = await this.validator.validateDto(updateDealDto);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      // 取引明細がある場合は貸借バランス検証
      if (updateDealDto.details && updateDealDto.details.length > 0) {
        const balanceValidation = this.validator.validateDealBalance(updateDealDto.details);
        if (balanceValidation.isErr()) {
          throw balanceValidation.error;
        }
      }

      const companyId = this.appConfig.companyId;
      const dealId = updateDealDto.deal_id;

      // freee APIで取引を更新
      const updatedDeal = await this.freeeClient.updateDeal(dealId, {
        ...updateDealDto,
        company_id: companyId
      });

      this.logger.info('Deal updated successfully', {
        dealId,
        dealType: updatedDeal?.type,
        amount: updatedDeal?.amount
      });

      return this.createSuccessResult(
        updatedDeal,
        `取引を更新しました。\n取引ID: ${dealId}\n取引タイプ: ${updatedDeal?.type}`
      );
    }, 'updateDeal');
  }

  /**
   * 取引を削除
   */
  private async deleteDeal(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Deleting deal', { dealId: args.deal_id });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['deal_id']);
      if (validationResult.isErr()) {
        throw validationResult.error;
      }

      const companyId = this.appConfig.companyId;
      const dealId = args.deal_id;

      // freee APIで取引を削除
      await this.freeeClient.deleteDeal(dealId, companyId);

      this.logger.info('Deal deleted successfully', { dealId });

      return this.createSuccessResult(
        { deal_id: dealId },
        `取引を削除しました。\n取引ID: ${dealId}`
      );
    }, 'deleteDeal');
  }
}
