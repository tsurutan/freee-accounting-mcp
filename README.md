# freee会計 MCP Server

freee会計APIと連携するModel Context Protocol (MCP) Serverです。

## 概要

このプロジェクトは、freee会計APIを通じて会計データにアクセスし、AI アシスタントが会計業務を支援できるようにするMCPサーバーを提供します。

## 機能

### Resources
- 事業所情報の取得 (`companies://list`, `companies://current`)
- 勘定科目一覧の取得 (`account-items://list`)
- 取引先情報の取得 (`partners://list`)
- 部門情報の取得 (`sections://list`)
- 品目情報の取得 (`items://list`)
- メモタグ情報の取得 (`tags://list`)
- 取引データの取得 (`deals://list`)
- 試算表データの取得 (`trial-balance://current`)

### Tools
- OAuth認証 (`generate-auth-url`, `exchange-auth-code`, `check-auth-status`)
- 接続テスト (`test-connection`)
- 新規取引の作成 (`create-deal`)
- 取引の更新 (`update-deal`)
- 取引先の作成 (`create-partner`)
- 勘定科目の作成 (`create-account-item`)
- システム監視 (`get-rate-limit-info`, `get-logs`, `get-metrics`, `get-health`)
- キャッシュ管理 (`get-cache-stats`, `clear-cache`)

### Prompts
- セットアップガイド (`setup-guide`)
- 取引入力支援 (`transaction-entry`)
- 月次決算チェックリスト (`monthly-closing`)
- 試算表分析ガイド (`trial-balance-analysis`)

## プロジェクト構成

```
mcp-server/
├── apps/
│   └── freee-accounting/     # freee会計MCP server
├── packages/
│   ├── shared/               # 共通ライブラリ
│   └── types/                # 型定義
├── docs/
│   ├── SPECIFICATION.md      # 仕様書
│   └── freee-mcp-todo.md     # 開発タスク一覧
├── package.json
├── turbo.json
└── README.md
```

## 特徴

- **完全なOAuth 2.0対応**: freeeの認証フローを完全サポート
- **型安全**: TypeScriptによる完全な型定義
- **モノレポ構成**: 共通ライブラリとアプリケーションの分離
- **MCP準拠**: Model Context Protocolの仕様に完全準拠
- **レート制限対応**: 自動的なレート制限管理とリトライ機能
- **包括的なログ**: レベル別ログ機能と運用監視
- **エラーハンドリング**: 詳細なエラー情報とリトライ可能性の判定
- **認証情報永続化**: トークンの自動保存・復元機能
- **高性能キャッシュ**: メモリベースキャッシュによる高速レスポンス
- **セキュリティ強化**: トークン暗号化、セキュリティ監査、入力値検証
- **監視・メトリクス**: リアルタイム監視、ヘルスチェック、アラート機能
- **プロダクションレディ**: 企業レベルでの運用に対応

## セットアップ

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上

### インストール

```bash
# 依存関係のインストール
npm install

# 開発用ビルド
npm run dev

# 本番用ビルド
npm run build
```

### 環境変数設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=your_redirect_uri
FREEE_API_BASE_URL=https://api.freee.co.jp
```

## 開発

### 利用可能なスクリプト

- `npm run build` - 全パッケージのビルド
- `npm run dev` - 開発モードでの実行
- `npm run test` - テストの実行
- `npm run lint` - リントの実行
- `npm run type-check` - 型チェックの実行
- `npm run format` - コードフォーマットの実行
- `npm run debug` - MCP Inspector を使用したデバッグ（開発版）
- `npm run debug:build` - MCP Inspector を使用したデバッグ（ビルド版）
- `npm run inspect` - MCP Inspector を使用したインタラクティブテスト（開発版）
- `npm run inspect:build` - MCP Inspector を使用したインタラクティブテスト（ビルド版）

### 開発環境

このプロジェクトはmonorepo構成でTurborepoを使用しています。各パッケージは独立して開発・テストできます。

#### ES Module対応

プロジェクトは完全にES Moduleに対応しており、以下の特徴があります：

- 全パッケージで`"type": "module"`を設定
- TypeScriptからES Moduleへの自動変換
- 相対インポートの自動修正（`.js`拡張子の追加）
- Node.js 18+での最適化されたパフォーマンス

#### ビルドプロセス

1. **TypeScript コンパイル**: ソースコードをES Moduleとしてコンパイル
2. **インポート修正**: 相対インポートに`.js`拡張子を自動追加
3. **型定義生成**: `.d.ts`ファイルの生成
4. **依存関係解決**: パッケージ間の依存関係を自動解決

## デバッグ

### MCP Inspector を使用したデバッグ

MCP Inspector は、MCPサーバーをインタラクティブにテスト・デバッグするためのツールです。

#### 基本的な使用方法

```bash
# 開発版（TypeScript）でのデバッグ
npm run debug

# ビルド版（JavaScript）でのデバッグ
npm run debug:build

