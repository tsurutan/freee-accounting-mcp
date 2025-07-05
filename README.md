# 📊 freee会計 MCP Server

[![NPM Version](https://img.shields.io/npm/v/@tsurutan/freee-accounting-mcp)](https://www.npmjs.com/package/@tsurutan/freee-accounting-mcp)
[![NPM Downloads](https://img.shields.io/npm/dm/@tsurutan/freee-accounting-mcp)](https://www.npmjs.com/package/@tsurutan/freee-accounting-mcp)
[![Build Status](https://img.shields.io/github/actions/workflow/status/tsurutan/mcp-server/ci.yml?branch=main)](https://github.com/tsurutan/mcp-server/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

freee会計APIと連携するModel Context Protocol (MCP) Serverです。

## 🎯 概要

このプロジェクトは、freee会計APIを通じて会計データにアクセスし、AI アシスタントが会計業務を支援できるようにするMCPサーバーを提供します。

## ⚡ 機能

### 📄 Resources
- 事業所情報の取得 (`companies://list`, `companies://current`)
- 勘定科目一覧の取得 (`account-items://list`)
- 取引先情報の取得 (`partners://list`)
- 部門情報の取得 (`sections://list`)
- 品目情報の取得 (`items://list`)
- メモタグ情報の取得 (`tags://list`)
- 取引データの取得 (`deals://list`)
- 試算表データの取得 (`trial-balance://current`)

### 🔧 Tools
- 🔐 認証管理 (`generate-auth-url`, `exchange-auth-code`, `check-auth-status`)
- ✅ 接続テスト (`test-connection`)
- 💰 取引管理 (`create-deal`, `update-deal`, `get-deals`)
- 🏢 取引先の作成 (`create-partner`)
- 📊 勘定科目の作成 (`create-account-item`)
- 📈 システム監視 (`get-rate-limit-info`, `get-logs`, `get-metrics`, `get-health`)
- 🗄️ キャッシュ管理 (`get-cache-stats`, `clear-cache`)

### 💡 Prompts
- 🚀 セットアップガイド (`setup-guide`)
- ✏️ 取引入力支援 (`transaction-entry`)
- 📅 月次決算チェックリスト (`monthly-closing`)
- 📊 試算表分析ガイド (`trial-balance-analysis`)

## 🏗️ プロジェクト構成

```
mcp-server/
├── 📁 apps/
│   └── freee-accounting/     # freee会計MCP server
├── 📁 packages/
│   ├── shared/               # 共通ライブラリ
│   └── types/                # 型定義
├── 📁 docs/
│   ├── SPECIFICATION.md      # 仕様書
│   └── freee-mcp-todo.md     # 開発タスク一覧
├── 📄 package.json
├── 📄 turbo.json
└── 📄 README.md
```

## ✨ 特徴

- 🔐 **OAuth 2.0認証**: freee公式認証フローに完全準拠
- 🏢 **事業所ID設定**: 環境変数で事業所IDを設定可能（デフォルト: 123456）
- 💰 **包括的な取引管理**: 取引の作成・更新・一覧取得をサポート
- 🛡️ **型安全**: TypeScriptによる完全な型定義
- 📦 **モノレポ構成**: 共通ライブラリとアプリケーションの分離
- 🔄 **MCP準拠**: Model Context Protocolの仕様に完全準拠
- ⚡ **レート制限対応**: 自動的なレート制限管理とリトライ機能
- 📊 **包括的なログ**: レベル別ログ機能と運用監視
- 🚨 **エラーハンドリング**: 詳細なエラー情報とリトライ可能性の判定
- 💾 **認証情報永続化**: トークンの自動保存・復元機能
- 🚀 **高性能キャッシュ**: メモリベースキャッシュによる高速レスポンス
- 🔒 **セキュリティ強化**: トークン暗号化、セキュリティ監査、入力値検証
- 📈 **監視・メトリクス**: リアルタイム監視、ヘルスチェック、アラート機能
- 🏭 **プロダクションレディ**: 企業レベルでの運用に対応

## 🚀 セットアップ

### 📋 前提条件

- ![Node.js](https://img.shields.io/badge/Node.js-18.0.0+-339933?logo=nodedotjs&logoColor=white) Node.js 18.0.0以上
- ![npm](https://img.shields.io/badge/npm-9.0.0+-CB3837?logo=npm&logoColor=white) npm 9.0.0以上

### 📦 インストール

```bash
# 依存関係のインストール
npm install

# 開発用ビルド
npm run dev

# 本番用ビルド
npm run build
```

### ⚙️ 環境変数設定

`.env`ファイルを作成し、以下の環境変数を設定してください：

#### 🔐 OAuth 2.0認証

```env
# OAuth設定
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret

# 事業所ID設定（下記「事業所IDの取得方法」を参照）
FREEE_COMPANY_ID=123456

# オプション設定
FREEE_API_BASE_URL=https://api.freee.co.jp
```

> **⚠️ 注意**:
> - OAuth認証では事業所選択機能を制御できます。
> - 事業所選択を有効にすると、認証時に特定の事業所を選択してアクセスを制限できます。
> - 事業所選択を無効にすると、ユーザーが所属する全ての事業所にアクセス可能になります。

### 🏢 事業所IDの取得方法

事業所IDを取得する方法は複数あります：

1. **🌐 freee Web版から取得**
   - freee Web版にログインし、設定画面やURLから事業所IDを確認できます
   - ブラウザのアドレスバーで `https://secure.freee.co.jp/companies/XXXXXX` のXXXXXXが事業所IDです

2. **🔌 API経由で取得**
   - 認証後、`get-companies` ツールを使用して利用可能な事業所一覧を取得できます
   - レスポンスの `id` フィールドが事業所IDになります

3. **🤖 Claude Code経由で取得**
   - Claude Codeで「利用可能な事業所を教えてください」とリクエストすることで確認できます

### ⚠️ 重要な免責事項

> **🚨 本MCPサーバーについて**
> - 本MCPサーバーは非公式のものです
> - freee株式会社によって開発・サポートされているものではありません
> - 本ソフトウェアの使用によって生じた一切の損害について、開発者は責任を負いません
> - 本番環境での使用は自己責任でお願いします
> - データの正確性や完全性について保証するものではありません

## 📦 インストール方法

### 🚀 オンラインインストール（推奨）

**NPMからのインストール:**

```bash
# グローバルインストール
npm install -g @tsurutan/freee-accounting-mcp

# Claude Codeで使用
claude mcp add freee-accounting \
  -e FREEE_CLIENT_ID=your_client_id \
  -e FREEE_CLIENT_SECRET=your_client_secret \
  -- npx @tsurutan/freee-accounting-mcp
```

**npxを使用した直接実行:**

```bash
# Claude Codeで使用（インストール不要）
claude mcp add freee-accounting \
  -e FREEE_CLIENT_ID=your_client_id \
  -e FREEE_CLIENT_SECRET=your_client_secret \
  -- npx @tsurutan/freee-accounting-mcp
```

### 🔧 ローカル開発版のインストール

開発者向けまたはローカル環境での使用：

```bash
# リポジトリをクローン
git clone https://github.com/tsurutan/mcp-server.git
cd mcp-server

# 依存関係をインストール
npm install

# プロジェクトをビルド
npm run build

# Claude Codeで使用
claude mcp add freee-accounting \
  -e FREEE_CLIENT_ID=your_client_id \
  -e FREEE_CLIENT_SECRET=your_client_secret \
  -- node ./apps/freee-accounting/dist/index.js
```

## 🤖 Claude Codeでの使用方法

### 1️⃣ 設定の確認

```bash
# 設定を確認
claude mcp list
claude mcp get freee-accounting
```

### 2️⃣ Claude Codeでの使用

MCPサーバーがインストールされると、Claude Codeで以下のリソースとツールが利用できます：

- 📊 **会計データの取得**: 取引、勘定科目、取引先などの情報
- ✏️ **取引の作成・更新**: 新規取引の入力や既存取引の修正
- 📈 **試算表の分析**: 月次・年次の財務データの分析
- 🔐 **認証管理**: freee APIへの認証とアクセス管理

### 3️⃣ 使用例

Claude Codeで以下のようにMCPサーバーを活用できます：

```
# 取引データの取得
"12月の売上取引を確認してください"

# 新規取引の作成
"消耗品費として3000円の取引を作成してください"

# 試算表の分析
"今月の損益計算書を分析してください"
```

## 🔧 従来の使用方法

### 🔐 認証の設定

#### OAuth認証の場合

1. **freeeアプリケーションの作成**
   - [freeeアプリストアの開発者向けアプリ一覧画面](https://app.secure.freee.co.jp/developers/applications)にアクセス
   - 「新規追加」をクリックしてアプリケーションを作成
   - アプリ名と概要を入力
   - Client IDとClient Secretを取得

2. **環境変数を設定**
   ```bash
   export FREEE_CLIENT_ID="your_client_id"
   export FREEE_CLIENT_SECRET="your_client_secret"
   ```

3. **MCP Serverを起動**
   ```bash
   npm run build && node apps/freee-accounting/dist/index.js
   ```

4. **OAuth認証フローの実行**

   a. 認証URLを生成:
   ```bash
   # 事業所選択を有効にして認証URL生成（推奨）
   generate-auth-url --enable_company_selection=true

   # または事業所選択を無効にして全事業所アクセス
   generate-auth-url --enable_company_selection=false
   ```

   b. 生成されたURLにブラウザでアクセス:
   - freeeアカウントでログイン
   - 事業所を選択（enable_company_selection=trueの場合）
   - アプリケーションのアクセス権限を確認
   - 「許可する」をクリック

   c. 認証コードを取得:
   - リダイレクトURLのcodeパラメータから認証コードを取得

   d. 認証コードをアクセストークンに交換:
   ```bash
   exchange-auth-code --code="取得した認証コード"
   ```

5. **認証状態の確認**
   ```bash
   check-auth-status
   ```

### 📖 基本的な使用例

```bash
# 認証状態の確認
check-auth-status

# 事業所一覧の取得
companies://list

# 取引一覧の取得（過去30日）
get-deals

# 取引一覧の取得（年月指定）
get-deals --year 2024 --month 12

# 取引一覧の取得（日付範囲指定）
get-deals --start_date 2024-12-01 --end_date 2024-12-31

# 取引の作成（事業所ID自動設定）
create-deal
```

## 🏗️ アーキテクチャ

### 🔧 レイヤー構成

このプロジェクトは、クリーンアーキテクチャの原則に基づいて設計されています：

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   MCP Server    │  │   Handlers      │  │   Middleware    │ │
│  │   (Express)     │  │   (Tools/Res)   │  │   (Auth/Log)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Use Cases     │  │   Services      │  │   Validators    │ │
│  │   (Business)    │  │   (Auth/Data)   │  │   (Input/Rule)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  API Client     │  │  Response       │  │  Debug/Log      │ │
│  │  (freee API)    │  │  Mapper         │  │  (Interceptor)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Entities      │  │   Value Objects │  │   Domain Rules  │ │
│  │   (Company/Deal)│  │   (Money/Date)  │  │   (Validation)  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 インフラ層の主要コンポーネント

#### 🌐 FreeeApiClient
- freee APIとの通信を担当する統一インターフェース
- レート制限、リトライ、キャッシュ機能を内蔵
- デバッグ機能とログ機能を統合

#### 🔄 ApiResponseMapper
- freee APIレスポンスの標準化とマッピング
- 型安全なデータ変換
- ページネーション情報の抽出

#### 🔍 DebugInterceptor
- HTTP リクエスト/レスポンスのデバッグ出力
- MCP Inspector対応
- 機密情報のマスキング機能

#### 📊 LoggerSetup
- 環境別ログ設定の管理
- プロファイルベースの設定切り替え
- 構造化ログとファイル出力

### 🔌 依存性注入

InversifyJSを使用したDIコンテナにより、各レイヤー間の疎結合を実現：

```typescript
// 例: サービスクラスでの依存性注入
@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.FreeeApiClient) private apiClient: FreeeApiClient,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler
  ) {}
}
```

### 🚨 エラーハンドリング

Result型パターンを採用し、型安全なエラーハンドリングを実現：

```typescript
// 成功・失敗を明示的に表現
const result = await authService.authenticate(token);
if (result.isOk()) {
  // 成功時の処理
  console.log(result.value);
} else {
  // エラー時の処理
  console.error(result.error);
}
```

## 🛠️ 開発

### 📋 利用可能なスクリプト

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

### 🏗️ 開発環境

このプロジェクトはmonorepo構成でTurborepoを使用しています。各パッケージは独立して開発・テストできます。

#### 📦 ES Module対応

プロジェクトは完全にES Moduleに対応しており、以下の特徴があります：

- 全パッケージで`"type": "module"`を設定
- TypeScriptからES Moduleへの自動変換
- 相対インポートの自動修正（`.js`拡張子の追加）
- Node.js 18+での最適化されたパフォーマンス

#### 🔧 ビルドプロセス

1. **TypeScript コンパイル**: ソースコードをES Moduleとしてコンパイル
2. **インポート修正**: 相対インポートに`.js`拡張子を自動追加
3. **型定義生成**: `.d.ts`ファイルの生成
4. **依存関係解決**: パッケージ間の依存関係を自動解決

## 🔍 デバッグ

### MCP Inspector を使用したデバッグ

MCP Inspector は、MCPサーバーをインタラクティブにテスト・デバッグするためのツールです。

#### 🚀 基本的な使用方法

```bash
# 開発版（TypeScript）でのデバッグ
npm run debug

# ビルド版（JavaScript）でのデバッグ
npm run debug:build

# または、個別のアプリケーションで実行
cd apps/freee-accounting
npm run debug
```

#### 🛠️ MCP Inspector の機能

- **📄 Resources タブ**: 利用可能なリソースの一覧表示とテスト
- **💡 Prompts タブ**: プロンプトテンプレートの表示とテスト
- **🔧 Tools タブ**: ツールの一覧表示と実行テスト
- **📋 Notifications ペイン**: サーバーからのログと通知の表示

#### 🔄 デバッグワークフロー

1. **開発開始**
   ```bash
   npm run debug
   ```
   - ブラウザで表示されたURL（http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...）にアクセス
   - サーバーとの基本接続を確認
   - 機能ネゴシエーションをチェック

2. **HTTPリクエスト/レスポンスのデバッグ**
   ```bash
   # axiosのリクエスト/レスポンスをコンソールに表示
   DEBUG_AXIOS=true npm run debug

   # または環境変数を設定してから実行
   export DEBUG_AXIOS=true
   npm run debug
   ```

   デバッグモードでは以下の情報が表示されます：
   - 🔐 OAuth認証リクエスト/レスポンス（機密情報はマスク）
   - 📡 freee APIリクエスト/レスポンス（アクセストークンはマスク）
   - ❌ エラー詳細情報

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

#### ⚙️ 環境変数の設定

デバッグ時は、`.env` ファイルに以下の環境変数を設定してください：

```env
# freee API設定
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_API_BASE_URL=https://api.freee.co.jp

# デバッグ設定
DEBUG=true
LOG_LEVEL=debug
```

#### 🧪 具体的なテスト例

**1. 🔐 OAuth認証フローのテスト:**
```
Tools タブ → generate-auth-url → Execute
→ 生成されたURLでブラウザ認証
→ exchange-auth-code → 認証コードを入力 → Execute
→ check-auth-status → Execute（認証状態確認）
```

**2. 📊 基本データ取得のテスト:**
```
Resources タブ → companies://list → Load
→ account-items://list → Load
→ partners://list → Load
```

**3. 💰 取引作成のテスト:**
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

**4. 📈 システム監視のテスト:**
```
Tools タブ → get-health → Execute
→ get-metrics → Execute
→ get-rate-limit-info → Execute
```

#### 🔧 トラブルシューティング

- **🔌 接続エラー**: 環境変数が正しく設定されているか確認
- **🔐 認証エラー**: freee APIの認証情報が有効か確認
- **⚡ レート制限**: API呼び出し頻度を調整

## 🚀 公開・配布について

### NPMパッケージとして公開

このMCPサーバーは[@tsurutan/freee-accounting-mcp](https://www.npmjs.com/package/@tsurutan/freee-accounting-mcp)としてNPMに公開されており、世界中の開発者が簡単にインストールできます。

### GitHub Actions による自動化

- **CI/CD パイプライン**: コードのプッシュ時に自動テスト・ビルド
- **自動公開**: タグ作成時にNPMへの自動公開
- **品質保証**: ESLint、TypeScriptチェック、テスト実行

### 公開手順

```bash
# 1. バージョンアップ
npm version patch|minor|major

# 2. タグをプッシュ（自動公開がトリガーされる）
git push origin --tags

# 3. NPMで公開を確認
npm info @tsurutan/freee-accounting-mcp
```

## 🎯 プロジェクト状況

🎉 **プロジェクト完了・公開済み！**

freee会計 MCP Serverは、5つのフェーズを経て完全に実装され、NPMで公開されているプロダクションレディな状態に到達しました：

- **Phase 1-2**: 基本機能・OAuth認証・基本リソース・ツール実装 ✅
- **Phase 3**: 残りのリソース・ツール・Prompts・認証情報永続化 ✅
- **Phase 4**: レート制限対応・エラーハンドリング強化・ログ機能・テスト実装 ✅
- **Phase 5**: パフォーマンス最適化・セキュリティ強化・監視機能・ドキュメント充実 ✅
- **Phase 6**: NPM公開・CI/CD・配布自動化 ✅

### 🚀 実装済み機能

- **📄 8種類のResources**: 事業所、勘定科目、取引先、部門、品目、メモタグ、取引、試算表
- **🔧 12種類のTools**: 認証、CRUD操作、システム監視、キャッシュ管理
- **💡 4種類のPrompts**: セットアップ、取引入力支援、月次決算、試算表分析
- **🏭 企業レベルの運用機能**: 監視、メトリクス、セキュリティ、パフォーマンス最適化
- **📦 パッケージ配布**: NPM公開、自動CI/CD、オンラインインストール対応

---

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。詳細は`docs/development/`配下の規約をご確認ください。

<div align="center">
  <h3>🙏 ご支援いただきありがとうございます！</h3>
  <p>このプロジェクトが役に立った場合は、⭐ スターを付けていただけると励みになります！</p>
</div>
