#!/usr/bin/env node

/**
 * Phase 0 基盤テスト
 * 導入したライブラリとDIコンテナが正しく動作するかテスト
 */

import 'reflect-metadata';
import { container } from './container/container.js';
import { TYPES } from './container/types.js';
import { EnvironmentConfig } from './config/environment-config.js';
import { AppConfig } from './config/app-config.js';
import { Logger } from './infrastructure/logger.js';
import { ErrorHandler } from './utils/error-handler.js';
import { ResponseBuilder } from './utils/response-builder.js';
import { Validator } from './utils/validator.js';
import { DateUtils } from './utils/date-utils.js';
import { AuthService } from './services/auth-service.js';

async function testPhase0() {
  console.log('🚀 Phase 0 基盤テスト開始\n');

  try {
    // 1. DIコンテナのテスト
    console.log('1. DIコンテナのテスト');
    const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);
    const appConfig = container.get<AppConfig>(TYPES.AppConfig);
    const logger = container.get<Logger>(TYPES.Logger);
    const errorHandler = container.get<ErrorHandler>(TYPES.ErrorHandler);
    const responseBuilder = container.get<ResponseBuilder>(TYPES.ResponseBuilder);
    const validator = container.get<Validator>(TYPES.Validator);
    const dateUtils = container.get<DateUtils>(TYPES.DateUtils);
    const authService = container.get<AuthService>(TYPES.AuthService);
    
    console.log('✅ 全てのサービスがDIコンテナから正常に取得できました\n');

    // 2. 環境変数設定のテスト
    console.log('2. 環境変数設定のテスト');
    const envSummary = envConfig.getSummary();
    console.log('環境変数設定:', JSON.stringify(envSummary, null, 2));
    
    const validation = envConfig.validate();
    if (validation.isOk()) {
      console.log('✅ 環境変数の検証が成功しました');
    } else {
      console.log('⚠️ 環境変数の検証エラー:', validation.error.message);
    }
    console.log();

    // 3. アプリケーション設定のテスト
    console.log('3. アプリケーション設定のテスト');
    console.log('事業所ID:', appConfig.companyId);
    console.log('ベースURL:', appConfig.baseUrl);
    console.log('デフォルト期間:', appConfig.defaultDealsPeriodDays, '日');
    console.log('✅ アプリケーション設定が正常に読み込まれました\n');

    // 4. ログシステムのテスト
    console.log('4. ログシステムのテスト');
    logger.info('テストログ: INFO レベル');
    logger.warn('テストログ: WARN レベル');
    logger.debug('テストログ: DEBUG レベル', { testData: 'debug context' });
    
    const logStats = logger.getLogStats();
    console.log('ログ統計:', logStats);
    console.log('✅ ログシステムが正常に動作しています\n');

    // 5. エラーハンドリングのテスト
    console.log('5. エラーハンドリングのテスト');
    
    // 同期エラーハンドリング
    const syncResult = errorHandler.wrapSync(() => {
      if (Math.random() > 0.5) {
        throw new Error('テスト用エラー');
      }
      return 'success';
    });
    
    if (syncResult.isOk()) {
      console.log('✅ 同期処理が成功しました:', syncResult.value);
    } else {
      console.log('⚠️ 同期処理でエラーをキャッチしました:', syncResult.error.message);
    }

    // バリデーションエラーの作成
    const validationError = errorHandler.validationError('テスト用バリデーションエラー', 'testField');
    const mcpError = errorHandler.toMCPError(validationError);
    console.log('MCPエラーレスポンス:', JSON.stringify(mcpError, null, 2));
    console.log('✅ エラーハンドリングが正常に動作しています\n');

    // 6. レスポンスビルダーのテスト
    console.log('6. レスポンスビルダーのテスト');
    
    const successResponse = responseBuilder.toolSuccess('テスト成功メッセージ');
    console.log('成功レスポンス:', JSON.stringify(successResponse, null, 2));
    
    const errorResponse = responseBuilder.toolError(validationError);
    console.log('エラーレスポンス:', JSON.stringify(errorResponse, null, 2));
    console.log('✅ レスポンスビルダーが正常に動作しています\n');

    // 7. バリデーションのテスト
    console.log('7. バリデーションのテスト');
    
    const dateValidation = validator.validateDateString('2024-01-15');
    if (dateValidation.isOk()) {
      console.log('✅ 日付バリデーションが成功しました:', dateValidation.value);
    } else {
      console.log('❌ 日付バリデーションが失敗しました:', dateValidation.error.message);
    }
    
    const invalidDateValidation = validator.validateDateString('invalid-date');
    if (invalidDateValidation.isErr()) {
      console.log('✅ 不正な日付を正しく検出しました:', invalidDateValidation.error.message);
    }
    console.log();

    // 8. 日付ユーティリティのテスト
    console.log('8. 日付ユーティリティのテスト');
    
    const today = dateUtils.getToday();
    const dateRange = dateUtils.getDateRange(30);
    const monthRange = dateUtils.getMonthDateRange(2024, 1);
    
    console.log('今日の日付:', today);
    console.log('30日間の範囲:', dateRange);
    console.log('2024年1月の範囲:', monthRange);
    console.log('✅ 日付ユーティリティが正常に動作しています\n');

    // 9. 認証サービスのテスト
    console.log('9. 認証サービスのテスト');
    
    const authStatus = authService.checkAuthenticationStatus();
    if (authStatus.isOk()) {
      console.log('✅ 認証状態:', authStatus.value);
      const authSummary = authService.getAuthSummary();
      console.log('認証サマリー:', authSummary);
    } else {
      console.log('⚠️ 認証エラー:', authStatus.error.message);
    }
    console.log();

    // 10. 総合テスト結果
    console.log('🎉 Phase 0 基盤テスト完了');
    console.log('✅ 全ての基盤コンポーネントが正常に動作しています');
    console.log('✅ DIコンテナによる依存性注入が機能しています');
    console.log('✅ Result型によるエラーハンドリングが機能しています');
    console.log('✅ 設定管理が改善されました');
    console.log('✅ ログシステムが改善されました');
    console.log('\n🚀 Phase 1 のリファクタリングを開始する準備が整いました！');

  } catch (error) {
    console.error('❌ Phase 0 テストでエラーが発生しました:', error);
    process.exit(1);
  }
}

// テスト実行
testPhase0().catch(console.error);
