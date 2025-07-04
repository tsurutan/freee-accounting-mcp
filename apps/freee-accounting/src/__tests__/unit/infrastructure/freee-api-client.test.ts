/**
 * FreeeApiClient ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { FreeeApiClient } from '../../../infrastructure/freee-api-client.js';
import { EnvironmentConfig } from '../../../config/environment-config.js';
import { ErrorHandler } from '../../../utils/error-handler.js';
import { Logger } from '../../../infrastructure/logger.js';
import { DebugInterceptor } from '../../../infrastructure/debug-interceptor.js';
import { TYPES } from '../../../container/types.js';
import { ok, err } from 'neverthrow';

// FreeeClientのモック
const mockFreeeClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  getCompanies: jest.fn(),
  getDeals: jest.fn(),
};

// FreeeClientクラスのモック
jest.mock('@mcp-server/shared', () => ({
  FreeeClient: jest.fn().mockImplementation(() => mockFreeeClient),
}));

describe('FreeeApiClient', () => {
  let container: Container;
  let freeeApiClient: FreeeApiClient;
  let mockEnvConfig: jest.Mocked<EnvironmentConfig>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;
  let mockLogger: jest.Mocked<Logger>;
  let mockDebugInterceptor: jest.Mocked<DebugInterceptor>;

  beforeEach(() => {
    container = new Container();

    // モックの作成
    mockEnvConfig = {
      useDirectToken: true,
      useOAuth: false,
      baseUrl: 'https://api.freee.co.jp',
      accessToken: 'test-access-token',
      oauthClient: undefined,
    } as any;

    mockErrorHandler = {
      fromException: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      apiRequest: jest.fn(),
    } as any;

    mockDebugInterceptor = {
      setupInterceptors: jest.fn(),
    } as any;

    // DIコンテナにモックを登録
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfig);
    container.bind(TYPES.ErrorHandler).toConstantValue(mockErrorHandler);
    container.bind(TYPES.Logger).toConstantValue(mockLogger);
    container.bind(TYPES.DebugInterceptor).toConstantValue(mockDebugInterceptor);
    container.bind(FreeeApiClient).toSelf();

    freeeApiClient = container.get(FreeeApiClient);

    // モックのリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('call', () => {
    it('GET リクエストが成功する場合', async () => {
      // Arrange
      const mockResponse = {
        data: { id: 123, name: 'Test Company' },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.call('GET', '/api/1/companies/123');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(mockResponse.data);
        expect(result.value.status).toBe(200);
      }
      expect(mockLogger.apiRequest).toHaveBeenCalledWith(
        'GET',
        '/api/1/companies/123',
        200,
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('POST リクエストが成功する場合', async () => {
      // Arrange
      const requestData = { name: 'New Deal', amount: 1000 };
      const mockResponse = {
        data: { id: 456, ...requestData },
        status: 201,
        headers: {},
      };
      mockFreeeClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.call('POST', '/api/1/deals', {}, requestData);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(mockResponse.data);
        expect(result.value.status).toBe(201);
      }
      expect(mockLogger.apiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/1/deals',
        201,
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('API エラーが発生する場合', async () => {
      // Arrange
      const apiError = new Error('API Error');
      const appError = {
        type: 'API_ERROR',
        message: 'API call failed',
        retryable: true,
      };
      mockFreeeClient.get.mockRejectedValue(apiError);
      mockErrorHandler.fromException.mockReturnValue(appError as any);

      // Act
      const result = await freeeApiClient.call('GET', '/api/1/companies/123');

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(appError);
      }
      expect(mockErrorHandler.fromException).toHaveBeenCalledWith(apiError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'API call failed',
        expect.objectContaining({
          operation: 'api_call',
          method: 'GET',
          url: '/api/1/companies/123',
        })
      );
    });
  });

  describe('get', () => {
    it('GET リクエストを正しく実行する', async () => {
      // Arrange
      const mockResponse = {
        data: { companies: [] },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.get('/api/1/companies', { limit: 10 });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(mockResponse.data);
      }
    });
  });

  describe('post', () => {
    it('POST リクエストを正しく実行する', async () => {
      // Arrange
      const requestData = { name: 'Test Deal' };
      const mockResponse = {
        data: { id: 123, ...requestData },
        status: 201,
        headers: {},
      };
      mockFreeeClient.post.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.post('/api/1/deals', requestData);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(mockResponse.data);
      }
    });
  });

  describe('put', () => {
    it('PUT リクエストを正しく実行する', async () => {
      // Arrange
      const requestData = { name: 'Updated Deal' };
      const mockResponse = {
        data: { id: 123, ...requestData },
        status: 200,
        headers: {},
      };
      mockFreeeClient.put.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.put('/api/1/deals/123', requestData);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.data).toEqual(mockResponse.data);
      }
    });
  });

  describe('delete', () => {
    it('DELETE リクエストを正しく実行する', async () => {
      // Arrange
      const mockResponse = {
        data: {},
        status: 204,
        headers: {},
      };
      mockFreeeClient.delete.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.delete('/api/1/deals/123');

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe(204);
      }
    });
  });

  describe('getCompanies', () => {
    it('事業所一覧を正しく取得する', async () => {
      // Arrange
      const mockCompanies = [
        { id: 2067140, name: 'Test Company 1' },
        { id: 2067141, name: 'Test Company 2' },
      ];
      mockFreeeClient.getCompanies.mockResolvedValue({ companies: mockCompanies });

      // Act
      const result = await freeeApiClient.getCompanies();

      // Assert
      expect(result).toEqual({ companies: mockCompanies });
      expect(mockFreeeClient.getCompanies).toHaveBeenCalled();
    });
  });

  describe('getDeals', () => {
    it('取引一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
        start_issue_date: '2024-01-01',
        end_issue_date: '2024-01-31',
      };
      const mockDeals = [
        { id: 1, issue_date: '2024-01-15', amount: 1000 },
        { id: 2, issue_date: '2024-01-20', amount: 2000 },
      ];
      const mockResponse = {
        deals: mockDeals,
        meta: { total_count: 2 },
      };
      mockFreeeClient.getDeals.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getDeals(params);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockFreeeClient.getDeals).toHaveBeenCalledWith(params);
    });
  });

  describe('generateRequestId', () => {
    it('リクエストIDを正しく生成する', () => {
      // Act
      const requestId1 = (freeeApiClient as any).generateRequestId();
      const requestId2 = (freeeApiClient as any).generateRequestId();

      // Assert
      expect(requestId1).toMatch(/^req_[a-f0-9]{8}$/);
      expect(requestId2).toMatch(/^req_[a-f0-9]{8}$/);
      expect(requestId1).not.toBe(requestId2);
    });
  });

  describe('getDataSize', () => {
    it('データサイズを正しく計算する', () => {
      // Arrange
      const data = { name: 'test', value: 123 };

      // Act
      const size = (freeeApiClient as any).getDataSize(data);

      // Assert
      expect(size).toBe(JSON.stringify(data).length);
    });

    it('undefinedデータのサイズを正しく処理する', () => {
      // Act
      const size = (freeeApiClient as any).getDataSize(undefined);

      // Assert
      expect(size).toBe(0);
    });
  });
});
