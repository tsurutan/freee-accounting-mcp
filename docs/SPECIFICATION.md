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

### レイヤー構成

クリーンアーキテクチャに基づく4層構成：

#### 1. Presentation Layer (プレゼンテーション層)
- **MCP Server**: Model Context Protocolの実装
- **Handlers**: Tools/Resources/Promptsのハンドラー
- **Middleware**: 認証、ログ、バリデーション

#### 2. Application Layer (アプリケーション層)
- **Use Cases**: ビジネスロジックの実装
- **Services**: 認証、データ取得などのサービス
- **Validators**: 入力値検証とビジネスルール

#### 3. Infrastructure Layer (インフラ層)
- **FreeeApiClient**: freee API通信の統一インターフェース
- **ApiResponseMapper**: APIレスポンスの標準化・マッピング
- **DebugInterceptor**: HTTP通信のデバッグ機能
- **LoggerSetup**: ログ設定の管理

#### 4. Domain Layer (ドメイン層)
- **Entities**: 事業所、取引などのエンティティ
- **Value Objects**: 金額、日付などの値オブジェクト
- **Domain Rules**: ドメイン固有のバリデーション

### パッケージ構成

- `apps/freee-accounting/`: MCP Server本体
- `packages/types/`: 型定義
- `packages/shared/`: 共通ライブラリ

### 依存性注入

InversifyJSによるDIコンテナを使用：

```typescript
// DIコンテナの設定例
container.bind(TYPES.FreeeApiClient).to(FreeeApiClient).inSingletonScope();
container.bind(TYPES.ApiResponseMapper).to(ApiResponseMapper).inSingletonScope();
container.bind(TYPES.DebugInterceptor).to(DebugInterceptor).inSingletonScope();
```

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

#### OAuth 2.0認証

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

### 認証方式の設定

- `FREEE_CLIENT_ID`と`FREEE_CLIENT_SECRET`が設定されている必要があります
- 認証情報が設定されていない場合は認証エラーとなります

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

## インフラ層詳細仕様

### FreeeApiClient

freee APIとの通信を担当する統一インターフェース：

```typescript
interface FreeeApiClient {
  // 汎用API呼び出し
  call<T>(method: string, endpoint: string, params?: any, data?: any): Promise<Result<ApiCallResult<T>, AppError>>;

  // HTTP メソッド別
  get<T>(endpoint: string, params?: any): Promise<Result<ApiCallResult<T>, AppError>>;
  post<T>(endpoint: string, data?: any, params?: any): Promise<Result<ApiCallResult<T>, AppError>>;
  put<T>(endpoint: string, data?: any, params?: any): Promise<Result<ApiCallResult<T>, AppError>>;
  delete<T>(endpoint: string, params?: any): Promise<Result<ApiCallResult<T>, AppError>>;

  // 設定管理
  updateConfig(config: Partial<FreeeClientConfig>): void;
  testConnection(): Promise<Result<boolean, AppError>>;
}
```

**主要機能:**
- レート制限の自動管理
- リトライ機能（指数バックオフ）
- レスポンスキャッシュ
- デバッグインターセプターの統合
- リクエスト/レスポンスのログ出力

### ApiResponseMapper

freee APIレスポンスの標準化とマッピング：

```typescript
interface ApiResponseMapper {
  mapResponse<T>(apiResult: ApiCallResult, options?: MappingConfig): Result<MappedResponse<T>, AppError>;
  updateConfig(config: Partial<MappingConfig>): void;
}

interface MappedResponse<T> {
  data: T;
  metadata?: {
    timestamp: string;
    status: number;
    duration: number;
    requestId?: string;
  };
  pagination?: {
    total?: number;
    page?: number;
    perPage?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}
```

**主要機能:**
- freee API固有のデータ構造の正規化
- 型安全なデータ変換
- ページネーション情報の抽出
- 日付・数値フォーマットの統一
- メタデータの付与

### DebugInterceptor

HTTP通信のデバッグ機能：

```typescript
interface DebugInterceptor {
  setupInterceptors(client: FreeeClient): void;
  updateConfig(config: Partial<DebugConfig>): void;
  getDebugStats(): Record<string, any>;
}

interface DebugConfig {
  enableFreeeApi: boolean;
  enableAxios: boolean;
  enableMcpInspector: boolean;
  maxDataLength: number;
  maskSensitiveData: boolean;
}
```

**主要機能:**
- リクエスト/レスポンスの詳細ログ
- MCP Inspector対応
- 機密情報の自動マスキング
- データサイズ制限
- 環境変数による設定切り替え

### LoggerSetup

ログ設定の統合管理：

```typescript
interface LoggerSetup {
  setupLogger(profileName?: string): Logger;
  setupCustomLogger(config: Partial<LoggerConfig>): Logger;
  getAvailableProfiles(): LogProfile[];
  autoDetectProfile(): string;
  validateConfig(config: LoggerConfig): ValidationResult;
}
```

**利用可能なプロファイル:**
- `development`: 開発環境用（詳細ログ）
- `production`: 本番環境用（最小限ログ）
- `test`: テスト環境用（構造化ログ）
- `mcp-inspector`: MCP Inspector用
- `debug`: デバッグ用（最大詳細度）
- `silent`: 静寂モード（エラーのみ）

## エラーハンドリング仕様

### Result型パターン

```typescript
type Result<T, E> = Ok<T> | Err<E>;

// 使用例
const result = await apiClient.get('/api/1/companies');
if (result.isOk()) {
  console.log(result.value.data);
} else {
  console.error(result.error.message);
}
```

### AppError型

```typescript
interface AppError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  statusCode?: number;
}
```

## 今後の拡張予定

- 給与計算API連携
- 人事労務API連携
- 会社設立API連携
- マイナンバー管理API連携
