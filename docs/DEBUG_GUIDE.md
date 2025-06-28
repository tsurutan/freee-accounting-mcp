# デバッグガイド

freee会計 MCP Server のデバッグ方法について説明します。

## MCP Inspector

MCP Inspector は、Model Context Protocol サーバーをインタラクティブにテスト・デバッグするための公式ツールです。

### インストール

MCP Inspector は npx を通じて直接実行できるため、インストールは不要です。

### 基本的な使用方法

#### 開発版（TypeScript）でのデバッグ

```bash
# ルートディレクトリから
npm run debug

# または apps/freee-accounting ディレクトリから
cd apps/freee-accounting
npm run debug
```

#### ビルド版（JavaScript）でのデバッグ

```bash
# ルートディレクトリから
npm run debug:build

# または apps/freee-accounting ディレクトリから
cd apps/freee-accounting
npm run debug:build
```

#### 直接実行

```bash
# 開発版
npx @modelcontextprotocol/inspector tsx apps/freee-accounting/src/index.ts

# ビルド版
npm run build
npx @modelcontextprotocol/inspector node apps/freee-accounting/dist/index.js
```

## Inspector の機能

### Server Connection Pane
- サーバーへの接続に使用するトランスポートの選択
- ローカルサーバー用のコマンドライン引数と環境のカスタマイズ

### Resources Tab
- 利用可能なリソースの一覧表示
- リソースメタデータ（MIME タイプ、説明）の表示
- リソースコンテンツの検査
- サブスクリプションテストのサポート

### Prompts Tab
- 利用可能なプロンプトテンプレートの表示
- プロンプト引数と説明の表示
- カスタム引数でのプロンプトテスト
- 生成されたメッセージのプレビュー

### Tools Tab
- 利用可能なツールの一覧表示
- ツールスキーマと説明の表示
- カスタム入力でのツールテスト
- ツール実行結果の表示

### Notifications Pane
- サーバーから記録されたすべてのログの表示
- サーバーから受信した通知の表示

## デバッグワークフロー

### 1. 開発開始

```bash
npm run debug
```

- ブラウザで表示されたURL（http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...）にアクセス
- サーバーとの基本接続を確認
- 機能ネゴシエーションをチェック
- 利用可能なリソース、プロンプト、ツールを確認

### 2. Inspector GUI での詳細操作

#### Server Connection Pane（サーバー接続設定）

**基本設定:**
- **Transport**: `stdio`（標準入出力）を選択
- **Command**:
  - 開発版: `tsx`
  - ビルド版: `node`
- **Arguments**:
  - 開発版: `apps/freee-accounting/src/index.ts`
  - ビルド版: `apps/freee-accounting/dist/index.js`

**環境変数設定（必要に応じて）:**
```
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
DEBUG=true
LOG_LEVEL=debug
```

#### Resources タブでのテスト

**利用可能なリソース:**
- `companies://list` - 事業所一覧
- `companies://current` - 現在の事業所
- `account-items://list` - 勘定科目一覧
- `partners://list` - 取引先一覧
- `sections://list` - 部門一覧
- `items://list` - 品目一覧
- `tags://list` - メモタグ一覧
- `deals://list` - 取引データ一覧
- `trial-balance://current` - 試算表データ

**操作方法:**
1. リソースを選択
2. 「Load」ボタンをクリック
3. 取得されたデータを確認

#### Tools タブでのテスト

**認証関連ツール:**
- `generate-auth-url` - OAuth認証URL生成（引数不要）
- `exchange-auth-code` - 認証コード交換
  ```json
  {
    "code": "認証コード",
    "state": "状態パラメータ"
  }
  ```
- `check-auth-status` - 認証状態確認（引数不要）

**接続テストツール:**
- `test-connection` - 接続テスト（引数不要）

**CRUD操作ツール:**
- `create-deal` - 取引作成
  ```json
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
- `update-deal` - 取引更新
  ```json
  {
    "id": 12345,
    "issue_date": "2024-01-16",
    "details": [
      {
        "account_item_id": 1,
        "amount": 15000,
        "tax_code": 1
      }
    ]
  }
  ```
- `create-partner` - 取引先作成
  ```json
  {
    "name": "株式会社サンプル",
    "code": "SAMPLE001",
    "partner_doc_setting_attributes": {
      "sending_method": "email"
    }
  }
  ```
- `create-account-item` - 勘定科目作成
  ```json
  {
    "name": "新規勘定科目",
    "tax_code": 1,
    "account_category": "assets"
  }
  ```

**システム監視ツール:**
- `get-rate-limit-info` - レート制限情報（引数不要）
- `get-logs` - ログ取得（引数不要）
- `get-metrics` - メトリクス取得（引数不要）
- `get-health` - ヘルスチェック（引数不要）

**キャッシュ管理ツール:**
- `get-cache-stats` - キャッシュ統計（引数不要）
- `clear-cache` - キャッシュクリア（引数不要）

#### Prompts タブでのテスト

**利用可能なプロンプト:**
- `setup-guide` - セットアップガイド（引数不要）
- `transaction-entry` - 取引入力支援（引数不要）
- `monthly-closing` - 月次決算チェックリスト（引数不要）
- `trial-balance-analysis` - 試算表分析ガイド（引数不要）

**操作方法:**
1. プロンプトを選択
2. 必要に応じて引数を入力
3. 「Get Prompt」ボタンをクリック
4. 生成されたメッセージを確認

### 3. 反復テスト

1. サーバーコードを変更
2. サーバーを再ビルド（必要に応じて）
3. Inspector を再接続
4. 影響を受ける機能をテスト
5. Notifications ペインでメッセージとログを監視

### 4. エッジケースのテスト

- 無効な入力値でのツール実行
- 不足しているプロンプト引数
- 並行操作のテスト
- エラーハンドリングとエラーレスポンスの確認

## 環境設定

### 環境変数

デバッグ時は `.env` ファイルに以下の環境変数を設定してください：

```env
# freee API設定
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=http://localhost:3000/callback
FREEE_API_BASE_URL=https://api.freee.co.jp

