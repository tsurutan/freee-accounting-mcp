/**
 * FreeeApiClientのテストスクリプト
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { configureBindings } from './container/bindings.js';
import { TYPES } from './container/types.js';
import { FreeeApiClient } from './infrastructure/freee-api-client.js';

async function testApiClient() {
  console.error('=== FreeeApiClient テスト開始 ===');

  try {
    // DIコンテナの設定
    const container = new Container();
    configureBindings(container);

    // FreeeApiClientを取得
    const apiClient = container.get<FreeeApiClient>(TYPES.FreeeApiClient);
    console.error('✅ FreeeApiClient インスタンス取得成功');

    // 環境設定を確認
    const envConfig = container.get(TYPES.EnvironmentConfig);
    console.error('環境設定:', {
      useOAuth: envConfig.useOAuth,
      hasClientId: envConfig.hasClientId,
      baseUrl: envConfig.baseUrl,
    });

    // 接続テスト
    console.error('\n--- 接続テスト ---');
    const connectionResult = await apiClient.testConnection();
    if (connectionResult.isOk()) {
      console.error('✅ 接続テスト成功');
    } else {
      console.error('❌ 接続テスト失敗:', connectionResult.error);
    }

    // getCompaniesテスト
    console.error('\n--- getCompanies テスト ---');
    try {
      const companies = await apiClient.getCompanies();
      console.error('✅ getCompanies 成功:', companies);
    } catch (error) {
      console.error('❌ getCompanies 失敗:', error);
    }

    // FreeeClientとしてのテスト
    console.error('\n--- FreeeClient互換性テスト ---');
    const freeeClient = container.get(TYPES.FreeeClient);
    try {
      const companiesViaFreeeClient = await freeeClient.getCompanies();
      console.error('✅ FreeeClient.getCompanies 成功:', companiesViaFreeeClient);
    } catch (error) {
      console.error('❌ FreeeClient.getCompanies 失敗:', error);
    }

  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
  }

  console.error('\n=== FreeeApiClient テスト終了 ===');
}

// テスト実行
testApiClient().catch(console.error);
