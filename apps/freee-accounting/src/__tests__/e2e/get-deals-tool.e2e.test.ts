/**
 * get-deals ツール E2E テスト
 * 
 * 注意: このテストは実際のfreee APIを使用するため、
 * 有効なアクセストークンが必要です。
 * CI/CDでは無効化されています。
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { configureBindings } from '../../container/bindings.js';
import { DealToolHandler } from '../../handlers/deal-tool-handler.js';
import { EnvironmentConfig } from '../../config/environment-config.js';
import { TYPES } from '../../container/types.js';

// E2Eテストの実行条件をチェック
const shouldRunE2ETests = () => {
  return process.env.RUN_E2E_TESTS === 'true' && 
         process.env.FREEE_ACCESS_TOKEN && 
         process.env.FREEE_ACCESS_TOKEN !== 'test-access-token';
};

// E2Eテストをスキップする場合の条件
const skipE2ETests = !shouldRunE2ETests();

describe('get-deals Tool E2E Test', () => {
  let container: Container;
  let dealToolHandler: DealToolHandler;
  let envConfig: EnvironmentConfig;

  beforeAll(() => {
    if (skipE2ETests) {
      console.log('E2E tests skipped: Set RUN_E2E_TESTS=true and provide valid FREEE_ACCESS_TOKEN to run');
      return;
    }

    // 実際の環境設定でDIコンテナを初期化
    container = new Container();
    configureBindings(container);
    dealToolHandler = container.get(DealToolHandler);
    envConfig = container.get(TYPES.EnvironmentConfig);
  });

  describe('Real API Integration', () => {
    it('should authenticate successfully', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      // 認証状態の確認
      expect(envConfig.hasAccessToken).toBe(true);
      expect(envConfig.useDirectToken).toBe(true);
    });

    it('should get deals with default parameters', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const result = await dealToolHandler.executeTool('get-deals', {});
      
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const response = result.value;
        
        // レスポンス構造の検証
        expect(response.content).toHaveLength(1);
        expect(response.content?.[0]?.type).toBe('text');
        expect(response.content?.[0]?.text).toContain('取引一覧を取得しました');
        
        // データ構造の検証
        expect(response.data).toHaveProperty('deals');
        expect(response.data).toHaveProperty('meta');
        expect(response.data).toHaveProperty('period');
        expect(response.data).toHaveProperty('company_id');
        
        const responseData = response.data as any;
        expect(Array.isArray(responseData.deals)).toBe(true);
        expect(typeof responseData.meta.total_count).toBe('number');
        expect(responseData.company_id).toBe(2067140);

        // 期間の検証
        expect(responseData.period).toHaveProperty('startDate');
        expect(responseData.period).toHaveProperty('endDate');
        expect(new Date(responseData.period.startDate)).toBeInstanceOf(Date);
        expect(new Date(responseData.period.endDate)).toBeInstanceOf(Date);

        console.log(`✅ 取得した取引数: ${responseData.deals.length}件`);
        console.log(`✅ 総取引数: ${responseData.meta.total_count}件`);
        console.log(`✅ 期間: ${responseData.period.startDate} ～ ${responseData.period.endDate}`);
      }
    }, 30000); // 30秒のタイムアウト

    it('should get deals for specific month', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const args = {
        year: currentYear,
        month: currentMonth
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const response = result.value;
        
        // 期間が正しく設定されているか確認
        const expectedStartDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
        const responseData2 = response.data as any;
        expect(responseData2.period.startDate).toBe(expectedStartDate);

        console.log(`✅ ${currentYear}年${currentMonth}月の取引数: ${responseData2.deals.length}件`);
      }
    }, 30000);

    it('should get deals with limit parameter', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const args = {
        limit: 5
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const response = result.value;
        
        // 取得件数が制限されているか確認
        const responseData3 = response.data as any;
        expect(responseData3.deals.length).toBeLessThanOrEqual(5);

        console.log(`✅ 制限付き取得: ${responseData3.deals.length}件 (最大5件)`);
      }
    }, 30000);

    it('should handle date range with no data', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      // 未来の日付範囲を指定（データが存在しない可能性が高い）
      const futureYear = new Date().getFullYear() + 1;
      const args = {
        start_date: `${futureYear}-01-01`,
        end_date: `${futureYear}-01-31`
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const response = result.value;
        
        // 空のデータでも正常なレスポンス構造
        const responseData4 = response.data as any;
        expect(responseData4.deals).toHaveLength(0);
        expect(responseData4.meta.total_count).toBe(0);

        console.log(`✅ 未来の期間: 取引数 ${responseData4.deals.length}件（期待通り）`);
      }
    }, 30000);

    it('should validate deal data structure', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const result = await dealToolHandler.executeTool('get-deals', { limit: 1 });
      
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const response = result.value;
        
        const responseData5 = response.data as any;
        if (responseData5.deals.length > 0) {
          const deal = responseData5.deals[0];
          
          // 取引データの必須フィールドを検証
          expect(deal).toHaveProperty('id');
          expect(deal).toHaveProperty('issue_date');
          expect(deal).toHaveProperty('type');
          expect(typeof deal.id).toBe('number');
          expect(typeof deal.issue_date).toBe('string');
          expect(['income', 'expense'].includes(deal.type)).toBe(true);
          
          console.log(`✅ 取引データ構造検証完了: ID=${deal.id}, 日付=${deal.issue_date}, タイプ=${deal.type}`);
        } else {
          console.log('✅ 取引データなし（正常）');
        }
      }
    }, 30000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid date gracefully', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const args = {
        start_date: 'invalid-date',
        end_date: '2024-01-31'
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        console.log(`✅ バリデーションエラー正常検出: ${result.error.message}`);
      }
    });

    it('should handle network timeout gracefully', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      // 大きな期間を指定してタイムアウトを誘発する可能性
      const args = {
        start_date: '2020-01-01',
        end_date: '2024-12-31',
        limit: 10000
      };

      const result = await dealToolHandler.executeTool('get-deals', args);
      
      // 成功またはタイムアウトエラーのいずれかを期待
      if (result.isErr()) {
        console.log(`✅ エラーハンドリング確認: ${result.error.type} - ${result.error.message}`);
      } else {
        const resultData = result.value.data as any;
        console.log(`✅ 大量データ取得成功: ${resultData.deals.length}件`);
      }
    }, 60000); // 60秒のタイムアウト
  });

  describe('Performance Benchmarks', () => {
    it('should complete within acceptable time limits', async () => {
      if (skipE2ETests) {
        pending('E2E tests are disabled');
        return;
      }

      const startTime = Date.now();
      
      const result = await dealToolHandler.executeTool('get-deals', {
        limit: 10
      });
      
      const duration = Date.now() - startTime;
      
      expect(result.isOk()).toBe(true);
      expect(duration).toBeLessThan(10000); // 10秒以内
      
      console.log(`✅ パフォーマンス: ${duration}ms`);
    }, 15000);
  });
});