# または、個別のアプリケーションで実行
cd apps/freee-accounting
npm run debug
```

#### MCP Inspector の機能

- **Resources タブ**: 利用可能なリソースの一覧表示とテスト
- **Prompts タブ**: プロンプトテンプレートの表示とテスト
- **Tools タブ**: ツールの一覧表示と実行テスト
- **Notifications ペイン**: サーバーからのログと通知の表示

#### デバッグワークフロー

1. **開発開始**
   ```bash
   npm run debug
   ```
   - ブラウザで表示されたURL（http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...）にアクセス
   - サーバーとの基本接続を確認
   - 機能ネゴシエーションをチェック

2. **Inspector GUI での操作**

   **Server Connection Pane（サーバー接続設定）:**
   - **Transport**: `stdio` を選択（デフォルト）
   - **Command**: `tsx` または `node`
   - **Arguments**:
     - 開発版: `apps/freee-accounting/src/index.ts`
     - ビルド版: `apps/freee-accounting/dist/index.js`
   - **Environment Variables**: 必要に応じて環境変数を設定

   **Resources タブでのテスト:**
   - `companies://list` - 事業所一覧の取得
   - `companies://current` - 現在の事業所情報
   - `account-items://list` - 勘定科目一覧
   - `partners://list` - 取引先一覧
   - `deals://list` - 取引データ一覧
   - `trial-balance://current` - 試算表データ

   **Tools タブでのテスト:**
   - `generate-auth-url` - OAuth認証URL生成（引数不要）
   - `check-auth-status` - 認証状態確認（引数不要）
   - `test-connection` - 接続テスト（引数不要）
   - `get-health` - ヘルスチェック（引数不要）
   - `create-deal` - 取引作成（JSON形式で取引データを入力）
   - `create-partner` - 取引先作成（JSON形式で取引先データを入力）

   **Prompts タブでのテスト:**
   - `setup-guide` - セットアップガイド（引数不要）
   - `transaction-entry` - 取引入力支援（引数不要）
   - `monthly-closing` - 月次決算チェックリスト（引数不要）
   - `trial-balance-analysis` - 試算表分析ガイド（引数不要）

3. **反復テスト**
   - サーバーコードを変更
   - サーバーを再ビルド
   - Inspector を再接続
   - 影響を受ける機能をテスト
   - Notifications ペインでメッセージを監視

4. **エッジケースのテスト**
   - 無効な入力値でのツール実行
   - 不足しているプロンプト引数
   - 並行操作のテスト
   - エラーハンドリングとエラーレスポンスの確認

#### 環境変数の設定

デバッグ時は、`.env` ファイルに以下の環境変数を設定してください：

```env
# freee API設定
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=http://localhost:3000/callback
FREEE_API_BASE_URL=https://api.freee.co.jp

# デバッグ設定
DEBUG=true
LOG_LEVEL=debug
```

#### 具体的なテスト例

**1. OAuth認証フローのテスト:**
```
Tools タブ → generate-auth-url → Execute
→ 生成されたURLでブラウザ認証
→ exchange-auth-code → 認証コードを入力 → Execute
→ check-auth-status → Execute（認証状態確認）
```

**2. 基本データ取得のテスト:**
```
Resources タブ → companies://list → Load
→ account-items://list → Load
→ partners://list → Load
```

**3. 取引作成のテスト:**
```
Tools タブ → create-deal → 以下のJSONを入力:
{
  "issue_date": "2024-01-15",
  "type": "income",
  "company_id": 123456,
  "details": [
    {
      "account_item_id": 1,
      "amount": 10000,
      "tax_code": 1
    }
  ]
}
```

**4. システム監視のテスト:**
```
Tools タブ → get-health → Execute
→ get-metrics → Execute
→ get-rate-limit-info → Execute
```

#### トラブルシューティング

- **接続エラー**: 環境変数が正しく設定されているか確認
- **認証エラー**: freee APIの認証情報が有効か確認
- **レート制限**: API呼び出し頻度を調整

## プロジェクト状況

🎉 **プロジェクト完了！**

freee会計 MCP Serverは、5つのフェーズを経て完全に実装され、プロダクションレディな状態に到達しました：

- **Phase 1-2**: 基本機能・OAuth認証・基本リソース・ツール実装 ✅
- **Phase 3**: 残りのリソース・ツール・Prompts・認証情報永続化 ✅
- **Phase 4**: レート制限対応・エラーハンドリング強化・ログ機能・テスト実装 ✅
- **Phase 5**: パフォーマンス最適化・セキュリティ強化・監視機能・ドキュメント充実 ✅

### 実装済み機能

- **8種類のResources**: 事業所、勘定科目、取引先、部門、品目、メモタグ、取引、試算表
- **12種類のTools**: 認証、CRUD操作、システム監視、キャッシュ管理
- **4種類のPrompts**: セットアップ、取引入力支援、月次決算、試算表分析
- **企業レベルの運用機能**: 監視、メトリクス、セキュリティ、パフォーマンス最適化

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。詳細は`docs/development/`配下の規約をご確認ください。
