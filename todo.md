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

### Phase 1: 基盤クラス・ユーティリティの分離 ✅ 完了

#### 1.1 環境変数・設定管理の分離
- [x] `src/config/environment-config.ts` - 環境変数読み込み・検証
- [x] `src/config/app-config.ts` - アプリケーション設定
- [x] 既存 `src/config.ts` の後方互換性ラッパー

#### 1.2 認証関連の分離
- [x] `src/services/auth-service.ts` - 認証状態管理の統一インターフェース
- [x] 認証チェック機能の統一化
- [x] 認証情報の検証

#### 1.3 共通ユーティリティの分離
- [x] `src/utils/response-builder.ts` - MCPレスポンス生成
- [x] `src/utils/error-handler.ts` - エラーハンドリング
- [x] `src/utils/date-utils.ts` - 日付関連ユーティリティ
- [x] `src/utils/validator.ts` - 入力値検証

#### 1.4 リソースハンドラーの分離
- [x] `src/handlers/base-resource-handler.ts` - リソースハンドラーの基底クラス
- [x] `src/handlers/companies-resource-handler.ts` - 事業所関連リソース
- [x] `src/handlers/deals-resource-handler.ts` - 取引関連リソース
- [x] `src/handlers/resource-registry.ts` - リソースの登録・管理

#### 1.5 ツールハンドラーの分離
- [x] `src/handlers/base-tool-handler.ts` - ツールハンドラーの基底クラス
- [x] `src/handlers/auth-tool-handler.ts` - 認証関連ツール

#### 1.6 統合テスト
- [x] Phase 1 統合テストの作成・実行
- [x] 全コンポーネントの動作確認
- [x] 後方互換性の確認

### Phase 2: ドメイン層の分離 ✅ 完了

#### 2.1 MCPサーバーアーキテクチャの構築
- [x] `src/server/mcp-server.ts` - MCPサーバー統合管理クラス
- [x] 新しいエントリーポイント `src/index.ts` (97%削減: 78KB → 2KB)
- [x] 既存コードの保存 `src/index-old.ts`

#### 2.2 リソースハンドラーの統合
- [x] `src/handlers/base-resource-handler.ts` - リソースハンドラーの基底クラス
- [x] `src/handlers/companies-resource-handler.ts` - 事業所関連リソース
- [x] `src/handlers/deals-resource-handler.ts` - 取引関連リソース
- [x] `src/handlers/resource-registry.ts` - リソースの登録・管理

#### 2.3 ツールハンドラーの統合
- [x] `src/handlers/base-tool-handler.ts` - ツールハンドラーの基底クラス
- [x] `src/handlers/auth-tool-handler.ts` - 認証関連ツール

#### 2.4 プロンプトシステムの統合
- [x] セットアップガイドプロンプト
- [x] 取引入力支援プロンプト
- [x] MCPサーバー内でのプロンプト管理

#### 2.5 アーキテクチャ移行
- [x] DIコンテナによる統合管理
- [x] 新旧エントリーポイントの置き換え
- [x] Phase 2 統合テストの実行
- [x] 97%のファイルサイズ削減達成

### Phase 3: サービス層とツールハンドラーの完全実装 ✅ 完了

#### 3.1 取引関連ツールハンドラー
- [x] `src/handlers/deal-tool-handler.ts` - 取引CRUD操作（5ツール）
- [x] 取引一覧取得、詳細取得、作成、更新、削除
- [x] バリデーション・エラーハンドリング統合

#### 3.2 事業所関連ツールハンドラー
- [x] `src/handlers/company-tool-handler.ts` - 事業所関連操作（7ツール）
- [x] 事業所、勘定科目、取引先、部門、品目、メモタグ
- [x] 包括的な事業所データ管理

#### 3.3 システム関連ツールハンドラー
- [x] `src/handlers/system-tool-handler.ts` - システム管理（6ツール）
- [x] ヘルスチェック、システム情報、ログ管理
- [x] メトリクス、ログレベル設定

