/**
 * freee API 統合テスト（モック使用）
 */

import 'reflect-metadata';
import nock from 'nock';
import { Container } from 'inversify';
import { ServiceContainer } from '../../container/service-container.js';
import { FreeeApiClient } from '../../infrastructure/freee-api-client.js';
import { AuthService } from '../../services/auth-service.js';
import { DealToolHandler } from '../../handlers/deal-tool-handler.js';
import { CompanyToolHandler } from '../../handlers/company-tool-handler.js';
import { TYPES } from '../../container/types.js';

describe('freee API Integration', () => {
  let container: ServiceContainer;
  let freeeApiClient: FreeeApiClient;
  let authService: AuthService;
  let dealToolHandler: DealToolHandler;
  let companyToolHandler: CompanyToolHandler;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };

    // テスト用環境変数を設定
    process.env.FREEE_ACCESS_TOKEN = 'test-access-token';
    process.env.FREEE_API_BASE_URL = 'https://api.freee.co.jp';

    // DIコンテナを初期化
    container = new ServiceContainer();
    freeeApiClient = container.get<FreeeApiClient>(TYPES.FreeeApiClient);
    authService = container.get<AuthService>(TYPES.AuthService);
    dealToolHandler = container.get<DealToolHandler>(TYPES.ToolHandler);
    companyToolHandler = container.get<CompanyToolHandler>(TYPES.ToolHandler);

    // nockをクリア
    nock.cleanAll();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    
    // nockをクリア
    nock.cleanAll();
  });

  describe('認証フロー', () => {
    it('直接トークン認証が正常に動作する', () => {
      // Act
      const authResult = authService.checkAuthenticationStatus();

      // Assert
      expect(authResult.isOk()).toBe(true);
      if (authResult.isOk()) {
        expect(authResult.value.isAuthenticated).toBe(true);
        expect(authResult.value.authMode).toBe('direct_token');
      }
    });

    it('OAuth認証設定が正常に動作する', () => {
      // Arrange
      process.env.FREEE_ACCESS_TOKEN = '';
      process.env.FREEE_CLIENT_ID = 'test-client-id';
      process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
      
      // 新しいコンテナで再初期化
      const newContainer = new ServiceContainer();
      const newAuthService = newContainer.get<AuthService>(TYPES.AuthService);

      // Act
      const authResult = newAuthService.checkAuthenticationStatus();

      // Assert
      expect(authResult.isOk()).toBe(true);
      if (authResult.isOk()) {
        expect(authResult.value.authMode).toBe('oauth');
      }
    });
  });

  describe('事業所API', () => {
    it('事業所一覧を正常に取得する', async () => {
      // Arrange
      const mockCompanies = [
        { id: 2067140, name: 'テスト事業所1', role: 'admin' },
        { id: 2067141, name: 'テスト事業所2', role: 'member' },
      ];

      nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .reply(200, { companies: mockCompanies });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        const responseData = result.value.data as any;
        expect(responseData.companies).toEqual(mockCompanies);
      }
    });

    it('現在の事業所情報を正常に取得する', async () => {
      // Arrange
      const mockCompany = {
        id: 2067140,
        name: 'テスト事業所',
        name_kana: 'テストジギョウショ',
        display_name: 'テスト事業所',
        role: 'admin',
      };

      nock('https://api.freee.co.jp')
        .get('/api/1/companies/2067140')
        .reply(200, mockCompany);

      // Act
      const result = await companyToolHandler.executeTool('get-current-company', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.data).toEqual(mockCompany);
      }
    });

    it('勘定科目一覧を正常に取得する', async () => {
      // Arrange
      const mockAccountItems = [
        { id: 1, name: '現金', category: 'asset' },
        { id: 2, name: '売上高', category: 'revenue' },
      ];

      nock('https://api.freee.co.jp')
        .get('/api/1/account_items')
        .query({ company_id: 2067140 })
        .reply(200, { account_items: mockAccountItems });

      // Act
      const result = await companyToolHandler.executeTool('get-account-items', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        const responseData2 = result.value.data as any;
        expect(responseData2.account_items).toEqual(mockAccountItems);
      }
    });
  });

  describe('取引API', () => {
    it('取引一覧を正常に取得する', async () => {
      // Arrange
      const mockDeals = [
        {
          id: 1,
          issue_date: '2024-01-15',
          type: 'income',
          amount: 10000,
          details: [
            { account_item_id: 1, amount: 10000, entry_side: 'debit' },
          ],
        },
        {
          id: 2,
          issue_date: '2024-01-16',
          type: 'expense',
          amount: 5000,
          details: [
            { account_item_id: 2, amount: 5000, entry_side: 'credit' },
          ],
        },
      ];

      nock('https://api.freee.co.jp')
        .get('/api/1/deals')
        .query(true) // 任意のクエリパラメータを許可
        .reply(200, {
          deals: mockDeals,
          meta: { total_count: 2, limit: 100, offset: 0 },
        });

      // Act
      const result = await dealToolHandler.executeTool('get-deals', {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        const responseData3 = result.value.data as any;
        expect(responseData3.deals).toEqual(mockDeals);
        expect(responseData3.meta.total_count).toBe(2);
      }
    });

    it('取引詳細を正常に取得する', async () => {
      // Arrange
      const mockDeal = {
        id: 1,
        issue_date: '2024-01-15',
        type: 'income',
        amount: 10000,
        details: [
          {
            id: 1,
            account_item_id: 1,
            amount: 10000,
            entry_side: 'debit',
            description: 'テスト取引',
          },
        ],
      };

      nock('https://api.freee.co.jp')
        .get('/api/1/deals/1')
        .query({ company_id: 2067140 })
        .reply(200, mockDeal);

      // Act
      const result = await dealToolHandler.executeTool('get-deal-details', { deal_id: 1 });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        expect(result.value.data).toEqual(mockDeal);
      }
    });

    it('取引作成が正常に動作する', async () => {
      // Arrange
      const createData = {
        issue_date: '2024-01-15',
        type: 'income',
        company_id: 2067140,
        details: [
          {
            account_item_id: 1,
            tax_code: 1,
            amount: 10000,
            entry_side: 'debit',
            description: 'テスト取引',
          },
        ],
      };

      const mockCreatedDeal = {
        id: 123,
        ...createData,
        details: [
          {
            id: 456,
            ...createData.details[0],
          },
        ],
      };

      nock('https://api.freee.co.jp')
        .post('/api/1/deals', createData)
        .reply(201, mockCreatedDeal);

      // Act
      const result = await dealToolHandler.executeTool('create-deal', createData);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(true);
        const responseData4 = result.value.data as any;
        expect(responseData4.id).toBe(123);
        expect(responseData4.issue_date).toBe('2024-01-15');
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('401認証エラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .reply(401, { message: 'Unauthorized' });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('認証エラー');
      }
    });

    it('404リソース未発見エラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/deals/999999')
        .query(true)
        .reply(404, { message: 'Not Found' });

      // Act
      const result = await dealToolHandler.executeTool('get-deal-details', { deal_id: 999999 });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('リソースが見つかりません');
      }
    });

    it('429レート制限エラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .reply(429, { message: 'Too Many Requests' }, { 'Retry-After': '60' });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('レート制限');
      }
    });

    it('500サーバーエラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .reply(500, { message: 'Internal Server Error' });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('サーバーエラー');
      }
    });

    it('ネットワークエラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('ネットワークエラー');
      }
    });
  });

  describe('バリデーション', () => {
    it('無効な取引データを適切に検証する', async () => {
      // Arrange
      const invalidData = {
        issue_date: 'invalid-date',
        type: 'invalid-type',
        company_id: 'invalid-id',
        details: [],
      };

      // Act
      const result = await dealToolHandler.executeTool('create-deal', invalidData);

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.success).toBe(false);
        expect(result.value.error).toContain('バリデーションエラー');
      }
    });
  });
});