# デバッグ設定
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
```

### テスト用認証情報

開発・テスト用には freee の開発者アカウントで取得した認証情報を使用してください。

## トラブルシューティング

### 接続エラー

- 環境変数が正しく設定されているか確認
- サーバーが正常に起動しているか確認
- ポートが他のプロセスで使用されていないか確認

### 認証エラー

- freee API の認証情報が有効か確認
- リダイレクト URI が正しく設定されているか確認
- アクセストークンの有効期限を確認

### レート制限エラー

- API 呼び出し頻度を調整
- レート制限情報を確認（`get-rate-limit-info` ツールを使用）
- 必要に応じてキャッシュを活用

### パフォーマンス問題

- ログレベルを調整（`LOG_LEVEL=error` など）
- キャッシュ統計を確認（`get-cache-stats` ツールを使用）
- メトリクスを監視（`get-metrics` ツールを使用）

## ログとモニタリング

### ログレベル

- `error`: エラーのみ
- `warn`: 警告以上
- `info`: 情報以上（デフォルト）
- `debug`: デバッグ情報を含むすべて

### 監視ツール

- `get-health`: サーバーのヘルスチェック
- `get-metrics`: パフォーマンスメトリクス
- `get-logs`: ログの取得
- `get-cache-stats`: キャッシュ統計

## 実践的なテストシナリオ

### シナリオ1: OAuth認証フローの完全テスト

1. **認証URL生成**
   - Tools タブ → `generate-auth-url` → Execute
   - 生成されたURLをコピーしてブラウザで開く

2. **認証コード交換**
   - freeeで認証後、リダイレクトURLから認証コードを取得
   - Tools タブ → `exchange-auth-code` → 以下を入力:
   ```json
   {
     "code": "取得した認証コード",
     "state": "状態パラメータ"
   }
   ```

3. **認証状態確認**
   - Tools タブ → `check-auth-status` → Execute
   - 認証が成功していることを確認

### シナリオ2: 基本データ取得とCRUD操作

1. **基本データ取得**
   - Resources タブ → `companies://list` → Load
   - Resources タブ → `account-items://list` → Load
   - Resources タブ → `partners://list` → Load

2. **取引先作成**
   - Tools タブ → `create-partner` → 以下を入力:
   ```json
   {
     "name": "テスト取引先",
     "code": "TEST001"
   }
   ```

3. **取引作成**
   - Tools タブ → `create-deal` → 以下を入力:
   ```json
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

### シナリオ3: システム監視とトラブルシューティング

1. **ヘルスチェック**
   - Tools タブ → `get-health` → Execute

2. **メトリクス確認**
   - Tools タブ → `get-metrics` → Execute

3. **レート制限確認**
   - Tools タブ → `get-rate-limit-info` → Execute

4. **ログ確認**
   - Tools タブ → `get-logs` → Execute

5. **キャッシュ管理**
   - Tools タブ → `get-cache-stats` → Execute
   - Tools タブ → `clear-cache` → Execute

## ベストプラクティス

1. **段階的テスト**: 基本機能から複雑な機能へ段階的にテスト
2. **ログ監視**: 常にNotifications ペインでログとメッセージを監視
3. **エラーハンドリング**: 様々なエラーケースをテスト
4. **パフォーマンス**: レスポンス時間とリソース使用量を監視
5. **セキュリティ**: 認証情報の適切な管理
6. **データ整合性**: CRUD操作後のデータ確認
7. **並行処理**: 複数の操作を同時実行してテスト

## 参考リンク

- [MCP Inspector 公式ドキュメント](https://modelcontextprotocol.io/docs/tools/inspector)
- [MCP Inspector GitHub リポジトリ](https://github.com/modelcontextprotocol/inspector)
- [MCP デバッグガイド](https://modelcontextprotocol.io/docs/tools/debugging)
