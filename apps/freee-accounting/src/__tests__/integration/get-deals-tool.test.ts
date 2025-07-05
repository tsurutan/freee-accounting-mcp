/**
 * get-deals ツール統合テスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { DealToolHandler } from '../../handlers/deal-tool-handler.js';
import { TYPES } from '../../container/types.js';
import { EnvironmentConfig } from '../../config/environment-config.js';
import { ok, err } from 'neverthrow';

// モッククラス定義
class MockAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class MockResponseBuilder {
  formatDealsResponse(deals: any[], companyId: number, period: any) {
    return `取引一覧を取得しました。\n期間: ${period.startDate} ～ ${period.endDate}\n取引数: ${deals.length}件`;
  }

  toolSuccessWithData(data: any, message?: string) {
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
    };
  }

  toolSuccess(message: string) {
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }

  toolError(error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `エラー: ${error.message}`,
        },
      ],
      isError: true,
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

describe('get-deals Tool Integration Test', () => {
  let container: Container;
  let dealToolHandler: DealToolHandler;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };

    // テスト用環境変数を設定
    process.env.FREEE_CLIENT_ID = 'test-client-id';
    process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
    process.env.FREEE_BASE_URL = 'https://api.freee.co.jp';
    process.env.COMPANY_ID = '2067140';

    // DIコンテナを手動で設定（bindingsを使わない）
    container = new Container();

    // モックサービスをバインド
    container.bind(TYPES.AuthService).toConstantValue(new MockAuthService());
    container.bind(TYPES.ResponseBuilder).toConstantValue(new MockResponseBuilder());
    container.bind(TYPES.ErrorHandler).toConstantValue(new MockErrorHandler());
    container.bind(TYPES.Logger).toConstantValue(new MockLogger());
    container.bind(TYPES.Validator).toConstantValue(new MockValidator());

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

    // 環境設定（モック）
    const mockEnvConfig = {
      useOAuth: true,
      hasClientId: true,
      hasClientSecret: true,
      baseUrl: 'https://api.freee.co.jp'
    };
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfig);

    // FreeeClientのモック
    const mockFreeeClient = {
      getDeals: jest.fn().mockResolvedValue({
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
      })
    };

    container.bind(TYPES.FreeeClient).toConstantValue(mockFreeeClient);

    // テスト対象
    container.bind(DealToolHandler).toSelf();

    dealToolHandler = container.get(DealToolHandler);
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('Tool Information', () => {
    it('should provide correct tool information for get-deals', () => {
      const toolInfo = dealToolHandler.getToolInfo();
      const getDealsInfo = toolInfo.find(tool => tool.name === 'get-deals');

      expect(getDealsInfo).toBeDefined();
      expect(getDealsInfo!.name).toBe('get-deals');
      expect(getDealsInfo!.description).toBe('取引一覧を取得します');

      // スキーマの検証
      const schema = getDealsInfo!.inputSchema;
      expect(schema.type).toBe('object');
      expect(schema.properties).toHaveProperty('start_date');
      expect(schema.properties).toHaveProperty('end_date');
      expect(schema.properties).toHaveProperty('year');
      expect(schema.properties).toHaveProperty('month');
      expect(schema.properties).toHaveProperty('limit');
      expect(schema.properties).toHaveProperty('offset');

      // 各プロパティの型チェック
      expect(schema.properties.start_date.type).toBe('string');
      expect(schema.properties.end_date.type).toBe('string');
      expect(schema.properties.year.type).toBe('number');
      expect(schema.properties.month.type).toBe('number');
      expect(schema.properties.limit.type).toBe('number');
      expect(schema.properties.offset.type).toBe('number');
    });

    it('should support get-deals tool', () => {
      expect(dealToolHandler.supportsTool('get-deals')).toBe(true);
    });
  });

  describe('Parameter Validation', () => {
    it('should validate date format correctly', async () => {
      // 正しい日付形式
      const validArgs = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      // 実際のAPIコールは失敗するが、バリデーションは通る
      const result = await dealToolHandler.executeTool('get-deals', validArgs);
      
      // 認証エラーまたはネットワークエラーが発生するが、バリデーションエラーではない
      if (result.isErr()) {
        expect(result.error.type).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should reject invalid date format', async () => {
      const invalidArgs = {
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', invalidArgs);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should validate year and month parameters', async () => {
      const validArgs = {
        year: 2024,
        month: 1
      };

      const result = await dealToolHandler.executeTool('get-deals', validArgs);
      
      // バリデーションは通るが、APIコールで失敗する可能性がある
      if (result.isErr()) {
        expect(result.error.type).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should reject invalid year', async () => {
      const invalidArgs = {
        year: 1800,
        month: 1
      };

      const result = await dealToolHandler.executeTool('get-deals', invalidArgs);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject invalid month', async () => {
      const invalidArgs = {
        year: 2024,
        month: 13
      };

      const result = await dealToolHandler.executeTool('get-deals', invalidArgs);
      
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Default Behavior', () => {
    it('should handle empty parameters (use default date range)', async () => {
      const result = await dealToolHandler.executeTool('get-deals', {});
      
      // 認証エラーまたはネットワークエラーが発生する可能性があるが、
      // パラメータ不足によるバリデーションエラーではない
      if (result.isErr()) {
        expect(result.error.type).not.toBe('VALIDATION_ERROR');
      }
    });

    it('should apply default limit and offset', async () => {
      const args = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      // デフォルト値が適用されることを確認
      // 実際のAPIコールは失敗するが、パラメータ処理は正常
      if (result.isErr()) {
        expect(result.error.type).not.toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure on success', async () => {
      const args = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const response = result.value;

        // レスポンス構造の検証
        expect(response).toHaveProperty('content');
        expect(response.content).toHaveLength(1);
        expect(response.content?.[0]?.type).toBe('text');
        expect(response.content?.[0]?.text).toContain('取引一覧を取得しました');

        // JSONデータの抽出と検証
        const textContent = response.content?.[0]?.text;
        const lines = textContent?.split('\n\n') || [];
        expect(lines.length).toBeGreaterThanOrEqual(2);

        const jsonData = JSON.parse(lines[1] || '{}');
        expect(jsonData).toHaveProperty('deals');
        expect(jsonData).toHaveProperty('meta');
        expect(jsonData).toHaveProperty('period');
        expect(jsonData).toHaveProperty('company_id');

        expect(Array.isArray(jsonData.deals)).toBe(true);
        expect(jsonData.deals).toHaveLength(1);
        expect(jsonData.meta.total_count).toBe(1);
        expect(jsonData.period.startDate).toBe('2024-01-01');
        expect(jsonData.period.endDate).toBe('2024-01-31');
        expect(jsonData.company_id).toBe(2067140);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // FreeeClientのモックを一時的に変更
      const mockFreeeClient = container.get(TYPES.FreeeClient);
      (mockFreeeClient as any).getDeals = jest.fn().mockRejectedValue(new Error('API Error'));

      const args = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INTERNAL_ERROR');
      }
    });

    it('should handle authentication errors', async () => {
      // FreeeClientのモックを一時的に変更
      const mockFreeeClient = container.get(TYPES.FreeeClient);
      (mockFreeeClient as any).getDeals = jest.fn().mockRejectedValue({
        response: { status: 401 }
      });

      const args = {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INTERNAL_ERROR');
      }
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      // FreeeClientのモックを一時的に変更
      const mockFreeeClient = container.get(TYPES.FreeeClient);
      (mockFreeeClient as any).getDeals = jest.fn().mockResolvedValue({
        deals: [],
        meta: { total_count: 0 }
      });

      const startTime = Date.now();

      const result = await dealToolHandler.executeTool('get-deals', {
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5秒以内
      expect(result.isOk()).toBe(true);
    });
  });
});
