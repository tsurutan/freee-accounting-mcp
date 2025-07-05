/**
 * 取引関連リソースハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseResourceHandler, ResourceInfo } from './base-resource-handler.js';
import { MCPResourceResponse } from '../utils/response-builder.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { DateUtils } from '../utils/date-utils.js';
// import { FreeeClient } from '@mcp-server/shared';
// 一時的な型定義
interface FreeeClient {
  getCompanies(): Promise<{ companies: any[] }>;
  getDeals(params: any): Promise<{ deals: any[]; meta: { total_count: number } }>;
  get(url: string): Promise<{ data: any }>;
}

/**
 * 取引関連リソースハンドラー
 */
@injectable()
export class DealsResourceHandler extends BaseResourceHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: any,
    @inject(TYPES.AppConfig) private readonly appConfig: AppConfig,
    @inject(TYPES.DateUtils) private readonly dateUtils: DateUtils,
    @inject(TYPES.FreeeClient) private readonly freeeClient: FreeeClient
  ) {
    super(authService, responseBuilder, errorHandler, logger);
  }

  /**
   * ハンドラーの名前を取得
   */
  getName(): string {
    return 'DealsResourceHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'freee会計の取引関連リソースを提供するハンドラー';
  }

  /**
   * 指定されたURIをサポートするかチェック
   */
  supportsUri(uri: string): boolean {
    return uri.startsWith('deals://');
  }

  /**
   * 処理可能なリソース情報を返す
   */
  getResourceInfo(): ResourceInfo[] {
    return [
      {
        uri: 'deals://list',
        name: '取引一覧',
        description: '取引（収入・支出）の一覧を取得します',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * リソースを読み取り
   */
  async readResource(uri: string): Promise<Result<MCPResourceResponse, AppError>> {
    switch (uri) {
      case 'deals://list':
        return this.getDealsList();

      default:
        return err(this.errorHandler.apiError(`Unknown resource: ${uri}`, 404));
    }
  }

  /**
   * 取引一覧を取得
   */
  private async getDealsList(): Promise<Result<MCPResourceResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Fetching deals list');

      const companyId = this.appConfig.companyId;

      // 事業所一覧を取得して、指定した事業所IDが存在するかチェック
      const companiesResponse = await this.freeeClient.getCompanies();
      const companies = companiesResponse.companies;
      const targetCompany = companies.find(c => c.id === companyId);

      // より広い期間の取引を取得（過去365日）
      const { startDate, endDate } = this.dateUtils.getDateRange(365);

      this.logger.debug('Fetching deals with parameters', {
        companyId,
        startDate,
        endDate,
        targetCompanyFound: !!targetCompany
      });

      // 型安全なメソッドで取引一覧を取得
      const dealsResponse = await this.freeeClient.getDeals({
        company_id: companyId,
        start_issue_date: startDate,
        end_issue_date: endDate,
        limit: 100,
        offset: 0
      });

      // 型安全なレスポンス処理
      const deals = dealsResponse.deals;

      this.logger.info('Deals list retrieved successfully', {
        companyId,
        dealsCount: deals.length,
        totalCount: dealsResponse.meta.total_count,
        period: { startDate, endDate }
      });

      return this.responseBuilder.resourceSuccess(
        'deals://list',
        {
          deals,
          company_id: companyId,
          period: { start_date: startDate, end_date: endDate },
          deals_count: deals.length,
          total_count: dealsResponse.meta.total_count,
          available_companies: companies.map(c => ({ id: c.id, name: c.name })),
          target_company_found: !!targetCompany,
          target_company_info: targetCompany,
        }
      );
    }, 'getDealsList');
  }

  /**
   * 指定期間の取引一覧を取得
   */
  async getDealsForPeriod(
    startDate: string,
    endDate: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Result<any, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Fetching deals for specific period', {
        startDate,
        endDate,
        limit,
        offset
      });

      const companyId = this.appConfig.companyId;

      const dealsResponse = await this.freeeClient.getDeals({
        company_id: companyId,
        start_issue_date: startDate,
        end_issue_date: endDate,
        limit,
        offset
      });

      this.logger.debug('Deals for period retrieved', {
        startDate,
        endDate,
        dealsCount: dealsResponse.deals.length,
        totalCount: dealsResponse.meta.total_count
      });

      return {
        deals: dealsResponse.deals,
        meta: dealsResponse.meta,
        period: { startDate, endDate },
        company_id: companyId,
      };
    }, 'getDealsForPeriod');
  }

  /**
   * 月別の取引一覧を取得
   */
  async getDealsForMonth(year: number, month: number): Promise<Result<any, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Fetching deals for month', { year, month });

      const { startDate, endDate } = this.dateUtils.getMonthDateRange(year, month);

      const result = await this.getDealsForPeriod(startDate, endDate);

      if (result.isOk()) {
        return {
          ...result.value,
          month_info: { year, month },
        };
      }

      return result;
    }, 'getDealsForMonth');
  }

  /**
   * 取引の詳細情報を取得
   */
  async getDealDetails(dealId: number): Promise<Result<any, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Fetching deal details', { dealId });

      const companyId = this.appConfig.companyId;
      const response = await this.freeeClient.get(`/api/1/deals/${dealId}?company_id=${companyId}`);
      const deal = response.data;

      this.logger.debug('Deal details retrieved', {
        dealId,
        dealType: deal?.type,
        amount: deal?.amount
      });

      return deal;
    }, 'getDealDetails');
  }

  /**
   * 取引の統計情報を取得
   */
  async getDealsStatistics(startDate: string, endDate: string): Promise<Result<any, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.debug('Calculating deals statistics', { startDate, endDate });

      const dealsResult = await this.getDealsForPeriod(startDate, endDate, 1000, 0);

      if (dealsResult.isErr()) {
        return dealsResult;
      }

      const deals = dealsResult.value.deals;

      // 統計計算
      const statistics = {
        total_count: deals.length,
        income_count: deals.filter((d: any) => d.type === 'income').length,
        expense_count: deals.filter((d: any) => d.type === 'expense').length,
        total_income: deals
          .filter((d: any) => d.type === 'income')
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
        total_expense: deals
          .filter((d: any) => d.type === 'expense')
          .reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
        period: { startDate, endDate },
      };

      statistics.total_income - statistics.total_expense;

      this.logger.debug('Deals statistics calculated', statistics);

      return statistics;
    }, 'getDealsStatistics');
  }
}
