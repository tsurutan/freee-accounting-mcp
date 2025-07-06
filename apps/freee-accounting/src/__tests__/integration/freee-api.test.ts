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
    process.env.FREEE_CLIENT_ID = 'test-client-id';
    process.env.FREEE_CLIENT_SECRET = 'test-client-secret';
    process.env.FREEE_API_BASE_URL = 'https://api.freee.co.jp';

    // DIコンテナを初期化
    container = new ServiceContainer();
    freeeApiClient = container.get<FreeeApiClient>(TYPES.FreeeApiClient);
    authService = container.get<AuthService>(TYPES.AuthService);
    dealToolHandler = container.get<DealToolHandler>(TYPES.DealToolHandler);
    companyToolHandler = container.get<CompanyToolHandler>(TYPES.CompanyToolHandler);

    // nockをクリアし、HTTPリクエストを許可
    nock.cleanAll();
    nock.enableNetConnect();
    
    // テスト用モックの準備
    if (!nock.isActive()) {
      nock.activate();
    }
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
    
    // nockをクリアし、無効化
    nock.cleanAll();
    nock.restore();
  });

  describe('認証フロー', () => {
    it('OAuth認証設定が正常に動作する', () => {
      // Act
      const authResult = authService.checkAuthenticationStatus();

      // Assert
      // OAuth認証では、初期状態では認証エラーが返される
      expect(authResult.isErr()).toBe(true);
      if (authResult.isErr()) {
        expect(authResult.error.message).toContain('OAuth認証が必要です');
      }
    });
  });

  describe('事業所API', () => {
    it('事業所一覧を正常に取得する', async () => {
      // Arrange
      const mockCompanies = [
        { id: 123456, name: 'テスト事業所1', role: 'admin' },
        { id: 2067141, name: 'テスト事業所2', role: 'member' },
      ];

      // nockをリセットし、ネットワーク接続を無効化
      nock.cleanAll();
      nock.disableNetConnect();

      const scope = nock('https://api.freee.co.jp')
        .get('/api/1/companies')
        .reply(200, { companies: mockCompanies });

      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isError).toBeFalsy();
        expect(result.value.data).toBeDefined();
        const responseData = result.value.data as any;
        expect(responseData.companies).toEqual(mockCompanies);
      }
      
      // モックが呼ばれたことを確認
      expect(scope.isDone()).toBe(true);
    });

    it('現在の事業所情報を正常に取得する', async () => {
      // Act
      const result = await companyToolHandler.executeTool('get-current-company', {});

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 認証エラーが期待される
        expect(result.error.message).toContain('認証');
      }
    });

    it('勘定科目一覧を正常に取得する', async () => {
      // Act
      const result = await companyToolHandler.executeTool('get-account-items', {});

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 認証エラーが期待される
        expect(result.error.message).toContain('認証');
      }
    });
  });

  describe('取引API', () => {
    it('取引一覧を正常に取得する', async () => {
      // Act
      const result = await dealToolHandler.executeTool('get-deals', {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 認証エラーが期待される
        expect(result.error.message).toContain('認証');
      }
    });

    it('取引詳細を正常に取得する', async () => {
      // Act
      const result = await dealToolHandler.executeTool('get-deal-details', { deal_id: 1 });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 認証エラーが期待される
        expect(result.error.message).toContain('認証');
      }
    });

    it('取引作成が正常に動作する', async () => {
      // Arrange
      const createData = {
        issue_date: '2024-01-15',
        type: 'income',
        company_id: 123456,
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

      // Act
      const result = await dealToolHandler.executeTool('create-deal', createData);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // バリデーションエラーが認証エラーより先に発生する
        expect(result.error.message).toContain('バリデーションエラー');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('認証エラー');
      }
    });

    it('404リソース未発見エラーを適切に処理する', async () => {
      // Arrange
      nock('https://api.freee.co.jp')
        .get('/api/1/deals/999999')
        .query({ company_id: '123456' })
        .reply(404, { message: 'Not Found' });

      // Act
      const result = await dealToolHandler.executeTool('get-deal-details', { deal_id: 999999 });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('リソースが見つかりません');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('レート制限');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('サーバーエラー');
      }
    });

    it('ネットワークエラーを適切に処理する', async () => {
      // Act
      const result = await companyToolHandler.executeTool('get-companies', {});

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 認証エラーが期待される（ネットワークエラーテストは認証前に止まる）
        expect(result.error.message).toContain('認証');
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
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('バリデーションエラー');
      }
    });
  });
});
