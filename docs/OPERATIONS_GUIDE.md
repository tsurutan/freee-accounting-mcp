# freee会計 MCP Server 運用ガイド

## 概要

このガイドでは、freee会計 MCP Serverの運用に関する情報を提供します。

## セットアップ

### 1. 環境準備

```bash
# Node.js 18以上が必要
node --version

# 依存関係のインストール
npm install

# ビルド
npm run build
```

### 2. 環境変数設定

```bash
# .env ファイルを作成
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=your_redirect_uri
FREEE_API_BASE_URL=https://api.freee.co.jp
LOG_LEVEL=INFO
```

### 3. freeeアプリケーション設定

1. freee開発者ポータルでアプリケーションを作成
2. OAuth設定でリダイレクトURIを設定
3. 必要なスコープを設定: `read write`

## 起動・停止

### 開発環境

```bash
# 開発モードで起動
npm run dev

# テスト実行
npm test

# ビルド
npm run build
```

### 本番環境

```bash
# 本番ビルド
npm run build

# 本番起動
npm start
```

## 監視・メトリクス

### ヘルスチェック

```bash
# ヘルスチェック実行
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "get-health", "arguments": {}}'
```

### メトリクス確認

```bash
# パフォーマンスメトリクス
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "get-metrics", "arguments": {"type": "performance"}}'

# システムメトリクス
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "get-metrics", "arguments": {"type": "system"}}'
```

### ログ確認

```bash
# エラーログのみ取得
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "get-logs", "arguments": {"level": "ERROR", "limit": 50}}'
```

## トラブルシューティング

### 認証エラー

**症状**: `authentication_required` エラー

**対処法**:
1. 認証状態を確認: `check-auth-status`
2. 新しい認証URLを生成: `generate-auth-url`
3. 認証フローを再実行

### レート制限エラー

**症状**: `rate_limit_exceeded` エラー

**対処法**:
1. レート制限情報を確認: `get-rate-limit-info`
2. リクエスト頻度を調整
3. 自動リトライを待機

### パフォーマンス問題

**症状**: レスポンスが遅い

**対処法**:
1. メトリクスを確認: `get-metrics`
2. キャッシュ統計を確認: `get-cache-stats`
3. 必要に応じてキャッシュクリア: `clear-cache`

### メモリ不足

**症状**: メモリ使用量が高い

**対処法**:
1. システムメトリクスを確認
2. キャッシュサイズを調整
3. アプリケーション再起動

## セキュリティ

### トークン管理

- トークンは暗号化されて `~/.freee-mcp-tokens.json` に保存
- 定期的なトークンローテーション推奨
- 不要なトークンファイルは削除

### セキュリティ監査

```bash
# セキュリティログの確認
grep "SECURITY" logs/application.log

# 認証イベントの確認
grep "authentication" logs/application.log
```

### アクセス制御

- 必要最小限のスコープのみ使用
- 定期的な権限見直し
- 異常なアクセスパターンの監視

## バックアップ・復旧

### 設定ファイル

```bash
# 重要な設定ファイル
- .env
- ~/.freee-mcp-tokens.json
- package.json
- tsconfig.json
```

### データバックアップ

```bash
# 設定のバックアップ
cp .env .env.backup
cp ~/.freee-mcp-tokens.json ~/.freee-mcp-tokens.json.backup
```

### 復旧手順

1. 環境変数の復元
2. 依存関係の再インストール
3. アプリケーションの再ビルド
4. 認証情報の復元

## パフォーマンス最適化

### キャッシュ設定

```typescript
// キャッシュ設定の調整
const freeeClient = new FreeeClient({
  enableCache: true,
  cacheTtl: 10 * 60 * 1000, // 10分
});
```

### メモリ最適化

- 定期的なキャッシュクリア
- 不要なログの削除
- メトリクスデータの制限

### ネットワーク最適化

- 適切なタイムアウト設定
- 接続プールの活用
- リトライ戦略の調整

## アラート設定

### 重要なアラート

1. **認証エラー**: 認証失敗の連続発生
2. **レート制限**: API制限の頻繁な到達
3. **エラー率**: エラー率10%以上
4. **レスポンス時間**: 平均5秒以上
5. **メモリ使用量**: 90%以上

### アラート確認

```bash
# アクティブアラートの確認
curl -X POST http://localhost:3000/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "get-health", "arguments": {}}'
```

## 定期メンテナンス

### 日次タスク

- ログファイルの確認
- エラー率の監視
- パフォーマンスメトリクスの確認

### 週次タスク

- キャッシュ統計の分析
- セキュリティログの確認
- 不要なファイルの削除

### 月次タスク

- 依存関係の更新確認
- セキュリティパッチの適用
- パフォーマンス分析レポート作成

## 緊急時対応

### サービス停止

1. 原因の特定（ログ確認）
2. 緊急修正の適用
3. サービス再起動
4. 動作確認

### データ破損

1. バックアップからの復旧
2. 整合性チェック
3. 段階的なサービス復旧

### セキュリティインシデント

1. サービス一時停止
2. 影響範囲の調査
3. セキュリティパッチ適用
4. 監査ログの分析

## 連絡先・サポート

- **技術サポート**: GitHub Issues
- **緊急時**: プロジェクト管理者
- **ドキュメント**: `/docs` ディレクトリ
- **API仕様**: `API_SPECIFICATION.md`

## 更新履歴

- v1.0.0: 初回リリース
- v1.1.0: キャッシュ機能追加
- v1.2.0: セキュリティ強化
- v1.3.0: メトリクス・監視機能追加
