# freee会計 MCP Server 開発タスク一覧

## 1. プロジェクト初期設定

### 1.1 Monorepo基盤構築
- [ ] ルートディレクトリでnpm workspaceの設定
  - [ ] `package.json`でworkspaces設定
  - [ ] `.gitignore`の作成
  - [ ] `README.md`の作成
- [ ] Turborepoの設定
  - [ ] `turbo.json`の作成
  - [ ] ビルド・テスト・リントのパイプライン設定
- [ ] TypeScript設定
  - [ ] ルート`tsconfig.json`の作成
  - [ ] 共通設定の定義

### 1.2 ディレクトリ構造作成
```
mcp-server/
├── apps/
│   └── freee-accounting/     # freee会計MCP server
├── packages/
│   ├── shared/               # 共通ライブラリ
│   └── types/                # 型定義
├── docs/
│   └── SPECIFICATION.md      # 仕様書
├── package.json
├── turbo.json
└── README.md
```

## 2. 共通パッケージ開発

### 2.1 型定義パッケージ (`packages/types`)
- [ ] freee API レスポンス型の定義
  - [ ] 事業所 (Companies) 型
  - [ ] 取引 (Deals) 型
  - [ ] 勘定科目 (Account items) 型
  - [ ] 取引先 (Partners) 型
  - [ ] 部門 (Sections) 型
  - [ ] 品目 (Items) 型
  - [ ] メモタグ (Tags) 型
  - [ ] 試算表 (Trial balance) 型
  - [ ] 請求書 (Invoices) 型
  - [ ] 見積書 (Quotations) 型
- [ ] MCP固有の型定義
- [ ] エラーハンドリング用型定義

### 2.2 共通ライブラリパッケージ (`packages/shared`)
- [ ] freee API クライアント
  - [ ] OAuth2.0認証処理
  - [ ] APIリクエスト共通処理
  - [ ] レート制限対応
  - [ ] エラーハンドリング
- [ ] ユーティリティ関数
  - [ ] 日付フォーマット
  - [ ] 金額フォーマット
  - [ ] バリデーション関数

## 3. freee会計 MCP Server開発 (`apps/freee-accounting`)

### 3.1 プロジェクト初期設定
- [ ] `package.json`の作成
- [ ] 依存関係のインストール
  - [ ] `@modelcontextprotocol/sdk`
  - [ ] `zod` (バリデーション)
  - [ ] `axios` (HTTP クライアント)
- [ ] TypeScript設定
- [ ] ESLint・Prettier設定

### 3.2 認証機能実装
- [ ] OAuth2.0フロー実装
  - [ ] 認証URL生成
  - [ ] アクセストークン取得
  - [ ] リフレッシュトークン処理
- [ ] 認証情報の永続化
- [ ] 認証状態管理

### 3.3 Resources実装
- [ ] 事業所情報リソース
  - [ ] `companies://list` - 事業所一覧
  - [ ] `companies://{company_id}` - 事業所詳細
- [ ] 勘定科目リソース
  - [ ] `account-items://{company_id}` - 勘定科目一覧
- [ ] 取引先リソース
  - [ ] `partners://{company_id}` - 取引先一覧
  - [ ] `partners://{company_id}/{partner_id}` - 取引先詳細
- [ ] 部門リソース
  - [ ] `sections://{company_id}` - 部門一覧
- [ ] 品目リソース
  - [ ] `items://{company_id}` - 品目一覧
- [ ] 取引リソース
  - [ ] `deals://{company_id}` - 取引一覧
  - [ ] `deals://{company_id}/{deal_id}` - 取引詳細
- [ ] 試算表リソース
  - [ ] `trial-balance://{company_id}` - 試算表データ

### 3.4 Tools実装
- [ ] 取引作成ツール
  - [ ] `create-deal` - 新規取引作成
  - [ ] 入力バリデーション
  - [ ] エラーハンドリング
- [ ] 取引更新ツール
  - [ ] `update-deal` - 取引更新
- [ ] 取引先作成ツール
  - [ ] `create-partner` - 新規取引先作成
- [ ] 勘定科目作成ツール
  - [ ] `create-account-item` - 新規勘定科目作成
- [ ] 請求書作成ツール
  - [ ] `create-invoice` - 新規請求書作成
- [ ] 見積書作成ツール
  - [ ] `create-quotation` - 新規見積書作成

### 3.5 Prompts実装
- [ ] 取引入力支援プロンプト
  - [ ] `transaction-entry` - 取引入力ガイド
- [ ] 月次決算プロンプト
  - [ ] `monthly-closing` - 月次決算チェックリスト
- [ ] 試算表分析プロンプト
  - [ ] `trial-balance-analysis` - 試算表分析ガイド

## 4. 設定・設定ファイル

### 4.1 環境設定
- [ ] 環境変数設定
  - [ ] `FREEE_CLIENT_ID`
  - [ ] `FREEE_CLIENT_SECRET`
  - [ ] `FREEE_REDIRECT_URI`
  - [ ] `FREEE_API_BASE_URL`
- [ ] 設定ファイル管理
- [ ] 開発・本番環境の分離

### 4.2 ログ・監視
- [ ] ログ設定
- [ ] エラー監視
- [ ] パフォーマンス監視

## 5. テスト実装

### 5.1 単体テスト
- [ ] API クライアントのテスト
- [ ] Resources のテスト
- [ ] Tools のテスト
- [ ] Prompts のテスト

### 5.2 統合テスト
- [ ] MCP プロトコルのテスト
- [ ] freee API との統合テスト

### 5.3 E2Eテスト
- [ ] 実際のMCPクライアントとの接続テスト

## 6. ドキュメント作成

### 6.1 技術仕様書
- [ ] `docs/SPECIFICATION.md`の作成
  - [ ] API仕様
  - [ ] Resources一覧
  - [ ] Tools一覧
  - [ ] Prompts一覧

### 6.2 利用ガイド
- [ ] セットアップガイド
- [ ] 認証設定ガイド
- [ ] 使用例・サンプルコード

### 6.3 開発者向けドキュメント
- [ ] 開発環境セットアップ
- [ ] コントリビューションガイド
- [ ] アーキテクチャ説明

## 7. デプロイ・配布

### 7.1 ビルド設定
- [ ] 本番ビルド設定
- [ ] バンドル最適化

### 7.2 配布準備
- [ ] npm パッケージ設定
- [ ] バージョン管理
- [ ] リリースノート

## 8. 運用・保守

### 8.1 監視・ログ
- [ ] 運用監視設定
- [ ] ログ分析

### 8.2 セキュリティ
- [ ] セキュリティ監査
- [ ] 脆弱性対応

## 優先順位

### Phase 1 (最優先)
1. プロジェクト初期設定 (1.1, 1.2)
2. 共通パッケージ基盤 (2.1, 2.2の基本部分)
3. MCP Server基本実装 (3.1, 3.2)

### Phase 2 (高優先)
4. 基本Resources実装 (3.3の事業所・勘定科目・取引先)
5. 基本Tools実装 (3.4の取引作成)
6. 基本テスト (5.1の一部)

### Phase 3 (中優先)
7. 残りのResources・Tools実装
8. Prompts実装
9. 完全なテスト実装

### Phase 4 (低優先)
10. ドキュメント完成
11. デプロイ・配布準備
12. 運用・保守設定
