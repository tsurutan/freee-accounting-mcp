# freee API OAuth認証フロー対応 TODO

## 概要
freee APIの公式認証フロー（https://developer.freee.co.jp/startguide/starting-api）に沿って、client_idとclient_secretを使用したOAuth 2.0認証フローに完全対応する。

## 現在の状況
- ✅ 直接トークン認証（FREEE_ACCESS_TOKEN）は実装済み
- ✅ OAuth認証の基本実装は存在するが、freee公式フローに完全準拠していない
- ❌ 認証URLのエンドポイントが間違っている（/oauth/token → /public_api/token）
- ❌ 認証URLの生成が公式仕様に準拠していない
- ❌ 事業所選択機能（prompt=select_company）が未実装

## タスク一覧

### 1. OAuth認証エンドポイントの修正
- [x] **1.1** `packages/shared/src/auth.ts`の修正
  - [x] 認証URLを `https://accounts.secure.freee.co.jp/public_api/authorize` に変更
  - [x] トークン取得URLを `https://accounts.secure.freee.co.jp/public_api/token` に変更
  - [x] リフレッシュトークンURLを `https://accounts.secure.freee.co.jp/public_api/token` に変更

### 2. 認証URL生成の修正
- [x] **2.1** `generateAuthUrl`メソッドの修正
  - [x] パラメータを公式仕様に準拠
    - `response_type=code`
    - `client_id={client_id}`
    - `redirect_uri={encoded_callback_url}`
    - `state={random_string}`
    - `prompt=select_company` （事業所選択を有効化）
  - [x] stateパラメータのCSRF対策実装
  - [x] redirect_uriの適切なエンコード処理

### 3. 認証コード交換処理の修正
- [x] **3.1** `exchangeCodeForTokens`メソッドの修正
  - [x] リクエストヘッダーに `Content-Type: application/x-www-form-urlencoded` を設定
  - [x] パラメータ形式を公式仕様に準拠
  - [x] company_idとexternal_cidの取得・保存処理を追加（型定義更新）

### 4. リフレッシュトークン処理の修正
- [x] **4.1** `refreshTokens`メソッドの修正
  - [x] エンドポイントURLの修正
  - [x] リクエスト形式を公式仕様に準拠
  - [x] リフレッシュトークンの有効期限管理（90日間）

### 5. 事業所選択機能の実装
- [x] **5.1** 事業所選択オプションの追加
  - [x] `prompt=select_company`パラメータの制御
  - [x] 複数事業所対応のトークン管理
  - [x] 事業所IDの適切な保存・取得

### 6. エラーハンドリングの改善
- [x] **6.1** freee API固有のエラー処理
  - [x] 認証エラーの詳細メッセージ
  - [x] レート制限エラーの適切な処理
  - [x] トークン期限切れの自動検出・更新

### 7. 設定・環境変数の整理
- [x] **7.1** 環境変数の見直し
  - [x] `FREEE_CLIENT_ID` - freeeアプリのクライアントID
  - [x] `FREEE_CLIENT_SECRET` - freeeアプリのクライアントシークレット
  - [x] `FREEE_REDIRECT_URI` - 認証後のリダイレクトURI
  - [x] `FREEE_API_BASE_URL` - APIベースURL（デフォルト: https://api.freee.co.jp）

### 8. ドキュメントの更新
- [x] **8.1** README.mdの更新
  - [x] OAuth認証の設定手順を公式フローに準拠
  - [x] freeeアプリ作成手順の追加
  - [x] 認証フローの詳細説明

- [x] **8.2** API_SPECIFICATION.mdの更新
  - [x] OAuth認証フローの詳細仕様
  - [x] エラーレスポンスの仕様
  - [x] 事業所選択機能の説明

### 9. テストの追加・修正
- [x] **9.1** OAuth認証のテスト
  - [x] 認証URL生成のテスト
  - [x] 認証コード交換のテスト
  - [x] リフレッシュトークンのテスト
  - [x] エラーケースのテスト

### 10. 開発・デバッグ支援
- [x] **10.1** MCP Inspector対応の確認
  - [x] OAuth認証フローのデバッグ機能
  - [x] 認証状態の可視化

### 11. セキュリティ強化
- [x] **11.1** セキュリティ機能の確認・強化
  - [x] stateパラメータによるCSRF対策
  - [x] トークンの暗号化保存
  - [x] セキュリティ監査ログ

## 実装優先順位

### Phase 1: 基本OAuth認証の修正（必須） ✅ 完了
1. OAuth認証エンドポイントの修正（タスク1） ✅
2. 認証URL生成の修正（タスク2） ✅
3. 認証コード交換処理の修正（タスク3） ✅
4. リフレッシュトークン処理の修正（タスク4） ✅

### Phase 2: 機能拡張（推奨） ✅ 完了
5. 事業所選択機能の実装（タスク5） ✅
6. エラーハンドリングの改善（タスク6） ✅
7. 設定・環境変数の整理（タスク7） ✅

### Phase 3: ドキュメント・テスト（重要） ✅ 完了
8. ドキュメントの更新（タスク8） ✅
9. テストの追加・修正（タスク9） ✅

### Phase 4: 運用・保守（任意） ✅ 完了
10. 開発・デバッグ支援（タスク10） ✅
11. セキュリティ強化（タスク11） ✅

## 参考資料
- [freee API スタートガイド - アプリケーションを作成する](https://developer.freee.co.jp/startguide/starting-api)
- [freee API スタートガイド - アクセストークンを取得する](https://developer.freee.co.jp/startguide/getting-access-token)
- [freee API リファレンス](https://developer.freee.co.jp/reference/accounting/reference)
- [OAuth 2.0 Authorization Code Grant](https://tools.ietf.org/html/rfc6749#section-4.1)

## 実装完了状況

🎉 **全Phase完了** - freee APIの公式OAuth 2.0認証フローに完全準拠した本格的なMCPサーバーが完成しました。

### 主な成果
1. **freee公式認証フローへの完全準拠**
2. **事業所選択機能の実装**
3. **詳細なエラーハンドリング**
4. **包括的なドキュメント整備**
5. **充実したテストスイート**
6. **運用・保守機能の実装**
7. **セキュリティ強化**

### 新機能（Phase 4で追加）
- **デバッグ情報ツール**: システム状態の詳細表示
- **ヘルスチェック機能**: 包括的なシステム監視
- **セキュリティ監査**: セキュリティイベントの追跡・分析
- **MCP Inspector完全対応**: 開発・デバッグの効率化

### 後方互換性
- 既存の直接トークン認証（FREEE_ACCESS_TOKEN）は維持
- 破壊的変更なし
- 既存ユーザーは設定変更不要

## 注意事項
- 本番環境での動作確認を必ず実施する
- セキュリティ要件を満たすことを最優先とする
- トークンの適切な管理を実施する
