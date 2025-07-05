# freee会計 MCP Server 認証方式について

## 重要な変更通知

**この機能は削除されました。**

直接トークン認証機能（FREEE_ACCESS_TOKEN）は、セキュリティとメンテナンスの観点から削除されました。

## 現在サポートされている認証方式

### OAuth 2.0 認証のみ

freee会計 MCP Serverは、freee公式のOAuth 2.0認証フローのみをサポートしています。

**必要な環境変数:**
```env
FREEE_CLIENT_ID=your_client_id
FREEE_CLIENT_SECRET=your_client_secret
FREEE_REDIRECT_URI=http://localhost:3000/callback
FREEE_API_BASE_URL=https://api.freee.co.jp
```

## 移行が必要な場合

以前に直接トークン認証（FREEE_ACCESS_TOKEN）を使用していた場合は、OAuth 2.0認証に移行してください。

### 移行手順

1. freeeアプリケーションの作成
   - [freeeアプリストアの開発者向けアプリ一覧画面](https://app.secure.freee.co.jp/developers/applications)でアプリケーションを作成
   - Client IDとClient Secretを取得

2. 環境変数の更新
   ```bash
   # 削除
   # FREEE_ACCESS_TOKEN=...
   
   # 追加
   FREEE_CLIENT_ID=your_client_id
   FREEE_CLIENT_SECRET=your_client_secret
   FREEE_REDIRECT_URI=http://localhost:3000/callback
   ```

3. OAuth認証フローの実行
   - `generate-auth-url` ツールで認証URLを生成
   - ブラウザで認証を実行
   - `exchange-auth-code` ツールで認証コードを交換

## 利点

OAuth 2.0認証により以下の利点があります：

- **セキュリティの向上**: freee公式認証フローによる安全な認証
- **トークンの自動更新**: 有効期限切れの自動対応
- **事業所選択機能**: 特定の事業所のみへのアクセス制限
- **監査ログ**: 詳細な認証イベントの記録

## サポート

移行に関する質問がある場合は、プロジェクトのGitHub Issuesまたはドキュメントを参照してください。