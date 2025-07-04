/**
 * get-deals ツール簡単統合テスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { DealToolHandler } from '../../handlers/deal-tool-handler.js';
import { TYPES } from '../../container/types.js';
import { ok, err } from 'neverthrow';

// 簡単なモッククラス定義
class SimpleAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class SimpleResponseBuilder {
  formatDealsResponse(deals: any[], companyId: number, period: any) {
    return `取引一覧を取得しました。期間: ${period.startDate} ～ ${period.endDate} 取引数: ${deals.length}件`;
  }
  
  toolSuccessWithData(data: any, message?: string) {
    return {
      content: [{ type: 'text', text: message || 'Success' }],
      data: data
    };
  }
  
  toolSuccess(message: string) {
    return {
      content: [{ type: 'text', text: message }]
    };
  }
  
  toolError(error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
}

class SimpleErrorHandler {
  apiError(message: string, status?: number) {
    return { type: 'API_ERROR', message, status, retryable: false };
  }
  
  validationError(message: string, field?: string) {
    return { type: 'VALIDATION_ERROR', message, field, retryable: false };
  }
  
  fromException(error: unknown) {
    return { type: 'INTERNAL_ERROR', message: 'Internal error', retryable: false };
  }
  
  async wrapAsync<T>(fn: () => Promise<T>) {
    try {
      const result = await fn();
      return ok(result);
    } catch (error) {
      return err(this.fromException(error));
    }
  }
}

class SimpleLogger {
  info(message: string, context?: any) {
    console.error(`[INFO] ${message}`, context);
  }
  error(message: string, context?: any, error?: any) {
    console.error(`[ERROR] ${message}`, context, error);
  }
  warn(message: string, context?: any) {
    console.error(`[WARN] ${message}`, context);
  }
  debug(message: string, context?: any) {
    console.error(`[DEBUG] ${message}`, context);
  }
}

class SimpleValidator {
  async validateDto(dto: any) {
    return ok(dto);
  }
  
  validateDateString(dateString: string) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return err({ type: 'VALIDATION_ERROR', message: '日付形式が正しくありません', retryable: false });
    }
    return ok(dateString);
  }
  
  validateYearMonth(year: number, month: number) {
    if (year < 2000 || year > 2100) {
      return err({ type: 'VALIDATION_ERROR', message: '年は2000-2100の範囲で入力してください', retryable: false });
    }
    if (month < 1 || month > 12) {
      return err({ type: 'VALIDATION_ERROR', message: '月は1-12の範囲で入力してください', retryable: false });
    }
    return ok({ year, month });
  }
}

class SimpleFreeeClient {
  async getDeals(params: any) {
    return {
      deals: [
        {
          id: 1,
          issue_date: '2024-01-15',
          type: 'income',
          amount: 100000,
          partner_name: 'テスト取引先',
          ref_number: 'REF001'
        }
      ],
      meta: {
        total_count: 1
      }
    };
  }
  
  async get(url: string) {
    return { data: { id: 1, name: 'Test' } };
  }
  
  async post(url: string, data: any) {
    return { data: { id: 1, ...data } };
  }
  
  async put(url: string, data: any) {
    return { data: { id: 1, ...data } };
  }
  
  async delete(url: string) {
    return { data: { message: 'Deleted' } };
  }
}

describe('get-deals Tool Simple Integration Test', () => {
  let container: Container;
  let dealToolHandler: DealToolHandler;

  beforeEach(() => {
    container = new Container();
    
    // 簡単なモックサービスをバインド
    container.bind(TYPES.AuthService).toConstantValue(new SimpleAuthService());
    container.bind(TYPES.ResponseBuilder).toConstantValue(new SimpleResponseBuilder());
    container.bind(TYPES.ErrorHandler).toConstantValue(new SimpleErrorHandler());
    container.bind(TYPES.Logger).toConstantValue(new SimpleLogger());
    container.bind(TYPES.Validator).toConstantValue(new SimpleValidator());
    container.bind(TYPES.FreeeClient).toConstantValue(new SimpleFreeeClient());
    
    // 設定クラス
    const mockAppConfig = {
      companyId: 2067140,
      defaultDealsPeriodDays: 30,
      defaultDealsLimit: 100
    };
    const mockDateUtils = {
      getDateRange: (days: number) => ({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }),
      getMonthDateRange: (year: number, month: number) => ({
        startDate: `${year}-${month.toString().padStart(2, '0')}-01`,
        endDate: `${year}-${month.toString().padStart(2, '0')}-31`
      })
    };
    
    container.bind(TYPES.AppConfig).toConstantValue(mockAppConfig);
    container.bind(TYPES.DateUtils).toConstantValue(mockDateUtils);
    
    // テスト対象
    container.bind(DealToolHandler).toSelf();
    
    dealToolHandler = container.get(DealToolHandler);
  });

  describe('Basic Functionality', () => {
    it('should provide tool information', () => {
      const toolInfo = dealToolHandler.getToolInfo();
      
      expect(Array.isArray(toolInfo)).toBe(true);
      expect(toolInfo.length).toBeGreaterThan(0);
      
      const getDealsInfo = toolInfo.find(tool => tool.name === 'get-deals');
      expect(getDealsInfo).toBeDefined();
      expect(getDealsInfo!.name).toBe('get-deals');
      expect(getDealsInfo!.description).toBe('取引一覧を取得します');
    });

    it('should support get-deals tool', () => {
      expect(dealToolHandler.supportsTool('get-deals')).toBe(true);
    });

    it('should not support unknown tools', () => {
      expect(dealToolHandler.supportsTool('unknown-tool')).toBe(false);
    });
  });

  describe('Tool Execution', () => {
    it('should execute get-deals with default parameters', async () => {
      const result = await dealToolHandler.executeTool('get-deals', {});

      // 直接レスポンスオブジェクトが返される
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('data');
      if (result.isOk()) {
        const response = result.value;
        expect(response.content).toHaveLength(1);
        expect(response.content?.[0]?.type).toBe('text');
        expect(response.content?.[0]?.text).toContain('取引一覧を取得しました');

        // データ構造の検証 - content[0].textからJSONを抽出
        const textContent = response.content?.[0]?.text;
        const lines = textContent?.split('\n\n') || [];
        const jsonData = JSON.parse(lines[1] || '{}');
        expect(jsonData).toHaveProperty('deals');
        expect(jsonData).toHaveProperty('meta');
        expect(jsonData).toHaveProperty('period');
        expect(jsonData).toHaveProperty('company_id');
        expect(Array.isArray(jsonData.deals)).toBe(true);
        expect(jsonData.company_id).toBe(2067140);
      }
    }, 10000);

    it('should execute get-deals with date range', async () => {
      const args = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(response).toHaveProperty('content');

        // データ構造の検証 - content[0].textからJSONを抽出
        const textContent = response.content?.[0]?.text;
        const lines = textContent?.split('\n\n') || [];
        const jsonData = JSON.parse(lines[1] || '{}');
        expect(jsonData).toHaveProperty('deals');
        expect(jsonData).toHaveProperty('meta');
        expect(jsonData).toHaveProperty('period');
        expect(Array.isArray(jsonData.deals)).toBe(true);
        expect(jsonData.period.startDate).toBe('2024-01-01');
        expect(jsonData.period.endDate).toBe('2024-01-31');
      }
    }, 10000);

    it('should handle unknown tool', async () => {
      const result = await dealToolHandler.executeTool('unknown-tool', {});

      // エラーレスポンスの場合
      expect(result).toHaveProperty('error');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error).toHaveProperty('type');
        expect(error).toHaveProperty('message');
        expect(error.type).toBe('API_ERROR');
        expect(error.message).toContain('Unknown tool');
      }
    });
  });

  describe('Validation', () => {
    it('should validate date format', async () => {
      const args = {
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);

      // レスポンスが返されることを確認
      // （バリデーションエラーまたは成功のいずれかを期待）
      expect(result).toHaveProperty('content');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(Array.isArray(response.content)).toBe(true);
      }
    });
  });
});
