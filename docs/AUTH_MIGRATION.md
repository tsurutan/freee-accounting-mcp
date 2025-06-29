# freee会計 MCP Server 機能拡張について

## 概要

freee会計 MCP Serverに以下の機能拡張を実施しました：
1. 直接トークン認証方式の追加
2. 固定事業所ID（2067140）の設定
3. 取引一覧取得ツール（get-deals）の追加

## 変更内容

### 1. 認証方式の追加

#### 直接トークン認証（新規追加）
- 環境変数`FREEE_ACCESS_TOKEN`でアクセストークンを直接指定
- 設定が簡単で即座に利用開始可能
- OAuth認証フローが不要

#### OAuth認証（既存）
- 従来通りのOAuth 2.0認証フロー
- トークンの自動更新に対応
- ブラウザでの認証が必要

### 2. 認証方式の優先順位

1. `FREEE_ACCESS_TOKEN`が設定されている場合 → 直接トークン認証
2. `FREEE_CLIENT_ID`と`FREEE_CLIENT_SECRET`が設定されている場合 → OAuth認証
3. どちらも設定されていない場合 → 認証エラー

### 3. 環境変数の変更

#### 新規追加
```env
FREEE_ACCESS_TOKEN=your_access_token_here
```

#### 既存（変更なし）
```env
FREEE_CLIENT_ID=your_client_id_here
FREEE_CLIENT_SECRET=your_client_secret_here
FREEE_REDIRECT_URI=http://localhost:3000/callback
FREEE_API_BASE_URL=https://api.freee.co.jp
```

### 4. ツールの動作変更

#### `check-auth-status`
- 直接トークン認証の場合: "認証済み（直接トークン認証）"
- OAuth認証の場合: 従来通りの動作
- 認証設定なしの場合: 適切なエラーメッセージ

#### `generate-auth-url` / `exchange-auth-code`
- 直接トークン認証使用時は「OAuth認証が設定されていません」メッセージを表示
- OAuth認証使用時は従来通りの動作

### 5. 固定事業所ID設定

#### 新規追加ファイル
- `apps/freee-accounting/src/config.ts`: 設定管理ファイル

#### 設定内容
- 事業所ID: 2067140（固定）
- デフォルト取引取得期間: 30日
- デフォルト取引取得件数: 100件

### 6. 取引一覧取得ツール

#### 新規ツール: `get-deals`
- 取引一覧の取得
- 日付範囲指定（start_date, end_date）
- 年月指定（year, month）
- 件数制限（limit, offset）

#### 削除されたリソース
- `deals://list` リソース（ツールに統合）

### 7. コード変更箇所

#### `apps/freee-accounting/src/index.ts`
- 認証方式の判定ロジック追加
- 認証状態チェック用ヘルパー関数追加
- OAuth設定の条件付き初期化
- 各ツール・リソースの認証チェック更新
- 固定company_idの使用
- get-dealsツールの追加
- company_idパラメータの削除（各ツール）

#### `README.md`
- 認証方式の説明を更新
- 環境変数設定例を追加

#### `docs/SPECIFICATION.md`
- 認証セクションを更新
- 両方の認証方式について詳細説明

#### `.env.example`
- 新しい認証方式の設定例を追加

## 使用方法

### 直接トークン認証の場合

1. freee APIのアクセストークンを取得
2. 環境変数を設定:
   ```bash
   export FREEE_ACCESS_TOKEN="your_access_token"
   ```
3. MCP Serverを起動:
   ```bash
   npm run build && node apps/freee-accounting/dist/index.js
   ```

### OAuth認証の場合

従来通りの手順で利用可能です。

## 互換性

- 既存のOAuth認証設定は変更なしで動作します
- 新しい直接トークン認証は追加機能として提供されます
- 破壊的変更はありません

## テスト結果

- 直接トークン認証: ✅ 正常動作確認
- OAuth認証: ✅ 既存機能の動作確認
- 認証設定なし: ✅ 適切なエラーメッセージ表示
- MCPプロトコル: ✅ 全認証方式で正常動作

## 推奨事項

- 新規ユーザーには直接トークン認証を推奨
- 既存ユーザーは現在の設定を継続利用可能
- 本番環境では適切なトークン管理を実施
