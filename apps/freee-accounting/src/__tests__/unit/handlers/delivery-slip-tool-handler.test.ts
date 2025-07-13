/**
 * DeliverySlipToolHandler ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { DeliverySlipToolHandler } from '../../../handlers/delivery-slip-tool-handler.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

// モッククラス
class MockAuthService {
  async checkAuth() {
    return ok({ isAuthenticated: true, user: 'test' });
  }
}

class MockResponseBuilder {
  formatDeliverySlipsResponse(deliverySlips: any[], companyId: number, filters: any) {
    return `納品書一覧を取得しました。\n事業所ID: ${companyId}\n納品書数: ${deliverySlips.length}件`;
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
    // Simulate basic validation for DeliverySlip DTOs
    if (dto.constructor.name === 'CreateDeliverySlipDto') {
      if (!dto.delivery_slip_contents || dto.delivery_slip_contents.length === 0) {
        return err({ type: 'VALIDATION_ERROR', message: 'delivery_slip_contents は必須です', retryable: false });
      }
    }
    if (dto.constructor.name === 'UpdateDeliverySlipDto') {
      if (!dto.delivery_slip_id) {
        return err({ type: 'VALIDATION_ERROR', message: 'delivery_slip_id は必須です', retryable: false });
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
  private mockDeliverySlips = [
    {
      id: 1,
      delivery_slip_number: 'DEL-001',
      delivery_date: '2024-01-15',
      delivery_slip_status: 'issued',
      total_amount_with_vat: 110000,
      partner_name: 'テスト顧客A',
      partner_id: 1,
      title: 'テスト納品書',
      delivery_slip_contents: [
        {
          id: 1,
          order: 1,
          type: 'normal',
          description: 'テスト商品',
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
      delivery_slip_number: 'DEL-002',
      delivery_date: '2024-01-20',
      delivery_slip_status: 'draft',
      total_amount_with_vat: 55000,
      partner_name: 'テスト顧客B',
      partner_id: 2,
      title: 'テスト納品書2'
    }
  ];

  private mockTemplates = {
    delivery_slip_templates: [
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

  async getDeliverySlips(params: any) {
    const filteredDeliverySlips = this.mockDeliverySlips.filter(deliverySlip => {
      if (params.delivery_slip_status && deliverySlip.delivery_slip_status !== params.delivery_slip_status) {
        return false;
      }
      if (params.partner_id && deliverySlip.partner_id !== params.partner_id) {
        return false;
      }
      return true;
    });

    return {
      delivery_slips: filteredDeliverySlips,
      meta: { total_count: filteredDeliverySlips.length }
    };
  }

  async getDeliverySlipDetails(deliverySlipId: number, companyId: number) {
    const deliverySlip = this.mockDeliverySlips.find(ds => ds.id === deliverySlipId);
    if (!deliverySlip) {
      throw new Error('Delivery slip not found');
    }
    return deliverySlip;
  }

  async createDeliverySlip(deliverySlipData: any) {
    const newDeliverySlip = {
      id: 999,
      delivery_slip_number: 'DEL-NEW',
      delivery_slip_status: 'draft',
      ...deliverySlipData
    };
    return newDeliverySlip;
  }

  async updateDeliverySlip(deliverySlipId: number, deliverySlipData: any) {
    const existingDeliverySlip = this.mockDeliverySlips.find(ds => ds.id === deliverySlipId);
    if (!existingDeliverySlip) {
      throw new Error('Delivery slip not found');
    }
    return { ...existingDeliverySlip, ...deliverySlipData };
  }

  async getDeliverySlipTemplates(companyId: number) {
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

describe('DeliverySlipToolHandler', () => {
  let container: Container;
  let deliverySlipHandler: DeliverySlipToolHandler;
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

    // DeliverySlipToolHandlerをコンテナに登録
    container.bind(TYPES.DeliverySlipToolHandler).to(DeliverySlipToolHandler);

    // DeliverySlipToolHandlerのインスタンスを取得
    deliverySlipHandler = container.get<DeliverySlipToolHandler>(TYPES.DeliverySlipToolHandler);
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('getToolInfo()', () => {
    it('should return correct tool information', () => {
      const toolInfo = deliverySlipHandler.getToolInfo();

      expect(toolInfo).toHaveLength(5);
      expect(toolInfo.map(tool => tool.name)).toEqual([
        'get-delivery-slips',
        'get-delivery-slip-details',
        'create-delivery-slip',
        'update-delivery-slip',
        'get-delivery-slip-templates'
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
      expect(deliverySlipHandler.supportsTool('get-delivery-slips')).toBe(true);
      expect(deliverySlipHandler.supportsTool('get-delivery-slip-details')).toBe(true);
      expect(deliverySlipHandler.supportsTool('create-delivery-slip')).toBe(true);
      expect(deliverySlipHandler.supportsTool('update-delivery-slip')).toBe(true);
      expect(deliverySlipHandler.supportsTool('get-delivery-slip-templates')).toBe(true);
    });

    it('should return false for unsupported tools', () => {
      expect(deliverySlipHandler.supportsTool('unsupported-tool')).toBe(false);
      expect(deliverySlipHandler.supportsTool('get-deals')).toBe(false);
    });
  });

  describe('getName()', () => {
    it('should return correct handler name', () => {
      expect(deliverySlipHandler.getName()).toBe('DeliverySlipToolHandler');
    });
  });

  describe('getDescription()', () => {
    it('should return correct handler description', () => {
      expect(deliverySlipHandler.getDescription()).toBe('freee会計の納品書データを管理するツールハンドラー');
    });
  });

  describe('executeTool()', () => {
    describe('get-delivery-slips', () => {
      it('should successfully get delivery slips list', async () => {
        const args = { limit: 10, offset: 0 };
        const result = await deliverySlipHandler.executeTool('get-delivery-slips', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('納品書一覧を取得しました');
        }
      });

      it('should handle validation errors', async () => {
        jest.spyOn(mockValidator, 'validateDto').mockResolvedValueOnce(
          err({ type: 'VALIDATION_ERROR', message: 'Invalid data', retryable: false })
        );

        const result = await deliverySlipHandler.executeTool('get-delivery-slips', {});

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-delivery-slip-details', () => {
      it('should successfully get delivery slip details', async () => {
        const args = { delivery_slip_id: 1 };
        const result = await deliverySlipHandler.executeTool('get-delivery-slip-details', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('納品書詳細を取得しました');
        }
      });

      it('should handle missing delivery_slip_id', async () => {
        const args = {};
        const result = await deliverySlipHandler.executeTool('get-delivery-slip-details', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('create-delivery-slip', () => {
      it('should successfully create delivery slip', async () => {
        const args = {
          delivery_slip_contents: [
            {
              order: 1,
              type: 'normal',
              description: 'テスト商品',
              amount: 100000
            }
          ]
        };
        const result = await deliverySlipHandler.executeTool('create-delivery-slip', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('納品書を作成しました');
        }
      });

      it('should handle validation errors for missing required fields', async () => {
        const args = {}; // Missing required fields
        const result = await deliverySlipHandler.executeTool('create-delivery-slip', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('update-delivery-slip', () => {
      it('should successfully update delivery slip', async () => {
        const args = {
          delivery_slip_id: 1,
          title: '更新されたタイトル'
        };
        const result = await deliverySlipHandler.executeTool('update-delivery-slip', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('納品書を更新しました');
        }
      });

      it('should handle missing delivery_slip_id', async () => {
        const args = { title: 'タイトル' };
        const result = await deliverySlipHandler.executeTool('update-delivery-slip', args);

        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('VALIDATION_ERROR');
        }
      });
    });

    describe('get-delivery-slip-templates', () => {
      it('should successfully get delivery slip templates', async () => {
        const args = {};
        const result = await deliverySlipHandler.executeTool('get-delivery-slip-templates', args);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.isError).toBe(false);
          expect(result.value.content[0]?.text).toContain('納品書テンプレート一覧を取得しました');
        }
      });
    });

    describe('unknown tool', () => {
      it('should return error for unknown tool', async () => {
        const result = await deliverySlipHandler.executeTool('unknown-tool', {});

        expect(result.isErr()).toBe(true);
      });
    });
  });
});