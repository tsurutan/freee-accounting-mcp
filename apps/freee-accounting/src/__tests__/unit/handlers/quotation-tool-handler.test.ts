/**
 * QuotationToolHandler ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { QuotationToolHandler } from '../../../handlers/quotation-tool-handler.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

// モッククラス
class MockAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class MockResponseBuilder {
  formatQuotationsResponse(quotations: any[], companyId: number, filters: any) {
    return `見積書一覧を取得しました。\n事業所ID: ${companyId}\n見積書数: ${quotations.length}件`;
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
}

class MockLogger {
  info(message: string, context?: any) {}
  error(message: string, context?: any) {}
  warn(message: string, context?: any) {}
  debug(message: string, context?: any) {}
}

class MockValidator {
  async validateDto(dto: any) {
    // Simulate basic validation for Quotation DTOs
    if (dto.constructor.name === 'CreateQuotationDto') {
      if (!dto.quotation_contents || dto.quotation_contents.length === 0) {
        return err({ type: 'VALIDATION_ERROR', message: 'quotation_contents は必須です', retryable: false });
      }
    }
    if (dto.constructor.name === 'UpdateQuotationDto') {
      if (!dto.quotation_id) {
        return err({ type: 'VALIDATION_ERROR', message: 'quotation_id は必須です', retryable: false });
      }
    }
    return ok(dto);
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
  private mockQuotations = [
    {
      id: 1,
      quotation_number: 'QUO-001',
      quotation_date: '2024-01-15',
      quotation_status: 'issued',
      total_amount_with_vat: 110000,
      partner_name: 'テスト顧客A',
      partner_id: 1,
      title: 'テスト見積書',
      quotation_contents: [
        {
          id: 1,
          order: 1,
          type: 'normal',
          description: 'テストサービス',
          qty: 1,
          unit: '件',
          unit_price: 100000,
          amount: 100000,
          vat: 10000
        }
      ]
    },
    {
      id: 2,
      quotation_number: 'QUO-002',
      quotation_date: '2024-01-20',
      quotation_status: 'draft',
      total_amount_with_vat: 55000,
      partner_name: 'テスト顧客B',
      partner_id: 2,
      title: 'テスト見積書2'
    }
  ];

  private mockTemplates = {
    quotation_templates: [
      {
        id: 1,
        name: 'デフォルトテンプレート',
        layout: 'default_classic'
      },
      {
        id: 2,
        name: 'モダンテンプレート',
        layout: 'default_modern'
      }
    ]
  };

  async getQuotations(params: any) {
    const filteredQuotations = this.mockQuotations.filter(quotation => {
      if (params.quotation_status && quotation.quotation_status !== params.quotation_status) {
        return false;
      }
      if (params.partner_id && quotation.partner_id !== params.partner_id) {
        return false;
      }
      return true;
    });

    return {
      quotations: filteredQuotations,
      meta: { total_count: filteredQuotations.length }
    };
  }

  async getQuotationDetails(quotationId: number, companyId: number) {
    const quotation = this.mockQuotations.find(quo => quo.id === quotationId);
    if (!quotation) {
      throw new Error('Quotation not found');
    }
    return quotation;
  }

  async createQuotation(quotationData: any) {
    const newQuotation = {
      id: 999,
      quotation_number: 'QUO-NEW',
      quotation_status: 'draft',
      ...quotationData
    };
    return newQuotation;
  }

  async updateQuotation(quotationId: number, quotationData: any) {
    const existingQuotation = this.mockQuotations.find(quo => quo.id === quotationId);
    if (!existingQuotation) {
      throw new Error('Quotation not found');
    }
    return { ...existingQuotation, ...quotationData };
  }

  async getQuotationTemplates(companyId: number) {
    return this.mockTemplates;
  }
}

class MockAppConfig {
  companyId = 123;
  defaultDealsLimit = 100;
}

class MockEnvironmentConfig {
  oauthClient = {
    getCompanyId: () => '456'
  };
}

class MockDateUtils {
  getDateRange(days: number) {
    return {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    };
  }
}

describe('QuotationToolHandler', () => {
  let container: Container;
  let quotationHandler: QuotationToolHandler;
  let mockFreeeClient: MockFreeeClient;
  let mockResponseBuilder: MockResponseBuilder;
  let mockValidator: MockValidator;

  beforeEach(() => {
    container = new Container();
    
    // モックサービスのインスタンスを作成
    const mockAuthService = new MockAuthService();
    mockResponseBuilder = new MockResponseBuilder();
    const mockErrorHandler = new MockErrorHandler();
    const mockLogger = new MockLogger();
    mockValidator = new MockValidator();
    const mockAppConfig = new MockAppConfig();
    const mockEnvironmentConfig = new MockEnvironmentConfig();
    const mockDateUtils = new MockDateUtils();
    mockFreeeClient = new MockFreeeClient();

    // モックサービスをコンテナに登録
    container.bind(TYPES.AuthService).toConstantValue(mockAuthService);
    container.bind(TYPES.ResponseBuilder).toConstantValue(mockResponseBuilder);
    container.bind(TYPES.ErrorHandler).toConstantValue(mockErrorHandler);
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(TYPES.Validator).toConstantValue(mockValidator);
    container.bind(TYPES.AppConfig).toConstantValue(mockAppConfig);
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvironmentConfig);
    container.bind(TYPES.DateUtils).toConstantValue(mockDateUtils);
    container.bind(TYPES.FreeeClient).toConstantValue(mockFreeeClient);

    // QuotationToolHandlerをコンテナに登録
    container.bind(TYPES.QuotationToolHandler).to(QuotationToolHandler);

    // QuotationToolHandlerのインスタンスを取得
    quotationHandler = container.get<QuotationToolHandler>(TYPES.QuotationToolHandler);
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('getToolInfo()', () => {
    it('should return correct tool information', () => {
      const toolInfo = quotationHandler.getToolInfo();

      expect(toolInfo).toHaveLength(5);
      expect(toolInfo.map(tool => tool.name)).toEqual([
        'get-quotations',
        'get-quotation-details',
        'create-quotation',
        'update-quotation',
        'get-quotation-templates'
      ]);

      // 各ツールが必要なプロパティを持っているかチェック
      toolInfo.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      });
    });
  });

  describe('supportsTool()', () => {
    it('should return true for supported tools', () => {
      expect(quotationHandler.supportsTool('get-quotations')).toBe(true);
      expect(quotationHandler.supportsTool('get-quotation-details')).toBe(true);
      expect(quotationHandler.supportsTool('create-quotation')).toBe(true);
      expect(quotationHandler.supportsTool('update-quotation')).toBe(true);
      expect(quotationHandler.supportsTool('get-quotation-templates')).toBe(true);
    });

    it('should return false for unsupported tools', () => {
      expect(quotationHandler.supportsTool('unsupported-tool')).toBe(false);
      expect(quotationHandler.supportsTool('get-deals')).toBe(false);
    });
  });

  describe('getName()', () => {
    it('should return correct handler name', () => {
      expect(quotationHandler.getName()).toBe('QuotationToolHandler');
    });
  });

  describe('getDescription()', () => {
    it('should return correct handler description', () => {
      expect(quotationHandler.getDescription()).toBe('freee会計の見積書データを管理するツールハンドラー');
    });
  });

  describe('executeTool()', () => {
    describe('get-quotations', () => {
      it('should successfully get quotations list', async () => {
        const args = { limit: 10, offset: 0 };
        const result = await quotationHandler.executeTool('get-quotations', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('見積書一覧を取得しました');
        }
      });

      it('should handle validation errors', async () => {
        jest.spyOn(mockValidator, 'validateDto').mockResolvedValueOnce(
          err({ type: 'VALIDATION_ERROR', message: 'Invalid data', retryable: false })
        );

        const result = await quotationHandler.executeTool('get-quotations', {});

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-quotation-details', () => {
      it('should successfully get quotation details', async () => {
        const args = { quotation_id: 1 };
        const result = await quotationHandler.executeTool('get-quotation-details', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('見積書詳細を取得しました');
        }
      });

      it('should handle missing quotation_id', async () => {
        const args = {};
        const result = await quotationHandler.executeTool('get-quotation-details', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('create-quotation', () => {
      it('should successfully create quotation', async () => {
        const args = {
          quotation_contents: [
            {
              order: 1,
              type: 'normal',
              description: 'テストサービス',
              amount: 100000
            }
          ]
        };
        const result = await quotationHandler.executeTool('create-quotation', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('見積書を作成しました');
        }
      });

      it('should handle validation errors for missing required fields', async () => {
        const args = {}; // Missing required fields
        const result = await quotationHandler.executeTool('create-quotation', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('update-quotation', () => {
      it('should successfully update quotation', async () => {
        const args = {
          quotation_id: 1,
          title: '更新されたタイトル'
        };
        const result = await quotationHandler.executeTool('update-quotation', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('見積書を更新しました');
        }
      });

      it('should handle missing quotation_id', async () => {
        const args = { title: 'タイトル' };
        const result = await quotationHandler.executeTool('update-quotation', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-quotation-templates', () => {
      it('should successfully get quotation templates', async () => {
        const args = {};
        const result = await quotationHandler.executeTool('get-quotation-templates', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('見積書テンプレート一覧を取得しました');
        }
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool', async () => {
        const result = await quotationHandler.executeTool('unknown-tool', {});

        expect(result.isErr()).toBe(true);
      });
    });
  });
});