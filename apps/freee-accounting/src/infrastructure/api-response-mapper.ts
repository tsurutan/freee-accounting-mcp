/**
 * APIレスポンスのマッピング・変換
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { Logger } from './logger.js';
import { ErrorHandler, AppError } from '../utils/error-handler.js';
import { ApiCallResult } from './freee-api-client.js';

/**
 * マッピング設定
 */
export interface MappingConfig {
  includeMetadata: boolean;
  includeTimestamp: boolean;
  includeRequestInfo: boolean;
  dateFormat: 'iso' | 'local' | 'unix';
  numberFormat: 'string' | 'number';
}

/**
 * マッピングされたレスポンス
 */
export interface MappedResponse<T = any> {
  data: T;
  metadata?: {
    timestamp: string;
    status: number;
    duration: number;
    requestId?: string;
    operation?: string;
    dataSize?: number;
  };
  pagination?: {
    total?: number;
    page?: number;
    perPage?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

/**
 * freee API固有のレスポンス構造
 */
interface FreeeApiResponseStructure {
  companies?: any[];
  deals?: any[];
  account_items?: any[];
  partners?: any[];
  sections?: any[];
  items?: any[];
  tags?: any[];
  trial_balance?: any;
  meta?: {
    total_count?: number;
    total_pages?: number;
    current_page?: number;
    per_page?: number;
  };
}

/**
 * APIレスポンスマッパー
 */
@injectable()
export class ApiResponseMapper {
  private config: MappingConfig;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.ErrorHandler) private readonly errorHandler: ErrorHandler
  ) {
    this.config = {
      includeMetadata: process.env.API_INCLUDE_METADATA !== 'false',
      includeTimestamp: process.env.API_INCLUDE_TIMESTAMP !== 'false',
      includeRequestInfo: process.env.API_INCLUDE_REQUEST_INFO === 'true',
      dateFormat: (process.env.API_DATE_FORMAT as any) || 'iso',
      numberFormat: (process.env.API_NUMBER_FORMAT as any) || 'number',
    };

    this.logger.debug('ApiResponseMapper initialized', this.config);
  }

  /**
   * APIレスポンスをマッピング
   */
  mapResponse<T = any>(
    apiResult: ApiCallResult,
    options?: Partial<MappingConfig>
  ): Result<MappedResponse<T>, AppError> {
    try {
      const config = { ...this.config, ...options };
      const startTime = Date.now();

      // freee API固有の構造を処理
      const mappedData = this.mapFreeeApiStructure(apiResult.data);

      // メタデータを構築
      const metadata = config.includeMetadata ? this.buildMetadata(apiResult, config) : undefined;

      // ページネーション情報を抽出
      const pagination = this.extractPagination(apiResult.data);

      const result: MappedResponse<T> = {
        data: mappedData as T,
        metadata,
        pagination,
      };

      const duration = Date.now() - startTime;
      this.logger.debug('Response mapped successfully', {
        operation: apiResult.context.operation,
        requestId: apiResult.context.requestId,
        mappingDuration: duration,
        hasMetadata: !!metadata,
        hasPagination: !!pagination,
      });

      return ok(result);
    } catch (error) {
      const appError = this.errorHandler.fromException(error);
      this.logger.error('Response mapping failed', {
        operation: apiResult.context.operation,
        requestId: apiResult.context.requestId,
        error: appError,
      });
      return err(appError);
    }
  }

  /**
   * freee API固有の構造をマッピング
   */
  private mapFreeeApiStructure(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const freeeData = data as FreeeApiResponseStructure;

    // 各リソースタイプに応じた処理
    if (freeeData.companies) {
      return this.mapCompanies(freeeData.companies);
    }

    if (freeeData.deals) {
      return this.mapDeals(freeeData.deals);
    }

    if (freeeData.account_items) {
      return this.mapAccountItems(freeeData.account_items);
    }

    if (freeeData.partners) {
      return this.mapPartners(freeeData.partners);
    }

    if (freeeData.sections) {
      return this.mapSections(freeeData.sections);
    }

    if (freeeData.items) {
      return this.mapItems(freeeData.items);
    }

    if (freeeData.tags) {
      return this.mapTags(freeeData.tags);
    }

    if (freeeData.trial_balance) {
      return this.mapTrialBalance(freeeData.trial_balance);
    }

    // その他のデータはそのまま返す
    return this.mapGenericData(data);
  }

  /**
   * 事業所データをマッピング
   */
  private mapCompanies(companies: any[]): any[] {
    return companies.map(company => ({
      ...company,
      id: this.formatNumber(company.id),
      created_at: this.formatDate(company.created_at),
      updated_at: this.formatDate(company.updated_at),
    }));
  }

  /**
   * 取引データをマッピング
   */
  private mapDeals(deals: any[]): any[] {
    return deals.map(deal => ({
      ...deal,
      id: this.formatNumber(deal.id),
      company_id: this.formatNumber(deal.company_id),
      issue_date: this.formatDate(deal.issue_date),
      due_date: this.formatDate(deal.due_date),
      created_at: this.formatDate(deal.created_at),
      updated_at: this.formatDate(deal.updated_at),
      amount: this.formatNumber(deal.amount),
      details: deal.details?.map((detail: any) => ({
        ...detail,
        id: this.formatNumber(detail.id),
        account_item_id: this.formatNumber(detail.account_item_id),
        amount: this.formatNumber(detail.amount),
      })),
    }));
  }

