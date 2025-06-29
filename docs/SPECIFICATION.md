# freee会計 MCP Server 仕様書

## 概要

freee会計APIと連携するModel Context Protocol (MCP) Serverの技術仕様書です。

## アーキテクチャ

### システム構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│  MCP Server     │◄──►│   freee API     │
│   (Claude等)    │    │  (このプロジェクト)│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### パッケージ構成

- `apps/freee-accounting/`: MCP Server本体
- `packages/types/`: 型定義
- `packages/shared/`: 共通ライブラリ

## API仕様

### Resources

#### 事業所情報
- `companies://list` - 事業所一覧
- `companies://{company_id}` - 事業所詳細

#### 勘定科目
- `account-items://{company_id}` - 勘定科目一覧

#### 取引先
- `partners://{company_id}` - 取引先一覧
- `partners://{company_id}/{partner_id}` - 取引先詳細

#### 部門・品目
- `sections://{company_id}` - 部門一覧
- `items://{company_id}` - 品目一覧

#### 取引
- `deals://{company_id}` - 取引一覧
- `deals://{company_id}/{deal_id}` - 取引詳細

#### 試算表
- `trial-balance://{company_id}` - 試算表データ

### Tools

#### 取引管理
- `create-deal` - 新規取引作成
- `update-deal` - 取引更新

#### マスタ管理
- `create-partner` - 新規取引先作成
- `create-account-item` - 新規勘定科目作成

#### 帳票作成
- `create-invoice` - 新規請求書作成
- `create-quotation` - 新規見積書作成

### Prompts

#### 業務支援
- `transaction-entry` - 取引入力ガイド
- `monthly-closing` - 月次決算チェックリスト
- `trial-balance-analysis` - 試算表分析ガイド

## 認証

### 認証方式

#### 方式1: 直接トークン認証（推奨）

事前に取得したアクセストークンを直接使用する方式です。

**メリット:**
- 設定が簡単
- 認証フローが不要
- 即座に利用開始可能

**環境変数:**
```env
FREEE_ACCESS_TOKEN=your_access_token
FREEE_API_BASE_URL=https://api.freee.co.jp  # オプション
```

#### 方式2: OAuth 2.0認証

OAuth 2.0フローを使用してアクセストークンを取得する方式です。

**フロー:**
1. 認証URL生成 (`generate-auth-url`)
2. ユーザー認証（ブラウザ）
3. 認証コード取得
4. アクセストークン取得 (`exchange-auth-code`)
5. リフレッシュトークン処理（自動）

**環境変数:**
```env
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=your_redirect_uri
FREEE_API_BASE_URL=https://api.freee.co.jp  # オプション
```

### 認証方式の選択

- `FREEE_ACCESS_TOKEN`が設定されている場合は直接トークン認証が優先されます
- `FREEE_ACCESS_TOKEN`が未設定で`FREEE_CLIENT_ID`と`FREEE_CLIENT_SECRET`が設定されている場合はOAuth認証が使用されます
- どちらも設定されていない場合は認証エラーとなります

## エラーハンドリング

### エラー型

```typescript
interface FreeeApiError {
  status_code: number;
  errors: Array<{
    type: string;
    resource_name: string;
    field: string;
    code: string;
    message: string;
  }>;
}
```

### エラー処理方針

- API エラーは適切なHTTPステータスコードと共に返却
- ユーザーフレンドリーなエラーメッセージを提供
- ログ出力による詳細なエラー情報の記録

## セキュリティ

### 認証情報の管理

- アクセストークンの安全な保存
- リフレッシュトークンによる自動更新
- 認証情報の暗号化

### API制限

- レート制限の遵守
- 適切なタイムアウト設定
- リトライ機能の実装

## パフォーマンス

### キャッシュ戦略

- マスタデータのキャッシュ
- 適切なキャッシュ期間の設定
- キャッシュ無効化の仕組み

### 最適化

- 必要最小限のデータ取得
- バッチ処理の活用
- 非同期処理の実装

## 開発・運用

### ログ

- 構造化ログの出力
- ログレベルの適切な設定
- 機密情報のマスキング

### 監視

- ヘルスチェック機能
- メトリクス収集
- アラート設定

### テスト

- 単体テスト
- 統合テスト
- E2Eテスト

## 今後の拡張予定

- 給与計算API連携
- 人事労務API連携
- 会社設立API連携
- マイナンバー管理API連携
