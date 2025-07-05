/**
 * OAuth認証ヘルパー
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { configureBindings } from './container/bindings.js';
import { TYPES } from './container/types.js';
import { EnvironmentConfig } from './config/environment-config.js';

async function getOAuthUrl() {
  console.error('=== freee OAuth認証URL生成 ===');

  try {
    // DIコンテナの設定
    const container = new Container();
    configureBindings(container);

    // 環境設定を取得
    const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);

    console.error('環境設定:', {
      useOAuth: envConfig.useOAuth,
      hasClientId: envConfig.hasClientId,
    });

    if (!envConfig.useOAuth) {
      console.error('❌ OAuth設定が無効です。FREEE_CLIENT_IDとFREEE_CLIENT_SECRETを設定してください。');
      return;
    }

    const oauthClient = envConfig.oauthClient;
    if (!oauthClient) {
      console.error('❌ OAuthクライアントが初期化されていません。');
      return;
    }

    // 認証URLを生成
    const authUrl = oauthClient.generateAuthUrl();

    console.error('\n✅ OAuth認証URLが生成されました:');
    console.error(authUrl);
    console.error('\n📋 手順:');
    console.error('1. 上記URLをブラウザで開く');
    console.error('2. freeeにログインして認証を許可');
    console.error('3. 表示された認証コードをコピー');
    console.error('4. 以下のコマンドで認証コードを使用してアクセストークンを取得:');
    console.error('   npx tsx src/oauth-helper.ts exchange <認証コード>');

  } catch (error) {
    console.error('❌ エラーが発生:', error);
  }
}

async function exchangeCodeForToken(code: string) {
  console.error('=== 認証コードをアクセストークンに交換 ===');

  try {
    // DIコンテナの設定
    const container = new Container();
    configureBindings(container);

    // 環境設定を取得
    const envConfig = container.get<EnvironmentConfig>(TYPES.EnvironmentConfig);
    const oauthClient = envConfig.oauthClient;

    if (!oauthClient) {
      console.error('❌ OAuthクライアントが初期化されていません。');
      return;
    }

    console.error('認証コードでアクセストークンを取得中...');

    // アクセストークンを取得
    const tokenResponse = await oauthClient.exchangeCodeForTokens(code);

    console.error('\n✅ アクセストークンを取得しました:');
    console.error('Access Token:', tokenResponse.access_token);
    console.error('Refresh Token:', tokenResponse.refresh_token);
    console.error('Expires In:', tokenResponse.expires_in, 'seconds');

    console.error('\n📋 OAuth認証完了!');
    console.error('トークンは自動的にセッションに保存されます。');
    console.error('アクセストークンは必要に応じて使用されます。');

  } catch (error) {
    console.error('❌ トークン取得エラー:', error);
  }
}

// コマンドライン引数を処理
const args = process.argv.slice(2);
const command = args[0];

if (command === 'exchange') {
  const code = args[1];
  if (!code) {
    console.error('❌ 認証コードが指定されていません。');
    console.error('使用方法: npx tsx src/oauth-helper.ts exchange <認証コード>');
    process.exit(1);
  }
  exchangeCodeForToken(code).catch(console.error);
} else {
  // デフォルトは認証URL生成
  getOAuthUrl().catch(console.error);
}