  /**
   * 勘定科目データをマッピング
   */
  private mapAccountItems(accountItems: any[]): any[] {
    return accountItems.map(item => ({
      ...item,
      id: this.formatNumber(item.id),
      company_id: this.formatNumber(item.company_id),
      created_at: this.formatDate(item.created_at),
      updated_at: this.formatDate(item.updated_at),
    }));
  }

  /**
   * 取引先データをマッピング
   */
  private mapPartners(partners: any[]): any[] {
    return partners.map(partner => ({
      ...partner,
      id: this.formatNumber(partner.id),
      company_id: this.formatNumber(partner.company_id),
      created_at: this.formatDate(partner.created_at),
      updated_at: this.formatDate(partner.updated_at),
    }));
  }

  /**
   * 部門データをマッピング
   */
  private mapSections(sections: any[]): any[] {
    return sections.map(section => ({
      ...section,
      id: this.formatNumber(section.id),
      company_id: this.formatNumber(section.company_id),
      created_at: this.formatDate(section.created_at),
      updated_at: this.formatDate(section.updated_at),
    }));
  }

  /**
   * 品目データをマッピング
   */
  private mapItems(items: any[]): any[] {
    return items.map(item => ({
      ...item,
      id: this.formatNumber(item.id),
      company_id: this.formatNumber(item.company_id),
      created_at: this.formatDate(item.created_at),
      updated_at: this.formatDate(item.updated_at),
    }));
  }

  /**
   * メモタグデータをマッピング
   */
  private mapTags(tags: any[]): any[] {
    return tags.map(tag => ({
      ...tag,
      id: this.formatNumber(tag.id),
      company_id: this.formatNumber(tag.company_id),
      created_at: this.formatDate(tag.created_at),
      updated_at: this.formatDate(tag.updated_at),
    }));
  }

  /**
   * 試算表データをマッピング
   */
  private mapTrialBalance(trialBalance: any): any {
    return {
      ...trialBalance,
      company_id: this.formatNumber(trialBalance.company_id),
      fiscal_year: this.formatNumber(trialBalance.fiscal_year),
      created_at: this.formatDate(trialBalance.created_at),
      balances: trialBalance.balances?.map((balance: any) => ({
        ...balance,
        account_item_id: this.formatNumber(balance.account_item_id),
        opening_balance: this.formatNumber(balance.opening_balance),
        debit_amount: this.formatNumber(balance.debit_amount),
        credit_amount: this.formatNumber(balance.credit_amount),
        closing_balance: this.formatNumber(balance.closing_balance),
      })),
    };
  }

  /**
   * 汎用データをマッピング
   */
  private mapGenericData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.mapGenericData(item));
    }

    if (data && typeof data === 'object') {
      const mapped: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (key.endsWith('_id') || key === 'id') {
          mapped[key] = this.formatNumber(value);
        } else if (key.endsWith('_at') || key.includes('date')) {
          mapped[key] = this.formatDate(value);
        } else if (key.includes('amount') || key.includes('balance')) {
          mapped[key] = this.formatNumber(value);
        } else {
          mapped[key] = this.mapGenericData(value);
        }
      }
      return mapped;
    }

    return data;
  }

  /**
   * メタデータを構築
   */
  private buildMetadata(apiResult: ApiCallResult, config: MappingConfig): any {
    const metadata: any = {
      status: apiResult.status,
      duration: apiResult.duration,
    };

    if (config.includeTimestamp) {
      metadata.timestamp = this.formatDate(new Date().toISOString());
    }

    if (config.includeRequestInfo) {
      metadata.requestId = apiResult.context.requestId;
      metadata.operation = apiResult.context.operation;
      metadata.method = apiResult.context.method;
      metadata.url = apiResult.context.url;
    }

    // データサイズを計算
    try {
      const dataSize = JSON.stringify(apiResult.data).length;
      metadata.dataSize = dataSize;
    } catch {
      // データサイズ計算に失敗した場合は無視
    }

    return metadata;
  }

  /**
   * ページネーション情報を抽出
   */
  private extractPagination(data: any): any | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const meta = data.meta;
    if (!meta) {
      return undefined;
    }

    return {
      total: this.formatNumber(meta.total_count),
      page: this.formatNumber(meta.current_page),
      perPage: this.formatNumber(meta.per_page),
      totalPages: this.formatNumber(meta.total_pages),
      hasNext: meta.current_page < meta.total_pages,
      hasPrev: meta.current_page > 1,
    };
  }

  /**
   * 日付をフォーマット
   */
  private formatDate(value: any): any {
    if (!value) return value;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      switch (this.config.dateFormat) {
        case 'local':
          return date.toLocaleString();
        case 'unix':
          return Math.floor(date.getTime() / 1000);
        case 'iso':
        default:
          return date.toISOString();
      }
    } catch {
      return value;
    }
  }

  /**
   * 数値をフォーマット
   */
  private formatNumber(value: any): any {
    if (value === null || value === undefined) return value;

    const num = Number(value);
    if (isNaN(num)) return value;

    switch (this.config.numberFormat) {
      case 'string':
        return String(value);
      case 'number':
      default:
        return num;
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<MappingConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('ApiResponseMapper config updated', this.config);
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): MappingConfig {
    return { ...this.config };
  }
}