#### 3.4 ツールレジストリ
- [x] `src/handlers/tool-registry.ts` - 統合管理システム
- [x] 21個のツールを4カテゴリで管理
- [x] 検索・統計・ヘルスチェック機能

#### 3.5 MCPサーバー統合
- [x] ツールレジストリとの統合
- [x] 完全なMCPプロトコル対応
- [x] Phase 3 統合テスト完了

### Phase 4: インフラ層の分離 ✅

#### 4.1 外部API連携
- [x] `src/infrastructure/freee-api-client.ts` - freee API クライアントのラッパー
- [x] `src/infrastructure/api-response-mapper.ts` - APIレスポンスのマッピング

#### 4.2 デバッグ・ログ機能
- [x] `src/infrastructure/debug-interceptor.ts` - デバッグ用インターセプター
- [x] `src/infrastructure/logger-setup.ts` - ログ設定

### Phase 5: アプリケーション層の統合 ✅ 完了

#### 5.1 MCPサーバー構成
- [x] `src/server/mcp-server.ts` - MCPサーバーの設定・起動（リファクタリング完了）
- [x] `src/server/request-handlers.ts` - リクエストハンドラーの統合
- [x] `src/server/middleware.ts` - 共通ミドルウェア

#### 5.2 依存性注入・設定
- [x] `src/container/service-container.ts` - DIコンテナ統合管理
- [x] `src/container/bindings.ts` - 依存関係の設定分離

#### 5.3 新しいエントリーポイント
- [x] `src/index.ts` - 新しいエントリーポイント（最適化完了）

#### 5.4 統合テスト
- [x] Phase 5 統合テストの作成・実行
- [x] 全コンポーネントの動作確認
- [x] アーキテクチャ改善の検証

### Phase 6: 型定義・インターフェースの整理 ✅ 完了

#### 6.1 ドメイン型定義
- [x] `src/types/domain.ts` - ドメイン固有の型定義（300行の包括的な型定義）
- [x] `src/types/api.ts` - API関連の型定義（300行のAPI型定義）
- [x] `src/types/mcp.ts` - MCP関連の型定義（300行のMCP型定義）
- [x] `src/types/index.ts` - 型定義のインデックスファイル

#### 6.2 インターフェース定義
- [x] `src/interfaces/resource-handler.ts` - リソースハンドラーインターフェース（300行）
- [x] `src/interfaces/tool-handler.ts` - ツールハンドラーインターフェース（300行）
- [x] `src/interfaces/prompt-handler.ts` - プロンプトハンドラーインターフェース（300行）
- [x] `src/interfaces/service.ts` - サービスインターフェース（300行）
- [x] `src/interfaces/index.ts` - インターフェースのインデックスファイル

#### 6.3 統合テスト
- [x] Phase 6 統合テストの作成・実行
- [x] 型安全性の検証
- [x] インターフェース実装の検証
- [x] パフォーマンステスト

#### 6.4 実装統合
- [x] 既存ハンドラーの新しいインターフェース準拠
- [x] 既存サービスの新しいインターフェース準拠
- [x] 型定義の実際の活用確認
- [x] 統合テストによる動作確認

### Phase 7: テスト・品質向上 🧪 ✅ **完了**

#### 7.1 ユニットテスト ✅
- [x] 各クラス・関数のユニットテスト作成（10ファイル）
- [x] モック・スタブの整備（sinon, jest.mock使用）
- [x] テストカバレッジの向上（Jest設定完了）

#### 7.2 統合テスト ✅
- [x] MCPサーバー全体の統合テスト
- [x] freee API連携テスト（nockモック使用）

#### 7.3 品質向上 ✅
- [x] ESLint設定の見直し（強化ルール追加）
- [x] TypeScript strict mode対応（既に設定済み）
- [x] コードカバレッジ測定（Jest設定完了）

**成果**:
- ユニットテスト: 10ファイル、約80テストケース
- 統合テスト: 2ファイル、約20テストケース
- ESLint強化、Jest設定完了
- 継続的品質保証体制確立

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
