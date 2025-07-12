/**
 * AppConfig ユニットテスト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { AppConfig } from '../../../config/app-config.js';
import { EnvironmentConfig } from '../../../config/environment-config.js';
import { TYPES } from '../../../container/types.js';

describe('AppConfig', () => {
  let container: Container;
  let appConfig: AppConfig;
  let mockEnvConfig: jest.Mocked<EnvironmentConfig>;

  beforeEach(() => {
    container = new Container();

    // モックの作成
    mockEnvConfig = {
      oauthConfig: {
        baseUrl: 'https://api.test.freee.co.jp',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/callback',
      },
    } as any;

    // DIコンテナにモックを登録
    container.bind(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfig);
    container.bind(AppConfig).toSelf();

    appConfig = container.get(AppConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up container to prevent memory leaks
    if (container) {
      container.unbindAll();
    }
  });

  describe('constructor', () => {
    it('デフォルト値で初期化される', () => {
      // Assert
      expect(appConfig.companyId).toBe(123456);
      expect(appConfig.baseUrl).toBe('https://api.test.freee.co.jp');
      expect(appConfig.defaultDealsPeriodDays).toBe(30);
      expect(appConfig.defaultDealsLimit).toBe(100);
      expect(appConfig.cacheTtl).toBe(5 * 60 * 1000);
      expect(appConfig.retryConfig.maxRetries).toBe(3);
      expect(appConfig.retryConfig.retryDelay).toBe(1000);
      expect(appConfig.metricsInterval).toBe(60 * 1000);
    });

    it('環境設定がない場合、デフォルトのbaseUrlを使用する', () => {
      // Arrange
      const mockEnvConfigWithoutOAuth = {
        oauthConfig: undefined,
      } as any;
      
      const testContainer = new Container();
      testContainer.bind<EnvironmentConfig>(TYPES.EnvironmentConfig).toConstantValue(mockEnvConfigWithoutOAuth);
      testContainer.bind(AppConfig).toSelf();
      
      // Act
      const newAppConfig = testContainer.get(AppConfig);

      // Assert
      expect(newAppConfig.baseUrl).toBe('https://api.freee.co.jp');
    });
  });

  describe('getters', () => {
    it('companyIdを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.companyId).toBe(123456);
    });

    it('baseUrlを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.baseUrl).toBe('https://api.test.freee.co.jp');
    });

    it('defaultDealsPeriodDaysを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.defaultDealsPeriodDays).toBe(30);
    });

    it('defaultDealsLimitを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.defaultDealsLimit).toBe(100);
    });

    it('cacheTtlを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.cacheTtl).toBe(5 * 60 * 1000);
    });

    it('retryConfigを正しく取得する', () => {
      // Act
      const retryConfig = appConfig.retryConfig;

      // Assert
      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.retryDelay).toBe(1000);
    });

    it('metricsIntervalを正しく取得する', () => {
      // Act & Assert
      expect(appConfig.metricsInterval).toBe(60 * 1000);
    });
  });

  describe('getAll', () => {
    it('全設定を正しく取得する', () => {
      // Act
      const allConfig = appConfig.getAll();

      // Assert
      expect(allConfig).toEqual({
        companyId: 123456,
        baseUrl: 'https://api.test.freee.co.jp',
        defaultDealsPeriodDays: 30,
        defaultDealsLimit: 100,
        cacheTtl: 5 * 60 * 1000,
        retry: {
          maxRetries: 3,
          retryDelay: 1000,
        },
        metricsInterval: 60 * 1000,
      });
    });

    it('設定オブジェクトのコピーを返す', () => {
      // Act
      const allConfig1 = appConfig.getAll();
      const allConfig2 = appConfig.getAll();

      // Assert
      expect(allConfig1).toEqual(allConfig2);
      expect(allConfig1).not.toBe(allConfig2); // 異なるオブジェクト参照
    });
  });

  describe('getDateRange', () => {
    beforeEach(() => {
      // 固定日時でテスト
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('デフォルト期間（30日）の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getDateRange();

      // Assert
      expect(result.endDate).toBe('2024-01-15');
      expect(result.startDate).toBe('2023-12-16'); // 30日前
    });

    it('指定した期間の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getDateRange(7);

      // Assert
      expect(result.endDate).toBe('2024-01-15');
      expect(result.startDate).toBe('2024-01-08'); // 7日前
    });

    it('1日の期間の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getDateRange(1);

      // Assert
      expect(result.endDate).toBe('2024-01-15');
      expect(result.startDate).toBe('2024-01-14'); // 1日前
    });

    it('0日の期間の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getDateRange(0);

      // Assert
      expect(result.endDate).toBe('2024-01-15');
      expect(result.startDate).toBe('2024-01-15'); // 同じ日
    });
  });

  describe('getMonthDateRange', () => {
    it('2024年1月の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2024, 1);

      // Assert
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
    });

    it('2024年2月（うるう年）の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2024, 2);

      // Assert
      expect(result.startDate).toBe('2024-02-01');
      expect(result.endDate).toBe('2024-02-29');
    });

    it('2023年2月（平年）の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2023, 2);

      // Assert
      expect(result.startDate).toBe('2023-02-01');
      expect(result.endDate).toBe('2023-02-28');
    });

    it('2024年12月の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2024, 12);

      // Assert
      expect(result.startDate).toBe('2024-12-01');
      expect(result.endDate).toBe('2024-12-31');
    });

    it('2024年4月（30日の月）の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2024, 4);

      // Assert
      expect(result.startDate).toBe('2024-04-01');
      expect(result.endDate).toBe('2024-04-30');
    });

    it('年をまたぐ月の日付範囲を正しく生成する', () => {
      // Act
      const result = appConfig.getMonthDateRange(2023, 12);

      // Assert
      expect(result.startDate).toBe('2023-12-01');
      expect(result.endDate).toBe('2023-12-31');
    });
  });

  describe('設定の不変性', () => {
    it('外部から設定を変更できない', () => {
      // Act
      const config = appConfig.getAll();
      config.companyId = 999999;
      config.retry.maxRetries = 999;

      // Assert
      expect(appConfig.companyId).toBe(123456);
      expect(appConfig.retryConfig.maxRetries).toBe(3);
    });
  });
});
