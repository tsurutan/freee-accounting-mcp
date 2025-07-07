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
  setAccessToken: jest.fn(),
  getCompanies: jest.fn(),
  getDeals: jest.fn(),
};

// OAuthClientのモック
const mockOAuthClient = {
  getAuthState: jest.fn(),
  getValidAccessToken: jest.fn(),
  generateAuthUrl: jest.fn(),
  exchangeCodeForTokens: jest.fn(),
  refreshTokens: jest.fn(),
  getCompanyId: jest.fn(),
  getExternalCid: jest.fn(),
  isCompanySelectionEnabled: jest.fn(),
};

// Mock removed since we no longer use @mcp-server/shared

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
      useOAuth: true,
      baseUrl: 'https://api.freee.co.jp',
      oauthClient: mockOAuthClient,
    } as any;

    mockErrorHandler = {
      fromException: jest.fn(),
      authError: jest.fn(),
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
    
    // FreeeClientのモックを設定
    (freeeApiClient as any).client = mockFreeeClient;

    // OAuthクライアントのモック設定
    mockOAuthClient.getValidAccessToken.mockResolvedValue('test_access_token');
    mockOAuthClient.getAuthState.mockReturnValue({
      isAuthenticated: true,
      tokens: { access_token: 'test_access_token' },
      expiresAt: Date.now() / 1000 + 3600
    });

    // モックのリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('call', () => {
    it('GET リクエストが成功する場合（OAuth認証あり）', async () => {
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
      // OAuth認証が呼ばれることを確認
      expect(mockOAuthClient.getValidAccessToken).toHaveBeenCalled();
      expect(mockFreeeClient.setAccessToken).toHaveBeenCalledWith('test_access_token');
      expect(mockLogger.apiRequest).toHaveBeenCalledWith(
        'GET',
        '/api/1/companies/123',
        200,
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('POST リクエストが成功する場合（OAuth認証あり）', async () => {
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
      // OAuth認証が呼ばれることを確認
      expect(mockOAuthClient.getValidAccessToken).toHaveBeenCalled();
      expect(mockFreeeClient.setAccessToken).toHaveBeenCalledWith('test_access_token');
      expect(mockLogger.apiRequest).toHaveBeenCalledWith(
        'POST',
        '/api/1/deals',
        201,
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('OAuth認証に失敗する場合', async () => {
      // Arrange
      const authError = new Error('Token expired');
      mockOAuthClient.getValidAccessToken.mockRejectedValue(authError);
      const appError = {
        type: 'AUTH_ERROR',
        message: '認証エラー: アクセストークンが無効です',
        retryable: false,
      };
      mockErrorHandler.authError.mockReturnValue(appError as any);

      // Act
      const result = await freeeApiClient.call('GET', '/api/1/companies/123');

      // Assert
      expect(result.isErr()).toBe(true);
      expect(mockOAuthClient.getValidAccessToken).toHaveBeenCalled();
      expect(mockFreeeClient.setAccessToken).not.toHaveBeenCalled();
      expect(mockErrorHandler.authError).toHaveBeenCalledWith('認証エラー: アクセストークンが無効です');
    });

    it('OAuth無効時はトークン注入をスキップする', async () => {
      // Arrange
      Object.assign(mockEnvConfig, { useOAuth: false, oauthClient: undefined });
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
      // OAuth認証が呼ばれないことを確認
      expect(mockOAuthClient.getValidAccessToken).not.toHaveBeenCalled();
      expect(mockFreeeClient.setAccessToken).not.toHaveBeenCalled();
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
      const mockResponse = {
        data: { companies: mockCompanies },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getCompanies();

      // Assert
      expect(result).toEqual({ companies: mockCompanies });
      expect(mockFreeeClient.get).toHaveBeenCalledWith('/api/1/companies', { params: undefined });
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
        data: {
          deals: mockDeals,
          meta: { total_count: 2 },
        },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getDeals(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/1/deals?company_id=2067140'),
        { params: undefined }
      );
    });
  });

  describe('getAccountItems', () => {
    it('勘定科目一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
        base_date: '2024-01-01',
      };
      const mockAccountItems = [
        { id: 1, name: '現金', account_category: 'assets' },
        { id: 2, name: '普通預金', account_category: 'assets' },
      ];
      const mockResponse = {
        data: { account_items: mockAccountItems },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getAccountItems(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/1/account_items?company_id=2067140&base_date=2024-01-01'),
        { params: undefined }
      );
    });
  });

  describe('getPartners', () => {
    it('取引先一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
        limit: 50,
        offset: 0,
      };
      const mockPartners = [
        { id: 1, name: 'パートナー1', code: 'P001' },
        { id: 2, name: 'パートナー2', code: 'P002' },
      ];
      const mockResponse = {
        data: { partners: mockPartners },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getPartners(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/1/partners?company_id=2067140&limit=50&offset=0'),
        { params: undefined }
      );
    });
  });

  describe('getSections', () => {
    it('部門一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
      };
      const mockSections = [
        { id: 1, name: '営業部', code: 'SALES' },
        { id: 2, name: '開発部', code: 'DEV' },
      ];
      const mockResponse = {
        data: { sections: mockSections },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getSections(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        '/api/1/sections?company_id=2067140',
        { params: undefined }
      );
    });
  });

  describe('getItems', () => {
    it('品目一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
        limit: 100,
        offset: 0,
      };
      const mockItems = [
        { id: 1, name: '商品A', code: 'ITEM001' },
        { id: 2, name: '商品B', code: 'ITEM002' },
      ];
      const mockResponse = {
        data: { items: mockItems },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getItems(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/1/items?company_id=2067140&limit=100&offset=0'),
        { params: undefined }
      );
    });
  });

  describe('getTags', () => {
    it('メモタグ一覧を正しく取得する', async () => {
      // Arrange
      const params = {
        company_id: 2067140,
      };
      const mockTags = [
        { id: 1, name: '重要' },
        { id: 2, name: '緊急' },
      ];
      const mockResponse = {
        data: { tags: mockTags },
        status: 200,
        headers: {},
      };
      mockFreeeClient.get.mockResolvedValue(mockResponse);

      // Act
      const result = await freeeApiClient.getTags(params);

      // Assert
      expect(result).toEqual(mockResponse.data);
      expect(mockFreeeClient.get).toHaveBeenCalledWith(
        '/api/1/tags?company_id=2067140',
        { params: undefined }
      );
    });
  });

  describe('generateRequestId', () => {
    it('リクエストIDを正しく生成する', () => {
      // Act
      const requestId1 = (freeeApiClient as any).generateRequestId();
      const requestId2 = (freeeApiClient as any).generateRequestId();

      // Assert
      expect(requestId1).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(requestId2).toMatch(/^req_\d+_[a-z0-9]{9}$/);
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
