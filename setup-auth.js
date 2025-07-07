#!/usr/bin/env node

/**
 * OAuth認証設定ヘルパースクリプト
 * 
 * 使用方法:
 * node setup-auth.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupAuth() {
  console.log('\n🔐 freee会計 MCP Server OAuth認証設定\n');
  
  console.log('このスクリプトでは、OAuth認証に必要な環境変数を設定します。');
  console.log('freee開発者コンソール (https://developer.freee.co.jp/) でアプリケーションを作成済みであることを確認してください。\n');

  // 現在の.envファイルをチェック
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');
  
  let existingEnv = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        existingEnv[key.trim()] = value.trim();
      }
    });
    console.log('✓ 既存の.envファイルが見つかりました。');
  } else {
    console.log('ℹ️  .envファイルが見つかりません。新規作成します。');
  }

  // OAuth設定を取得
  const clientId = await question(`FREEE_CLIENT_ID (現在: ${existingEnv.FREEE_CLIENT_ID || '未設定'}): `);
  const clientSecret = await question(`FREEE_CLIENT_SECRET (現在: ${existingEnv.FREEE_CLIENT_SECRET || '未設定'}): `);
  const redirectUri = await question(`FREEE_REDIRECT_URI (現在: ${existingEnv.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'}): `);

  // デフォルト値を設定
  const finalClientId = clientId.trim() || existingEnv.FREEE_CLIENT_ID;
  const finalClientSecret = clientSecret.trim() || existingEnv.FREEE_CLIENT_SECRET;
  const finalRedirectUri = redirectUri.trim() || existingEnv.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

  if (!finalClientId || !finalClientSecret) {
    console.log('\n❌ FREEE_CLIENT_IDとFREEE_CLIENT_SECRETは必須です。');
    console.log('freee開発者コンソールでアプリケーションを作成し、OAuth認証情報を取得してください。');
    rl.close();
    return;
  }

  // .envファイルの内容を作成
  let envContent = '';
  
  if (fs.existsSync(envExamplePath)) {
    // .env.exampleをベースにする
    envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // OAuth設定を置換
    envContent = envContent.replace(/FREEE_CLIENT_ID=.*/, `FREEE_CLIENT_ID=${finalClientId}`);
    envContent = envContent.replace(/FREEE_CLIENT_SECRET=.*/, `FREEE_CLIENT_SECRET=${finalClientSecret}`);
    envContent = envContent.replace(/FREEE_REDIRECT_URI=.*/, `FREEE_REDIRECT_URI=${finalRedirectUri}`);
  } else {
    // 基本的な.envファイルを作成
    envContent = `# freee会計 MCP Server 環境変数設定
# 生成日時: ${new Date().toISOString()}

# OAuth認証設定
FREEE_CLIENT_ID=${finalClientId}
FREEE_CLIENT_SECRET=${finalClientSecret}
FREEE_REDIRECT_URI=${finalRedirectUri}

# API設定
FREEE_API_BASE_URL=https://api.freee.co.jp

# デバッグ設定
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development
`;
  }

  // .envファイルを書き込み
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ OAuth認証設定が完了しました！');
  console.log(`📁 設定ファイル: ${envPath}`);
  console.log('\n次のステップ:');
  console.log('1. npm run debug でMCP Serverを起動');
  console.log('2. generate-auth-url ツールでOAuth認証URLを生成');
  console.log('3. ブラウザで認証を完了');
  console.log('4. exchange-auth-code ツールで認証コードを設定');
  console.log('5. get-companies や get-deals ツールをテスト');
  
  rl.close();
}

setupAuth().catch(console.error);