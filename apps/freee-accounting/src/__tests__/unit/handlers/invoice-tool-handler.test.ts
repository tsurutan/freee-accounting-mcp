/**
 * InvoiceToolHandler ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { InvoiceToolHandler } from '../../../handlers/invoice-tool-handler.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

// モッククラス
class MockAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class MockResponseBuilder {
  formatInvoicesResponse(invoices: any[], companyId: number, filters: any) {
    return `請求書一覧を取得しました。\n事業所ID: ${companyId}\n請求書数: ${invoices.length}件`;
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
    // Simulate basic validation for Invoice DTOs
    if (dto.constructor.name === 'CreateInvoiceDto') {
      if (!dto.due_date) {
        return err({ type: 'VALIDATION_ERROR', message: 'due_date は必須です', retryable: false });
      }
      if (!dto.invoice_contents || dto.invoice_contents.length === 0) {
        return err({ type: 'VALIDATION_ERROR', message: 'invoice_contents は必須です', retryable: false });
      }
    }
    if (dto.constructor.name === 'UpdateInvoiceDto') {
      if (!dto.invoice_id) {
        return err({ type: 'VALIDATION_ERROR', message: 'invoice_id は必須です', retryable: false });
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
  private mockInvoices = [
    {
      id: 1,
      invoice_number: 'INV-001',
      issue_date: '2024-01-15',
      due_date: '2024-02-15',
      invoice_status: 'issued',
      payment_status: 'unsettled',
      total_amount_with_vat: 110000,
      partner_name: 'テスト顧客A',
      partner_id: 1,
      title: 'テスト請求書',
      invoice_contents: [
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
      invoice_number: 'INV-002',
      issue_date: '2024-01-20',
      due_date: '2024-02-20',
      invoice_status: 'draft',
      payment_status: 'unsettled',
      total_amount_with_vat: 55000,
      partner_name: 'テスト顧客B',
      partner_id: 2,
      title: 'テスト請求書2'
    }
  ];

  private mockTemplates = {
    invoice_templates: [
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

  async getInvoices(params: any) {
    const filteredInvoices = this.mockInvoices.filter(invoice => {
      if (params.invoice_status && invoice.invoice_status !== params.invoice_status) {
        return false;
      }
      if (params.partner_id && invoice.partner_id !== params.partner_id) {
        return false;
      }
      return true;
    });

    return {
      invoices: filteredInvoices,
      meta: { total_count: filteredInvoices.length }
    };
  }

  async getInvoiceDetails(invoiceId: number, companyId: number) {
    const invoice = this.mockInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  }

  async createInvoice(invoiceData: any) {
    const newInvoice = {
      id: 999,
      invoice_number: 'INV-NEW',
      invoice_status: 'draft',
      ...invoiceData
    };
    return newInvoice;
  }

  async updateInvoice(invoiceId: number, invoiceData: any) {
    const existingInvoice = this.mockInvoices.find(inv => inv.id === invoiceId);
    if (!existingInvoice) {
      throw new Error('Invoice not found');
    }
    return { ...existingInvoice, ...invoiceData };
  }

  async getInvoiceTemplates(companyId: number) {
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

describe('InvoiceToolHandler', () => {
  let container: Container;
  let invoiceHandler: InvoiceToolHandler;
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

    // InvoiceToolHandlerをコンテナに登録
    container.bind(TYPES.InvoiceToolHandler).to(InvoiceToolHandler);

    // InvoiceToolHandlerのインスタンスを取得
    invoiceHandler = container.get<InvoiceToolHandler>(TYPES.InvoiceToolHandler);
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('getToolInfo()', () => {
    it('should return correct tool information', () => {
      const toolInfo = invoiceHandler.getToolInfo();

      expect(toolInfo).toHaveLength(5);
      expect(toolInfo.map(tool => tool.name)).toEqual([
        'get-invoices',
        'get-invoice-details',
        'create-invoice',
        'update-invoice',
        'get-invoice-templates'
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
      expect(invoiceHandler.supportsTool('get-invoices')).toBe(true);
      expect(invoiceHandler.supportsTool('get-invoice-details')).toBe(true);
      expect(invoiceHandler.supportsTool('create-invoice')).toBe(true);
      expect(invoiceHandler.supportsTool('update-invoice')).toBe(true);
      expect(invoiceHandler.supportsTool('get-invoice-templates')).toBe(true);
    });

    it('should return false for unsupported tools', () => {
      expect(invoiceHandler.supportsTool('unsupported-tool')).toBe(false);
      expect(invoiceHandler.supportsTool('get-deals')).toBe(false);
    });
  });

  describe('getName()', () => {
    it('should return correct handler name', () => {
      expect(invoiceHandler.getName()).toBe('InvoiceToolHandler');
    });
  });

  describe('getDescription()', () => {
    it('should return correct handler description', () => {
      expect(invoiceHandler.getDescription()).toBe('freee会計の請求書データを管理するツールハンドラー');
    });
  });

  describe('executeTool()', () => {
    describe('get-invoices', () => {
      it('should successfully get invoices list', async () => {
        const args = { limit: 10, offset: 0 };
        const result = await invoiceHandler.executeTool('get-invoices', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('請求書一覧を取得しました');
        }
      });

      it('should handle validation errors', async () => {
        jest.spyOn(mockValidator, 'validateDto').mockResolvedValueOnce(
          err({ type: 'VALIDATION_ERROR', message: 'Invalid data', retryable: false })
        );

        const result = await invoiceHandler.executeTool('get-invoices', {});

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-invoice-details', () => {
      it('should successfully get invoice details', async () => {
        const args = { invoice_id: 1 };
        const result = await invoiceHandler.executeTool('get-invoice-details', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('請求書詳細を取得しました');
        }
      });

      it('should handle missing invoice_id', async () => {
        const args = {};
        const result = await invoiceHandler.executeTool('get-invoice-details', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('create-invoice', () => {
      it('should successfully create invoice', async () => {
        const args = {
          due_date: '2024-02-15',
          invoice_contents: [
            {
              order: 1,
              type: 'normal',
              description: 'テストサービス',
              amount: 100000
            }
          ]
        };
        const result = await invoiceHandler.executeTool('create-invoice', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('請求書を作成しました');
        }
      });

      it('should handle validation errors for missing required fields', async () => {
        const args = {}; // Missing required fields
        const result = await invoiceHandler.executeTool('create-invoice', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('update-invoice', () => {
      it('should successfully update invoice', async () => {
        const args = {
          invoice_id: 1,
          title: '更新されたタイトル'
        };
        const result = await invoiceHandler.executeTool('update-invoice', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('請求書を更新しました');
        }
      });

      it('should handle missing invoice_id', async () => {
        const args = { title: 'タイトル' };
        const result = await invoiceHandler.executeTool('update-invoice', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-invoice-templates', () => {
      it('should successfully get invoice templates', async () => {
        const args = {};
        const result = await invoiceHandler.executeTool('get-invoice-templates', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('請求書テンプレート一覧を取得しました');
        }
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool', async () => {
        const result = await invoiceHandler.executeTool('unknown-tool', {});

        expect(result.isErr()).toBe(true);
      });
    });
  });
});