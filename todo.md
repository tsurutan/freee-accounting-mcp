# freee-accounting MCP Server リファクタリング TODO

## 現状の問題点

- **単一ファイルが2400行超**: index.tsが巨大すぎて保守性が低い
- **DRY違反**: 認証チェック、エラーハンドリング、レスポンス生成の重複コード
- **SRP違反**: 1つのファイルで環境変数読み込み、認証、API呼び出し、ツール実行、プロンプト処理を担当
- **OCP違反**: 新しいツールやリソースを追加する際に既存コードの修正が必要
- **ISP違反**: 大きなインターフェースで不要な依存関係
- **DIP違反**: 具体的な実装に依存している部分が多い

## 推奨ライブラリ・ツール

### 依存性注入・IoC Container
- **inversify** - TypeScript対応の軽量DIコンテナ
  - 依存関係の管理とテスタビリティ向上
  - デコレーターベースの設定
  - 循環依存の検出

### バリデーション・設定管理
- **class-validator** + **class-transformer** - 既存のzodと併用
  - DTOクラスベースのバリデーション
  - 型安全な変換処理
- **convict** または **config** - 設定管理
  - 環境変数の型安全な管理
  - 設定値の検証とデフォルト値

### 関数型プログラミング・エラーハンドリング
- **fp-ts** - 関数型プログラミングライブラリ
  - Either型によるエラーハンドリング
  - Option型によるnull安全性
  - パイプライン処理
- **neverthrow** - Result型ライブラリ（fp-tsより軽量）
  - Result<T, E>型によるエラーハンドリング
  - チェーン可能なエラー処理

### デコレーター・メタプログラミング
- **reflect-metadata** - メタデータリフレクション
  - デコレーターベースの設定
  - 実行時型情報の取得
- **class-transformer** - オブジェクト変換
  - APIレスポンスのDTO変換
  - シリアライゼーション

### ログ・監視
- **winston** - 構造化ログ
  - 既存のloggerの置き換え
  - 複数の出力先対応
- **pino** - 高性能ログライブラリ（代替案）
  - JSON構造化ログ
  - 高いパフォーマンス

### テスト・モック
- **sinon** - モック・スタブライブラリ
  - 関数・メソッドのモック
  - スパイ機能
- **nock** - HTTP モック
  - freee API呼び出しのモック
  - テスト時のネットワーク分離

### ビルダーパターン・ファクトリー
- **builder-pattern** - ビルダーパターン実装
  - 複雑なオブジェクト生成の簡素化
  - 流暢なインターフェース

### 非同期処理・リトライ
- **p-retry** - リトライ処理
  - 指数バックオフ
  - 条件付きリトライ
- **p-queue** - 非同期キュー
  - 並行処理の制御
  - レート制限対応

## ライブラリ導入計画

### Phase 0: ライブラリ導入・基盤整備 ✅ 完了

#### 0.1 依存性注入の導入
- [x] `inversify` + `reflect-metadata` の導入
- [x] DIコンテナの設定
- [x] 基本的なサービスクラスの作成

#### 0.2 エラーハンドリングの改善
- [x] `neverthrow` の導入
- [x] Result型によるエラーハンドリングパターンの確立
- [x] AppError型の定義とMCPレスポンス変換

#### 0.3 バリデーション・設定管理の強化
- [x] `class-validator` + `class-transformer` の導入
- [x] `convict` による設定管理の改善
- [x] 環境変数の型安全な管理

#### 0.4 ログ・監視の改善
- [x] `winston` の導入
- [x] 構造化ログの実装
- [x] 既存のlogger置き換え準備完了

#### 0.5 基盤テスト
- [x] Phase 0 統合テストの作成・実行
- [x] 全コンポーネントの動作確認

## リファクタリング計画

### Phase 1: 基盤クラス・ユーティリティの分離

#### 1.1 環境変数・設定管理の分離
- [ ] `src/config/environment.ts` - 環境変数読み込み・検証
- [ ] `src/config/app-config.ts` - アプリケーション設定
- [ ] `src/config/oauth-config.ts` - OAuth設定

#### 1.2 認証関連の分離
- [ ] `src/auth/auth-manager.ts` - 認証状態管理の統一インターフェース
- [ ] `src/auth/auth-checker.ts` - 認証状態チェック機能
- [ ] `src/auth/auth-validator.ts` - 認証情報の検証

