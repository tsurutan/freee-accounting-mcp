# freee会計 MCP Server

freee会計APIと連携するModel Context Protocol (MCP) Serverです。

## 概要

このプロジェクトは、freee会計APIを通じて会計データにアクセスし、AI アシスタントが会計業務を支援できるようにするMCPサーバーを提供します。

## 機能

### Resources
- 事業所情報の取得
- 勘定科目一覧の取得
- 取引先情報の取得
- 部門・品目情報の取得
- 取引データの取得
- 試算表データの取得

### Tools
- 新規取引の作成
- 取引の更新
- 取引先の作成
- 勘定科目の作成
- 請求書・見積書の作成

### Prompts
- 取引入力支援
- 月次決算チェックリスト
- 試算表分析ガイド

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

### 開発環境

このプロジェクトはmonorepo構成でTurborepoを使用しています。各パッケージは独立して開発・テストできます。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。詳細は`docs/development/`配下の規約をご確認ください。
