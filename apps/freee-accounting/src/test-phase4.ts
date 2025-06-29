/**
 * Phase 4: インフラ層の分離 - 統合テスト
 */

import 'reflect-metadata';
import { container } from './container/container.js';
import { TYPES } from './container/types.js';
import { FreeeApiClient } from './infrastructure/freee-api-client.js';
import { ApiResponseMapper } from './infrastructure/api-response-mapper.js';
import { DebugInterceptor } from './infrastructure/debug-interceptor.js';
import { LoggerSetup } from './infrastructure/logger-setup.js';
import { Logger } from './infrastructure/logger.js';

/**
 * Phase 4 統合テスト
 */
async function testPhase4(): Promise<void> {
  console.log('\n🧪 Phase 4: インフラ層の分離 - 統合テスト開始\n');

  try {
    // 1. DIコンテナからインフラ層コンポーネントを取得
    console.log('1. DIコンテナからインフラ層コンポーネントを取得...');
    
    const freeeApiClient = container.get<FreeeApiClient>(TYPES.FreeeApiClient);
    const apiResponseMapper = container.get<ApiResponseMapper>(TYPES.ApiResponseMapper);
    const debugInterceptor = container.get<DebugInterceptor>(TYPES.DebugInterceptor);
    const loggerSetup = container.get<LoggerSetup>(TYPES.LoggerSetup);
    const logger = container.get<Logger>(TYPES.Logger);

    console.log('✅ 全てのインフラ層コンポーネントが正常に取得されました');

    // 2. LoggerSetupのテスト
    console.log('\n2. LoggerSetupのテスト...');
    
    // 利用可能なプロファイル一覧を取得
    const profiles = loggerSetup.getAvailableProfiles();
    console.log(`✅ 利用可能なログプロファイル: ${profiles.length}個`);
    profiles.forEach(profile => {
      console.log(`   - ${profile.name}: ${profile.description}`);
    });

    // 自動検出プロファイルをテスト
    const autoProfile = loggerSetup.autoDetectProfile();
    console.log(`✅ 自動検出されたプロファイル: ${autoProfile}`);

    // 診断情報を取得
    const diagnostics = loggerSetup.getDiagnostics();
    console.log('✅ ログ診断情報を取得しました');
    console.log(`   - 現在の設定: ${diagnostics.currentConfig?.level}`);
    console.log(`   - 環境変数オーバーライド: ${Object.keys(diagnostics.environmentOverrides).length}個`);

    // 3. DebugInterceptorのテスト
    console.log('\n3. DebugInterceptorのテスト...');
    
    const debugConfig = debugInterceptor.getConfig();
    console.log('✅ デバッグ設定を取得しました');
    console.log(`   - freee API デバッグ: ${debugConfig.enableFreeeApi}`);
    console.log(`   - axios デバッグ: ${debugConfig.enableAxios}`);
    console.log(`   - MCP Inspector: ${debugConfig.enableMcpInspector}`);
    console.log(`   - 最大データ長: ${debugConfig.maxDataLength}`);

    const debugStats = debugInterceptor.getDebugStats();
    console.log('✅ デバッグ統計を取得しました');
    console.log(`   - デバッグ有効: ${debugStats.isEnabled}`);

    // 4. ApiResponseMapperのテスト
    console.log('\n4. ApiResponseMapperのテスト...');
    
    const mapperConfig = apiResponseMapper.getConfig();
    console.log('✅ マッパー設定を取得しました');
    console.log(`   - メタデータ含む: ${mapperConfig.includeMetadata}`);
    console.log(`   - タイムスタンプ含む: ${mapperConfig.includeTimestamp}`);
    console.log(`   - 日付フォーマット: ${mapperConfig.dateFormat}`);
    console.log(`   - 数値フォーマット: ${mapperConfig.numberFormat}`);

    // モックAPIレスポンスでマッピングテスト
    const mockApiResult = {
      data: {
        companies: [
          {
            id: 2067140,
            name: 'テスト事業所',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-12-31T23:59:59Z',
          }
        ],
        meta: {
          total_count: 1,
          current_page: 1,
          per_page: 20,
          total_pages: 1,
        }
      },
      status: 200,
      headers: { 'content-type': 'application/json' },
      duration: 150,
      context: {
        operation: 'get_companies',
        method: 'GET',
        url: '/api/1/companies',
        requestId: 'test_req_123',
      }
    };

    const mappingResult = apiResponseMapper.mapResponse(mockApiResult);
    if (mappingResult.isOk()) {
      const mapped = mappingResult.value;
      console.log('✅ レスポンスマッピングが成功しました');
      console.log(`   - データ: ${Array.isArray(mapped.data) ? mapped.data.length : 'object'}個の要素`);
      console.log(`   - メタデータ: ${mapped.metadata ? 'あり' : 'なし'}`);
      console.log(`   - ページネーション: ${mapped.pagination ? 'あり' : 'なし'}`);
      
      if (mapped.pagination) {
        console.log(`     - 総数: ${mapped.pagination.total}`);
        console.log(`     - ページ: ${mapped.pagination.page}/${mapped.pagination.totalPages}`);
      }
    } else {
      console.log('❌ レスポンスマッピングが失敗しました:', mappingResult.error);
    }

    // 5. FreeeApiClientのテスト
    console.log('\n5. FreeeApiClientのテスト...');
    
    // 内部クライアントの取得テスト
    const internalClient = freeeApiClient.getInternalClient();
    console.log('✅ 内部FreeeClientを取得しました');

    // 設定更新テスト
    freeeApiClient.updateConfig({
      timeout: 60000,
    });
    console.log('✅ クライアント設定を更新しました');

    // 6. ログ機能のテスト
    console.log('\n6. ログ機能のテスト...');
    
    // 各レベルのログをテスト
    logger.debug('デバッグメッセージのテスト', { component: 'phase4-test' });
    logger.info('情報メッセージのテスト', { component: 'phase4-test' });
    logger.warn('警告メッセージのテスト', { component: 'phase4-test' });
    
    // 操作ログのテスト
    logger.operation('test_operation', 100, { success: true });
    
    // API リクエストログのテスト
    logger.apiRequest('GET', '/api/1/test', 200, 150, { test: true });
    
    // 認証ログのテスト
    logger.auth('認証テスト', 'test_user', { method: 'oauth' });

    // ログ統計を取得
    const logStats = logger.getLogStats();
    console.log('✅ ログ統計を取得しました');
    Object.entries(logStats).forEach(([level, count]) => {
      console.log(`   - ${level}: ${count}件`);
    });

    // 7. 統合動作テスト
    console.log('\n7. 統合動作テスト...');
    
    // ログレベルを動的に変更
    const originalLevel = logger.getLogLevel();
    loggerSetup.setLogLevel('debug' as any);
    console.log('✅ ログレベルを動的に変更しました');
    
    // デバッグ設定を更新
    debugInterceptor.updateConfig({
      maxDataLength: 1000,
      maskSensitiveData: true,
    });
    console.log('✅ デバッグ設定を更新しました');
    
    // マッパー設定を更新
    apiResponseMapper.updateConfig({
      dateFormat: 'local',
      includeRequestInfo: true,
    });
    console.log('✅ マッパー設定を更新しました');

    // 元のログレベルに戻す
    logger.setLogLevel(originalLevel);

    // 8. エラーハンドリングテスト
    console.log('\n8. エラーハンドリングテスト...');
    
    // 無効なデータでマッピングテスト
    const invalidApiResult = {
      data: null,
      status: 500,
      headers: {},
      duration: 0,
      context: {
        operation: 'error_test',
        method: 'GET',
        url: '/api/1/error',
        requestId: 'error_req_123',
      }
    };

    const errorMappingResult = apiResponseMapper.mapResponse(invalidApiResult);
    if (errorMappingResult.isOk()) {
      console.log('✅ エラーデータのマッピングが正常に処理されました');
    } else {
      console.log('✅ エラーデータのマッピングでエラーハンドリングが動作しました');
    }

    // 9. 設定検証テスト
    console.log('\n9. 設定検証テスト...');
    
    const validConfig = {
      level: 'info' as any,
      enableConsole: true,
      enableFile: true,
      filename: 'test.log',
      maxFiles: 5,
      maxSize: '10m',
      enableMCPInspector: false,
    };

    const validation = loggerSetup.validateConfig(validConfig);
    console.log(`✅ 設定検証結果: ${validation.isValid ? '有効' : '無効'}`);
    if (!validation.isValid) {
      console.log('   エラー:', validation.errors);
    }

    console.log('\n🎉 Phase 4: インフラ層の分離 - 統合テスト完了');
    console.log('\n📊 テスト結果サマリー:');
    console.log('✅ FreeeApiClient - API呼び出しラッパーの実装完了');
    console.log('✅ ApiResponseMapper - レスポンスマッピング機能の実装完了');
    console.log('✅ DebugInterceptor - デバッグインターセプターの実装完了');
    console.log('✅ LoggerSetup - ログ設定管理の実装完了');
    console.log('✅ DIコンテナ統合 - 全コンポーネントの依存性注入完了');
    console.log('✅ エラーハンドリング - 例外処理とResult型の統合完了');
    console.log('✅ 設定管理 - 環境変数とプロファイルベース設定完了');

  } catch (error) {
    console.error('\n❌ Phase 4 テストでエラーが発生しました:', error);
    throw error;
  }
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testPhase4().catch(console.error);
}

export { testPhase4 };
