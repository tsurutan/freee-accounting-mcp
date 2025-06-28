# freee会計 MCP Server API仕様書

## 概要

freee会計 MCP Serverは、Model Context Protocol (MCP) に準拠したサーバーで、freee会計APIへの安全で効率的なアクセスを提供します。

## バージョン

- API Version: 1.0.0
- MCP Protocol Version: 2024-11-05
- freee API Version: v1

## 認証

### OAuth 2.0 認証フロー

1. **認証URL生成**: `generate-auth-url` ツールを使用
2. **認証コード交換**: `exchange-auth-code` ツールを使用
3. **認証状態確認**: `check-auth-status` ツールを使用

### セキュリティ機能

- トークンの暗号化保存
- 自動トークンリフレッシュ
- セキュリティ監査ログ
- レート制限対応

## Resources

### 事業所 (Companies)

#### `companies://list`
利用可能な事業所の一覧を取得

**レスポンス例:**
```json
{
  "companies": [
    {
      "id": 123456,
      "name": "サンプル株式会社",
      "name_kana": "サンプルカブシキガイシャ",
      "display_name": "サンプル(株)"
    }
  ]
}
```

#### `companies://current`
現在選択されている事業所の詳細情報

### 勘定科目 (Account Items)

#### `account-items://list`
勘定科目の一覧を取得

**キャッシュ**: 5分間
**レスポンス例:**
```json
{
  "account_items": [
    {
      "id": 1,
      "name": "現金",
      "shortcut": "101",
      "tax_code": 0
    }
  ]
}
```

### 取引先 (Partners)

#### `partners://list`
取引先の一覧を取得

**キャッシュ**: 5分間

### 部門 (Sections)

#### `sections://list`
部門の一覧を取得

**キャッシュ**: 5分間

### 品目 (Items)

#### `items://list`
品目の一覧を取得

**キャッシュ**: 5分間

### メモタグ (Tags)

#### `tags://list`
メモタグの一覧を取得

**キャッシュ**: 5分間

### 取引 (Deals)

#### `deals://list`
取引の一覧を取得（最近30日間）

**キャッシュ**: なし（リアルタイムデータ）

### 試算表 (Trial Balance)

#### `trial-balance://current`
現在の試算表データを取得

**キャッシュ**: 10分間

## Tools

### 認証関連

#### `generate-auth-url`
OAuth認証URLを生成

**パラメータ:**
- `state` (string, optional): CSRF保護用のstateパラメータ

#### `exchange-auth-code`
認証コードをアクセストークンに交換

**パラメータ:**
- `code` (string, required): 認証コード

#### `check-auth-status`
現在の認証状態を確認

### データ操作

#### `create-deal`
新規取引を作成

**パラメータ:**
- `company_id` (number, required): 事業所ID
- `issue_date` (string, required): 取引日
- `type` (string, required): 取引タイプ ("income" | "expense")
- `details` (array, required): 取引明細

#### `update-deal`
既存取引を更新

**パラメータ:**
- `company_id` (number, required): 事業所ID
- `deal_id` (number, required): 取引ID
- その他更新項目

#### `create-partner`
新規取引先を作成

#### `create-account-item`
新規勘定科目を作成

### システム管理

#### `test-connection`
freee APIへの接続をテスト

#### `get-rate-limit-info`
APIレート制限情報を取得

#### `get-logs`
システムログを取得

**パラメータ:**
- `level` (string, optional): ログレベル
- `limit` (number, optional): 取得件数

#### `get-metrics`
システムメトリクスを取得

**パラメータ:**
- `type` (string, optional): メトリクスタイプ
- `since` (number, optional): 開始時刻

#### `get-health`
システムヘルスチェックを実行

#### `get-cache-stats`
キャッシュ統計情報を取得

#### `clear-cache`
キャッシュをクリア

**パラメータ:**
- `confirm` (boolean, required): 確認フラグ

## Prompts

### `setup-guide`
セットアップガイド

### `transaction-entry`
取引入力支援

**引数:**
- `transaction_type`: 取引タイプ
- `amount`: 金額

### `monthly-closing`
月次決算チェックリスト

**引数:**
- `target_month`: 対象月

### `trial-balance-analysis`
試算表分析ガイド

**引数:**
- `focus_area`: 分析領域

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": "エラータイプ",
  "message": "エラーメッセージ",
  "statusCode": 400,
  "retryable": false,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### エラータイプ

- `authentication_required`: 認証が必要
- `invalid_request`: 無効なリクエスト
- `rate_limit_exceeded`: レート制限超過
- `api_error`: freee API エラー
- `network_error`: ネットワークエラー

## パフォーマンス

### キャッシュ戦略

- **GET リクエスト**: 自動キャッシュ（5分間）
- **マスタデータ**: 長期キャッシュ（10分間）
- **取引データ**: キャッシュなし

### レート制限

- freee API制限: 1分間に100リクエスト
- 自動制限管理とリトライ機能
- 指数バックオフによる再試行

### メトリクス

- リクエスト数・エラー数
- レスポンス時間
- キャッシュヒット率
- メモリ使用量

## セキュリティ

### データ保護

- トークンの暗号化保存
- セキュリティヘッダーの設定
- 入力値のサニタイズ

### 監査ログ

- 認証イベント
- データアクセス
- エラー発生
- セキュリティ違反

## 制限事項

- 同時接続数: 10接続
- リクエストサイズ: 1MB以下
- レスポンスタイムアウト: 30秒
- キャッシュサイズ: 200エントリ

## サポート

- GitHub Issues: プロジェクトリポジトリ
- ドキュメント: `/docs` ディレクトリ
- ログ確認: `get-logs` ツール使用
