/**
 * MCPレスポンス生成ユーティリティ
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import { ErrorHandler, AppError } from './error-handler.js';

/**
 * MCPツールレスポンスの型定義
 */
export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  [k: string]: unknown;
}

/**
 * MCPリソースレスポンスの型定義
 */
export interface MCPResourceResponse {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
  [k: string]: unknown;
}

/**
 * レスポンス生成クラス
 */
@injectable()
export class ResponseBuilder {
  constructor(
    @inject(TYPES.ErrorHandler) private readonly errorHandler: ErrorHandler
  ) {}

  /**
   * 成功レスポンスを生成（ツール用）
   */
  toolSuccess(message: string): MCPToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: false,
    };
  }

  /**
   * 成功レスポンスを生成（JSON データ付き）
   */
  toolSuccessWithData(data: any, message?: string): MCPToolResponse & { data: any } {
    const text = message 
      ? `${message}\n\n${JSON.stringify(data, null, 2)}`
      : JSON.stringify(data, null, 2);

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
      isError: false,
      data,
    };
  }

  /**
   * エラーレスポンスを生成（ツール用）
   */
  toolError(error: AppError): MCPToolResponse {
    const errorInfo = this.errorHandler.toMCPError(error);
    const message = `エラー: ${errorInfo.message}${
      errorInfo.retryable ? '\n\nこのエラーはリトライ可能です。' : ''
    }`;

    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };
  }

  /**
   * エラーレスポンスを生成（例外から）
   */
  toolErrorFromException(exception: unknown): MCPToolResponse {
    const error = this.errorHandler.fromException(exception);
    return this.toolError(error);
  }

  /**
   * リソースレスポンスを生成（成功）
   */
  resourceSuccess(uri: string, data: any, mimeType: string = 'application/json'): MCPResourceResponse {
    return {
      contents: [
        {
          uri,
          mimeType,
          text: JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  /**
   * リソースレスポンスを生成（エラー）
   */
  resourceError(uri: string, error: AppError): MCPResourceResponse {
    const errorInfo = this.errorHandler.toMCPError(error);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(errorInfo, null, 2),
        },
      ],
    };
  }

  /**
   * リソースレスポンスを生成（例外から）
   */
  resourceErrorFromException(uri: string, exception: unknown): MCPResourceResponse {
    const error = this.errorHandler.fromException(exception);
    return this.resourceError(uri, error);
  }

  /**
   * 認証エラーレスポンスを生成（ツール用）
   */
  authError(message: string = '認証が必要です。まず認証を完了してください。'): MCPToolResponse {
    const error = this.errorHandler.authError(message);
    return this.toolError(error);
  }

  /**
   * 認証エラーレスポンスを生成（リソース用）
   */
  resourceAuthError(uri: string, message: string = '認証が必要です'): MCPResourceResponse {
    const error = this.errorHandler.authError(message);
    return this.resourceError(uri, error);
  }

  /**
   * バリデーションエラーレスポンスを生成
   */
  validationError(message: string, field?: string): MCPToolResponse {
    const error = this.errorHandler.validationError(message, field);
    return this.toolError(error);
  }

  /**
   * 取引データのフォーマット
   */
  formatDealsResponse(deals: any[], companyId: number, period: { startDate: string; endDate: string }): string {
    if (deals.length === 0) {
      return `取引データがありません。\n\n期間: ${period.startDate} ～ ${period.endDate}\n事業所ID: ${companyId}`;
    }

    const summary = `取引一覧を取得しました。

期間: ${period.startDate} ～ ${period.endDate}
事業所ID: ${companyId}
取得件数: ${deals.length}件

取引データ:`;

    if (deals.length <= 3) {
      return `${summary}\n${JSON.stringify(deals, null, 2)}`;
    } else {
      const sampleDeals = deals.slice(0, 3);
      return `${summary}\n${JSON.stringify(sampleDeals, null, 2)}\n... 他${deals.length - 3}件`;
    }
  }

  /**
   * 事業所情報のフォーマット
   */
  formatCompaniesResponse(companies: any[], currentCompanyId?: number): string {
    if (companies.length === 0) {
      return '利用可能な事業所が見つかりませんでした。';
    }

    const data = {
      companies,
      current_company_id: currentCompanyId,
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * ヘルスチェック結果のフォーマット
   */
  formatHealthCheckResponse(results: Record<string, boolean>): string {
    const isHealthy = Object.values(results).every(result => result);
    
    let response = `システムヘルスチェック結果:

全体ステータス: ${isHealthy ? '✅ 正常' : '❌ 異常'}

個別チェック:`;

    for (const [name, result] of Object.entries(results)) {
      response += `\n- ${name}: ${result ? '✅ 正常' : '❌ 異常'}`;
    }

    response += '\n\nアクティブアラート: 0件';
    
    return response;
  }

  /**
   * メトリクス情報のフォーマット
   */
  formatMetricsResponse(metricsData: any, type?: string): string {
    return `システムメトリクス${type ? ` (${type})` : ''}:

${JSON.stringify(metricsData, null, 2)}`;
  }

  /**
   * レート制限情報のフォーマット
   */
  formatRateLimitResponse(rateLimitInfo: any): string {
    if (!rateLimitInfo) {
      return 'レート制限情報はまだ利用できません。APIリクエストを実行後に再度確認してください。';
    }

    const resetTime = new Date(rateLimitInfo.resetTime).toLocaleString();
    const usageRate = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit * 100).toFixed(1);

    return `freee API レート制限情報:
制限数: ${rateLimitInfo.limit}
残り: ${rateLimitInfo.remaining}
リセット時刻: ${resetTime}

使用率: ${usageRate}%`;
  }

  /**
   * 請求書データのフォーマット
   */
  formatInvoicesResponse(invoices: any[], companyId: number, filters: any = {}): string {
    if (invoices.length === 0) {
      return `請求書データがありません。\n\n事業所ID: ${companyId}\nフィルター: ${JSON.stringify(filters)}`;
    }

    const summary = `請求書一覧を取得しました。

事業所ID: ${companyId}
取得件数: ${invoices.length}件

請求書一覧:`;

    const invoiceList = invoices.map(invoice => {
      const issueDate = invoice.issue_date || 'N/A';
      const dueDate = invoice.due_date || 'N/A';
      const status = invoice.invoice_status || 'N/A';
      const amount = invoice.total_amount_with_vat ? `¥${invoice.total_amount_with_vat.toLocaleString()}` : 'N/A';
      const partner = invoice.partner_name || 'N/A';
      
      return `- ID: ${invoice.id} | 番号: ${invoice.invoice_number || 'N/A'} | 取引先: ${partner} | 請求日: ${issueDate} | 期日: ${dueDate} | 金額: ${amount} | ステータス: ${status}`;
    }).join('\n');

    return `${summary}\n${invoiceList}`;
  }

  /**
   * 見積書データのフォーマット
   */
  formatQuotationsResponse(quotations: any[], companyId: number, filters: any = {}): string {
    if (quotations.length === 0) {
      return `見積書データがありません。\n\n事業所ID: ${companyId}\nフィルター: ${JSON.stringify(filters)}`;
    }

    const summary = `見積書一覧を取得しました。

事業所ID: ${companyId}
取得件数: ${quotations.length}件

見積書一覧:`;

    const quotationList = quotations.map(quotation => {
      const quotationDate = quotation.quotation_date || 'N/A';
      const status = quotation.quotation_status || 'N/A';
      const amount = quotation.total_amount_with_vat ? `¥${quotation.total_amount_with_vat.toLocaleString()}` : 'N/A';
      const partner = quotation.partner_name || 'N/A';
      
      return `- ID: ${quotation.id} | 番号: ${quotation.quotation_number || 'N/A'} | 取引先: ${partner} | 見積日: ${quotationDate} | 金額: ${amount} | ステータス: ${status}`;
    }).join('\n');

    return `${summary}\n${quotationList}`;
  }

  /**
   * 納品書データのフォーマット
   */
  formatDeliverySlipsResponse(deliverySlips: any[], companyId: number, filters: any = {}): string {
    if (deliverySlips.length === 0) {
      return `納品書データがありません。\n\n事業所ID: ${companyId}\nフィルター: ${JSON.stringify(filters)}`;
    }

    const summary = `納品書一覧を取得しました。

事業所ID: ${companyId}
取得件数: ${deliverySlips.length}件

納品書一覧:`;

    const deliverySlipList = deliverySlips.map(deliverySlip => {
      const deliveryDate = deliverySlip.delivery_date || 'N/A';
      const status = deliverySlip.delivery_slip_status || 'N/A';
      const amount = deliverySlip.total_amount_with_vat ? `¥${deliverySlip.total_amount_with_vat.toLocaleString()}` : 'N/A';
      const partner = deliverySlip.partner_name || 'N/A';
      
      return `- ID: ${deliverySlip.id} | 番号: ${deliverySlip.delivery_slip_number || 'N/A'} | 取引先: ${partner} | 納品日: ${deliveryDate} | 金額: ${amount} | ステータス: ${status}`;
    }).join('\n');

    return `${summary}\n${deliverySlipList}`;
  }
}
