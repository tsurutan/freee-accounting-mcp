/**
 * get-deals ツールテスト実行スクリプト
 */

import 'reflect-metadata';

console.log('🧪 get-deals ツールテスト実行開始');
console.log('='.repeat(60));

async function runTests() {
  try {
    console.log('\n📋 テスト項目:');
    console.log('  1. ユニットテスト - DealToolHandler');
    console.log('  2. 統合テスト - get-deals ツール');
    console.log('  3. E2Eテスト - 実際のfreee API（オプション）');
    
    console.log('\n🎯 テスト対象機能:');
    console.log('  ✅ get-deals ツールの基本機能');
    console.log('  ✅ パラメータバリデーション');
    console.log('  ✅ 日付範囲指定（start_date/end_date）');
    console.log('  ✅ 年月指定（year/month）');
    console.log('  ✅ ページネーション（limit/offset）');
    console.log('  ✅ デフォルト動作（パラメータなし）');
    console.log('  ✅ エラーハンドリング');
    console.log('  ✅ レスポンス形式');
    
    console.log('\n📊 テストケース詳細:');
    
    console.log('\n  🔹 ユニットテスト:');
    console.log('    - ツール情報の正確性');
    console.log('    - サポートツールの確認');
    console.log('    - 正常系: デフォルトパラメータ');
    console.log('    - 正常系: 日付範囲指定');
    console.log('    - 正常系: 年月指定');
    console.log('    - 正常系: limit/offset指定');
    console.log('    - 正常系: データなし期間');
    console.log('    - 異常系: 不正な日付形式');
    console.log('    - 異常系: 不正な年');
    console.log('    - 異常系: 不正な月');
    console.log('    - 他ツール: get-deal-details');
    console.log('    - 他ツール: create-deal');
    console.log('    - 他ツール: update-deal');
    console.log('    - 他ツール: delete-deal');
    console.log('    - エラー: 未知のツール');
    
    console.log('\n  🔹 統合テスト:');
    console.log('    - DIコンテナ統合');
    console.log('    - 設定値の適用');
    console.log('    - バリデーション統合');
    console.log('    - レスポンス構造の検証');
    console.log('    - エラーハンドリング統合');
    console.log('    - パフォーマンス測定');
    
    console.log('\n  🔹 E2Eテスト（実際のAPI）:');
    console.log('    - 認証確認');
    console.log('    - 実データ取得');
    console.log('    - 月指定取得');
    console.log('    - 件数制限');
    console.log('    - 空データ処理');
    console.log('    - データ構造検証');
    console.log('    - ネットワークエラー処理');
    console.log('    - パフォーマンス測定');
    
    console.log('\n🔧 テスト実行方法:');
    console.log('  # 全テスト実行');
    console.log('  npm test -- deal-tool-handler.test.ts');
    console.log('');
    console.log('  # 統合テスト実行');
    console.log('  npm test -- get-deals-tool.test.ts');
    console.log('');
    console.log('  # E2Eテスト実行（要認証）');
    console.log('  RUN_E2E_TESTS=true npm test -- get-deals-tool.e2e.test.ts');
    console.log('');
    console.log('  # 特定のテストケース実行');
    console.log('  npm test -- --testNamePattern="get-deals with default"');
    
    console.log('\n📈 期待される結果:');
    console.log('  ✅ 全ユニットテストが成功');
    console.log('  ✅ 統合テストが成功');
    console.log('  ✅ バリデーションエラーが適切に検出される');
    console.log('  ✅ レスポンス形式が仕様通り');
    console.log('  ✅ パフォーマンスが許容範囲内');
    console.log('  ✅ E2Eテスト（認証設定時）が成功');
    
    console.log('\n🚨 注意事項:');
    console.log('  - E2Eテストは有効なfreeeアクセストークンが必要');
    console.log('  - E2Eテストは実際のAPIを呼び出すため、レート制限に注意');
    console.log('  - CI/CDではE2Eテストは無効化されています');
    console.log('  - テスト用事業所（ID: 2067140）を使用');
    
    console.log('\n🔍 デバッグ情報:');
    console.log('  環境変数:');
    console.log(`    FREEE_ACCESS_TOKEN: ${process.env.FREEE_ACCESS_TOKEN ? '設定済み' : '未設定'}`);
    console.log(`    FREEE_CLIENT_ID: ${process.env.FREEE_CLIENT_ID ? '設定済み' : '未設定'}`);
    console.log(`    COMPANY_ID: ${process.env.COMPANY_ID || 'デフォルト(2067140)'}`);
    console.log(`    RUN_E2E_TESTS: ${process.env.RUN_E2E_TESTS || 'false'}`);
    
    console.log('\n📝 テストカバレッジ:');
    console.log('  対象ファイル:');
    console.log('    - src/handlers/deal-tool-handler.ts');
    console.log('    - src/utils/validator.ts (DTOバリデーション)');
    console.log('    - src/utils/date-utils.ts (日付処理)');
    console.log('    - src/config/app-config.ts (設定)');
    console.log('    - src/infrastructure/freee-api-client.ts (API呼び出し)');
    
    console.log('\n🎉 テスト準備完了!');
    console.log('上記のコマンドでテストを実行してください。');
    
  } catch (error) {
    console.error('❌ テスト準備中にエラーが発生:', error);
  }
}

// テスト情報表示を実行
runTests().catch(console.error);