#### 1.3 共通ユーティリティの分離
- [ ] `src/utils/response-builder.ts` - MCPレスポンス生成
- [ ] `src/utils/error-handler.ts` - エラーハンドリング
- [ ] `src/utils/date-utils.ts` - 日付関連ユーティリティ
- [ ] `src/utils/validation.ts` - 入力値検証

### Phase 2: ドメイン層の分離

#### 2.1 リソースハンドラーの分離
- [ ] `src/resources/base-resource-handler.ts` - リソースハンドラーの基底クラス
- [ ] `src/resources/companies-resource.ts` - 事業所関連リソース
- [ ] `src/resources/account-items-resource.ts` - 勘定科目関連リソース
- [ ] `src/resources/partners-resource.ts` - 取引先関連リソース
- [ ] `src/resources/sections-resource.ts` - 部門関連リソース
- [ ] `src/resources/items-resource.ts` - 品目関連リソース
- [ ] `src/resources/tags-resource.ts` - メモタグ関連リソース
- [ ] `src/resources/deals-resource.ts` - 取引関連リソース
- [ ] `src/resources/trial-balance-resource.ts` - 試算表関連リソース
- [ ] `src/resources/resource-registry.ts` - リソースの登録・管理

#### 2.2 ツールハンドラーの分離
- [ ] `src/tools/base-tool-handler.ts` - ツールハンドラーの基底クラス
- [ ] `src/tools/auth-tools.ts` - 認証関連ツール
- [ ] `src/tools/company-tools.ts` - 事業所関連ツール
- [ ] `src/tools/deal-tools.ts` - 取引関連ツール
- [ ] `src/tools/partner-tools.ts` - 取引先関連ツール
- [ ] `src/tools/account-item-tools.ts` - 勘定科目関連ツール
- [ ] `src/tools/system-tools.ts` - システム関連ツール（ヘルスチェック、メトリクス等）
- [ ] `src/tools/debug-tools.ts` - デバッグ関連ツール
- [ ] `src/tools/tool-registry.ts` - ツールの登録・管理

#### 2.3 プロンプトハンドラーの分離
- [ ] `src/prompts/base-prompt-handler.ts` - プロンプトハンドラーの基底クラス
- [ ] `src/prompts/setup-prompt.ts` - セットアップガイドプロンプト
- [ ] `src/prompts/transaction-prompt.ts` - 取引入力支援プロンプト
- [ ] `src/prompts/closing-prompt.ts` - 月次決算プロンプト
- [ ] `src/prompts/analysis-prompt.ts` - 試算表分析プロンプト
- [ ] `src/prompts/prompt-registry.ts` - プロンプトの登録・管理

### Phase 3: サービス層の分離

#### 3.1 ビジネスロジックサービス
- [ ] `src/services/company-service.ts` - 事業所関連ビジネスロジック
- [ ] `src/services/deal-service.ts` - 取引関連ビジネスロジック
- [ ] `src/services/partner-service.ts` - 取引先関連ビジネスロジック
- [ ] `src/services/account-item-service.ts` - 勘定科目関連ビジネスロジック
- [ ] `src/services/trial-balance-service.ts` - 試算表関連ビジネスロジック

#### 3.2 システムサービス
- [ ] `src/services/health-service.ts` - ヘルスチェックサービス
- [ ] `src/services/metrics-service.ts` - メトリクス収集サービス
- [ ] `src/services/security-service.ts` - セキュリティ監査サービス
- [ ] `src/services/cache-service.ts` - キャッシュ管理サービス

### Phase 4: インフラ層の分離

#### 4.1 外部API連携
- [ ] `src/infrastructure/freee-api-client.ts` - freee API クライアントのラッパー
- [ ] `src/infrastructure/api-response-mapper.ts` - APIレスポンスのマッピング

#### 4.2 デバッグ・ログ機能
- [ ] `src/infrastructure/debug-interceptor.ts` - デバッグ用インターセプター
- [ ] `src/infrastructure/logger-setup.ts` - ログ設定

### Phase 5: アプリケーション層の統合

#### 5.1 MCPサーバー構成
- [ ] `src/server/mcp-server.ts` - MCPサーバーの設定・起動
- [ ] `src/server/request-handlers.ts` - リクエストハンドラーの統合
- [ ] `src/server/middleware.ts` - 共通ミドルウェア

#### 5.2 依存性注入・設定
- [ ] `src/container/service-container.ts` - DIコンテナ
- [ ] `src/container/bindings.ts` - 依存関係の設定

#### 5.3 新しいエントリーポイント
- [ ] `src/index.ts` - 新しいエントリーポイント（簡潔に）

