/**
 * DealToolHandler ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { DealToolHandler } from '../../../handlers/deal-tool-handler.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

// モッククラス
class MockAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class MockResponseBuilder {
  formatDealsResponse(deals: any[], companyId: number, period: any) {
    return `取引一覧を取得しました。\n期間: ${period.startDate} ～ ${period.endDate}\n取引数: ${deals.length}件`;
  }

  toolSuccess(message: string) {
    return {
      content: [{ type: 'text' as const, text: message }],
      isError: false
    };
  }

  toolSuccessWithData(data: any, message?: string) {
    const text = message 
      ? `${message}\n\n${JSON.stringify(data, null, 2)}`
      : JSON.stringify(data, null, 2);

    return {
      content: [{ type: 'text' as const, text }],
      data,
      isError: false
    };
  }

  toolError(error: any) {
    return {
      content: [{ type: 'text' as const, text: `エラー: ${error.message}` }],
      isError: true
    };
  }
}

class MockErrorHandler {
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

class MockLogger {
  info(message: string, context?: any) {}
  error(message: string, context?: any) {}
  warn(message: string, context?: any) {}
  debug(message: string, context?: any) {}
}

class MockValidator {
  async validateDto(dto: any) {
    // Simulate basic validation for DTOs
    if (dto.constructor.name === 'CreateDealDto') {
      if (!dto.issue_date) {
        return err({ type: 'VALIDATION_ERROR', message: 'issue_date は必須です', retryable: false });
      }
      if (!dto.type) {
        return err({ type: 'VALIDATION_ERROR', message: 'type は必須です', retryable: false });
      }
      if (!dto.details || dto.details.length === 0) {
        return err({ type: 'VALIDATION_ERROR', message: 'details は必須です', retryable: false });
      }
    }
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

  validateDealBalance(details: any[]) {
    return ok(details);
  }

  validateRequired(value: any, fieldName: string) {
    if (value === undefined || value === null || value === '') {
      return err({ type: 'VALIDATION_ERROR', message: `${fieldName} は必須です`, field: fieldName, retryable: false });
    }
    return ok(value);
  }

  validateRequiredFields(obj: any, fields: string[]) {
    for (const field of fields) {
      if (!obj[field]) {
        return err({ type: 'VALIDATION_ERROR', message: `${field} is required`, retryable: false });
      }
    }
    return ok(obj);
  }
}

class MockFreeeClient {
  private mockDeals = [
    {
      id: 1,
      issue_date: '2024-01-15',
      type: 'income',
      amount: 100000,
      partner_name: 'テスト取引先A',
      ref_number: 'REF001',
      details: [
        {
          id: 1,
          account_item_name: '売上高',
          amount: 100000,
          entry_side: 'credit'
        }
      ]
    },
    {
      id: 2,
      issue_date: '2024-01-20',
      type: 'expense',
      amount: 50000,
      partner_name: 'テスト取引先B',
      ref_number: 'REF002',
      details: [
        {
          id: 2,
          account_item_name: '仕入高',
          amount: 50000,
          entry_side: 'debit'
        }
      ]
    }
  ];

  async getDeals(params: any) {
    // パラメータに基づいてフィルタリング
    let filteredDeals = [...this.mockDeals];
    
    if (params.start_issue_date && params.end_issue_date) {
      filteredDeals = filteredDeals.filter(deal => 
        deal.issue_date >= params.start_issue_date && 
        deal.issue_date <= params.end_issue_date
      );
    }
    
    // limit/offsetの適用
    const offset = params.offset || 0;
    const limit = params.limit || 100;
    const paginatedDeals = filteredDeals.slice(offset, offset + limit);
    
    return {
      deals: paginatedDeals,
      meta: {
        total_count: filteredDeals.length
      }
    };
  }

  async get(url: string) {
    const dealIdMatch = url.match(/\/deals\/(\d+)/);
    if (dealIdMatch) {
      const dealId = parseInt(dealIdMatch[1]!);
      const deal = this.mockDeals.find(d => d.id === dealId);
      if (deal) {
        return { data: deal };
      }
      throw new Error('Deal not found');
    }
    throw new Error('Invalid URL');
  }

  async post(url: string, data: any) {
    const newDeal = {
      id: this.mockDeals.length + 1,
      ...data,
      created_at: new Date().toISOString()
    };
    this.mockDeals.push(newDeal);
    return { data: newDeal };
  }

  async put(url: string, data: any) {
    const dealIdMatch = url.match(/\/deals\/(\d+)/);
    if (dealIdMatch) {
      const dealId = parseInt(dealIdMatch[1]!);
      const dealIndex = this.mockDeals.findIndex(d => d.id === dealId);
      if (dealIndex !== -1) {
        this.mockDeals[dealIndex] = { ...this.mockDeals[dealIndex], ...data };
        return { data: this.mockDeals[dealIndex] };
      }
      throw new Error('Deal not found');
    }
    throw new Error('Invalid URL');
  }

  async delete(url: string) {
    const dealIdMatch = url.match(/\/deals\/(\d+)/);
    if (dealIdMatch) {
      const dealId = parseInt(dealIdMatch[1]!);
      const dealIndex = this.mockDeals.findIndex(d => d.id === dealId);
      if (dealIndex !== -1) {
        this.mockDeals.splice(dealIndex, 1);
        return { data: { message: 'Deal deleted' } };
      }
      throw new Error('Deal not found');
    }
    throw new Error('Invalid URL');
  }

  async getDealDetails(dealId: number, companyId: number) {
    const deal = this.mockDeals.find(d => d.id === dealId);
    if (deal) {
      return deal;
    }
    throw new Error('Deal not found');
  }

  async createDeal(dealData: any) {
    const newDeal = {
      id: this.mockDeals.length + 1,
      ...dealData,
      created_at: new Date().toISOString()
    };
    this.mockDeals.push(newDeal);
    return newDeal;
  }

  async updateDeal(dealId: number, dealData: any) {
    const dealIndex = this.mockDeals.findIndex(d => d.id === dealId);
    if (dealIndex !== -1) {
      this.mockDeals[dealIndex] = { ...this.mockDeals[dealIndex], ...dealData };
      return this.mockDeals[dealIndex];
    }
    throw new Error('Deal not found');
  }

  async deleteDeal(dealId: number, companyId: number) {
    const dealIndex = this.mockDeals.findIndex(d => d.id === dealId);
    if (dealIndex !== -1) {
      this.mockDeals.splice(dealIndex, 1);
      return { message: 'Deal deleted' };
    }
    throw new Error('Deal not found');
  }
}

describe('DealToolHandler', () => {
  let container: Container;
  let dealToolHandler: DealToolHandler;
  let mockFreeeClient: MockFreeeClient;

  beforeEach(() => {
    container = new Container();
    mockFreeeClient = new MockFreeeClient();

    // モックサービスをバインド
    container.bind(TYPES.AuthService).toConstantValue(new MockAuthService());
    container.bind(TYPES.ResponseBuilder).toConstantValue(new MockResponseBuilder());
    container.bind(TYPES.ErrorHandler).toConstantValue(new MockErrorHandler());
    container.bind(TYPES.Logger).toConstantValue(new MockLogger());
    container.bind(TYPES.Validator).toConstantValue(new MockValidator());
    container.bind(TYPES.FreeeClient).toConstantValue(mockFreeeClient);
    
    // 設定クラス（モック）
    const mockAppConfig = {
      companyId: 2067140,
      defaultDealsPeriodDays: 30,
      defaultDealsLimit: 100,
      baseUrl: 'https://api.freee.co.jp'
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
    
    // EnvironmentConfig のモック
    const mockEnvironmentConfig = {
      oauthConfig: {
        baseUrl: 'https://api.freee.co.jp',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      },
      companyId: 2067140,
      baseUrl: 'https://api.freee.co.jp',
      useOAuth: true,
    };
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvironmentConfig);
    
    // テスト対象
    container.bind(DealToolHandler).toSelf();
    
    dealToolHandler = container.get(DealToolHandler);
  });

  afterEach(() => {
    // Clean up container to prevent memory leaks
    if (container) {
      container.unbindAll();
    }
  });

  describe('getToolInfo', () => {
    it('should return correct tool information', () => {
      const toolInfo = dealToolHandler.getToolInfo();
      
      expect(toolInfo).toHaveLength(5);
      expect(toolInfo.map(t => t.name)).toEqual([
        'get-deals',
        'get-deal-details',
        'create-deal',
        'update-deal',
        'delete-deal'
      ]);
      
      const getDealsInfo = toolInfo.find(t => t.name === 'get-deals');
      expect(getDealsInfo).toBeDefined();
      expect(getDealsInfo!.description).toBe('取引一覧を取得します');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('start_date');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('end_date');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('year');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('month');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('limit');
      expect(getDealsInfo!.inputSchema.properties).toHaveProperty('offset');
    });
  });

  describe('supportsTool', () => {
    it('should return true for supported tools', () => {
      expect(dealToolHandler.supportsTool('get-deals')).toBe(true);
      expect(dealToolHandler.supportsTool('get-deal-details')).toBe(true);
      expect(dealToolHandler.supportsTool('create-deal')).toBe(true);
      expect(dealToolHandler.supportsTool('update-deal')).toBe(true);
      expect(dealToolHandler.supportsTool('delete-deal')).toBe(true);
    });

    it('should return false for unsupported tools', () => {
      expect(dealToolHandler.supportsTool('unknown-tool')).toBe(false);
      expect(dealToolHandler.supportsTool('get-companies')).toBe(false);
    });
  });

  describe('get-deals tool execution', () => {
    describe('successful cases', () => {
      it('should get deals with default date range (no parameters)', async () => {
        const result = await dealToolHandler.executeTool('get-deals', {});

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value;
          expect(response.content).toHaveLength(1);
          expect(response.content[0]?.type).toBe('text');
          expect(response.content[0]?.text).toContain('取引一覧を取得しました');

          // レスポンスデータの検証
          const responseData = response.data as any;
          expect(responseData).toHaveProperty('deals');
          expect(responseData).toHaveProperty('meta');
          expect(responseData).toHaveProperty('period');
          expect(responseData).toHaveProperty('company_id');
          expect(Array.isArray(responseData.deals)).toBe(true);
          expect(responseData.meta).toHaveProperty('total_count');
        }
      });

      it('should get deals with specific date range', async () => {
        const args = {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value;
          const responseData = response.data as any;
          expect(responseData.period.startDate).toBe('2024-01-01');
          expect(responseData.period.endDate).toBe('2024-01-31');
          expect(responseData.deals.length).toBeGreaterThanOrEqual(0);
        }
      });

      it('should get deals with year and month parameters', async () => {
        const args = {
          year: 2024,
          month: 1
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value;
          const responseData = response.data as any;
          expect(responseData.period.startDate).toBe('2024-01-01');
          expect(responseData.period.endDate).toBe('2024-01-31');
        }
      });

      it('should get deals with limit and offset parameters', async () => {
        const args = {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          limit: 1,
          offset: 0
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value;
          const responseData = response.data as any;
          expect(responseData.deals.length).toBeLessThanOrEqual(1);
        }
      });

      it('should return empty deals for date range with no data', async () => {
        const args = {
          start_date: '2025-01-01',
          end_date: '2025-01-31'
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          const response = result.value;
          const responseData = response.data as any;
          expect(responseData.deals).toHaveLength(0);
          expect(responseData.meta.total_count).toBe(0);
        }
      });
    });

    describe('validation error cases', () => {
      it('should return error for invalid start_date format', async () => {
        const args = {
          start_date: 'invalid-date',
          end_date: '2024-01-31'
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('日付形式が正しくありません');
        }
      });

      it('should return error for invalid end_date format', async () => {
        const args = {
          start_date: '2024-01-01',
          end_date: 'invalid-date'
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('日付形式が正しくありません');
        }
      });

      it('should return error for invalid year', async () => {
        const args = {
          year: 1800,
          month: 1
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('年は2000-2100の範囲で入力してください');
        }
      });

      it('should return error for invalid month', async () => {
        const args = {
          year: 2024,
          month: 13
        };

        const result = await dealToolHandler.executeTool('get-deals', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
          expect(result.error.message).toContain('月は1-12の範囲で入力してください');
        }
      });
    });
  });

  describe('get-deal-details tool execution', () => {
    it('should get deal details successfully', async () => {
      const args = { deal_id: 1 };

      const result = await dealToolHandler.executeTool('get-deal-details', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(response.content[0]?.text).toContain('取引詳細を取得しました');
        const responseData = response.data as any;
        expect(responseData.id).toBe(1);
        expect(responseData.type).toBe('income');
        expect(responseData.amount).toBe(100000);
      }
    });

    it('should return error for missing deal_id', async () => {
      const args = {};

      const result = await dealToolHandler.executeTool('get-deal-details', args);

      expect(result.isErr()).toBe(true);
    });

    it('should handle non-existent deal', async () => {
      const args = { deal_id: 999 };

      const result = await dealToolHandler.executeTool('get-deal-details', args);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('create-deal tool execution', () => {
    it('should create deal successfully', async () => {
      const args = {
        issue_date: '2024-02-01',
        type: 'income',
        details: [
          {
            account_item_id: 1,
            tax_code: 1,
            amount: 150000,
            entry_side: 'credit'
          }
        ]
      };

      const result = await dealToolHandler.executeTool('create-deal', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(response.content[0]?.text).toContain('取引を作成しました');
        const responseData = response.data as any;
        expect(responseData.issue_date).toBe('2024-02-01');
        expect(responseData.type).toBe('income');
      }
    });

    it('should return error for missing required fields', async () => {
      const args = {
        type: 'income'
        // missing issue_date and details
      };

      const result = await dealToolHandler.executeTool('create-deal', args);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('update-deal tool execution', () => {
    it('should update deal successfully', async () => {
      const args = {
        deal_id: 1,
        issue_date: '2024-01-16',
        ref_number: 'REF001-UPDATED'
      };

      const result = await dealToolHandler.executeTool('update-deal', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(response.content[0]?.text).toContain('取引を更新しました');
        const responseData = response.data as any;
        expect(responseData.issue_date).toBe('2024-01-16');
        expect(responseData.ref_number).toBe('REF001-UPDATED');
      }
    });

    it('should return error for missing deal_id', async () => {
      const args = {
        issue_date: '2024-01-16'
        // missing deal_id
      };

      const result = await dealToolHandler.executeTool('update-deal', args);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('delete-deal tool execution', () => {
    it('should delete deal successfully', async () => {
      const args = { deal_id: 1 };

      const result = await dealToolHandler.executeTool('delete-deal', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;
        expect(response.content[0]?.text).toContain('取引を削除しました');
        const responseData = response.data as any;
        expect(responseData.deal_id).toBe(1);
      }
    });

    it('should return error for missing deal_id', async () => {
      const args = {};

      const result = await dealToolHandler.executeTool('delete-deal', args);

      expect(result.isErr()).toBe(true);
    });
  });

  describe('unknown tool execution', () => {
    it('should return error for unknown tool', async () => {
      const result = await dealToolHandler.executeTool('unknown-tool', {});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('API_ERROR');
        expect(result.error.message).toContain('Unknown tool: unknown-tool');
      }
    });
  });
});