### Phase 6: 型定義・インターフェースの整理

#### 6.1 ドメイン型定義
- [ ] `src/types/domain.ts` - ドメイン固有の型定義
- [ ] `src/types/api.ts` - API関連の型定義
- [ ] `src/types/mcp.ts` - MCP関連の型定義

#### 6.2 インターフェース定義
- [ ] `src/interfaces/resource-handler.ts` - リソースハンドラーインターフェース
- [ ] `src/interfaces/tool-handler.ts` - ツールハンドラーインターフェース
- [ ] `src/interfaces/prompt-handler.ts` - プロンプトハンドラーインターフェース
- [ ] `src/interfaces/service.ts` - サービスインターフェース

### Phase 7: テスト・品質向上

#### 7.1 ユニットテスト
- [ ] 各クラス・関数のユニットテスト作成
- [ ] モック・スタブの整備

#### 7.2 統合テスト
- [ ] MCPサーバー全体の統合テスト
- [ ] freee API連携テスト

#### 7.3 品質向上
- [ ] ESLint設定の見直し
- [ ] TypeScript strict mode対応
- [ ] コードカバレッジ測定

## 実装優先度

### 最高優先度（Phase 0）
1. **inversify** - 依存性注入の導入
2. **neverthrow** - Result型エラーハンドリング
3. **class-validator** - バリデーション強化
4. **winston** - ログ改善

### 高優先度（Phase 1-2）
1. 環境変数・設定管理の分離（convict使用）
2. 認証関連の分離（DIコンテナ活用）
3. 共通ユーティリティの分離（Result型活用）
4. リソースハンドラーの分離（デコレーターベース）
5. ツールハンドラーの分離（ファクトリーパターン）

### 中優先度（Phase 3-4）
1. ビジネスロジックサービスの分離（DIコンテナ活用）
2. システムサービスの分離（p-retry使用）
3. 外部API連携の分離（nock使用テスト）

### 低優先度（Phase 5-7）
1. アプリケーション層の統合（builder-pattern使用）
2. 型定義・インターフェースの整理（reflect-metadata活用）
3. テスト・品質向上（sinon + nock使用）

## 具体的なライブラリ活用例

### inversify（依存性注入）
```typescript
@injectable()
class FreeeApiService {
  constructor(
    @inject('HttpClient') private httpClient: HttpClient,
    @inject('AuthService') private authService: AuthService
  ) {}
}
```

### neverthrow（エラーハンドリング）
```typescript
const result = await freeeApiService.getCompanies()
  .andThen(companies => validateCompanies(companies))
  .map(companies => formatResponse(companies));

if (result.isErr()) {
  return handleError(result.error);
}
```

### class-validator（バリデーション）
```typescript
class CreateDealDto {
  @IsDateString()
  issue_date: string;

  @IsEnum(['income', 'expense'])
  type: string;

  @ValidateNested({ each: true })
  @Type(() => DealDetailDto)
  details: DealDetailDto[];
}
```

## 期待される効果

### 保守性の向上
- 単一責任の原則により、各クラスの役割が明確
- 変更時の影響範囲が限定される
- 新機能追加時の既存コード修正が不要

### 可読性の向上
- ファイルサイズの適正化（各ファイル100-200行程度）
- 関心の分離により理解しやすい構造

### テスタビリティの向上
- 各コンポーネントの独立性向上
- モック・スタブの作成が容易

### 拡張性の向上
- 新しいリソース・ツール・プロンプトの追加が容易
- プラグイン的な構造による機能拡張

## パッケージ追加コマンド

### 基本ライブラリ
```bash
# 依存性注入
npm install inversify reflect-metadata

# エラーハンドリング
npm install neverthrow

# バリデーション
npm install class-validator class-transformer

# 設定管理
npm install convict

# ログ
npm install winston

# 非同期処理
npm install p-retry p-queue

# ビルダーパターン
npm install builder-pattern
```

### 開発・テスト用
```bash
# テスト・モック
npm install --save-dev sinon nock

# 型定義
npm install --save-dev @types/convict @types/sinon
```

## 注意事項

- リファクタリング中も既存機能の動作を保証
- 段階的な実装により、各フェーズでの動作確認を実施
- 既存のAPIインターフェースは可能な限り維持
- パフォーマンスの劣化がないよう注意
- ライブラリ導入時はバンドルサイズの増加に注意
- 既存のzod、axiosとの共存を考慮
