#!/usr/bin/env node

/**
 * freee会計 MCP Server エントリーポイント
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'freee-accounting-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// リソース一覧の取得
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'companies://list',
        name: '事業所一覧',
        description: '利用可能な事業所の一覧を取得します',
        mimeType: 'application/json',
      },
    ],
  };
});

// リソースの読み取り
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'companies://list') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            message: 'freee会計 MCP Server が正常に動作しています',
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ツール一覧の取得
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test-connection',
        description: 'freee API への接続をテストします',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'test-connection') {
    return {
      content: [
        {
          type: 'text',
          text: 'freee会計 MCP Server への接続テストが成功しました。',
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// プロンプト一覧の取得
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'setup-guide',
        description: 'freee会計 MCP Server のセットアップガイド',
      },
    ],
  };
});

// プロンプトの取得
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'setup-guide') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'freee会計 MCP Server のセットアップ方法を教えてください。',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `freee会計 MCP Server のセットアップ手順：

1. 環境変数の設定
   - FREEE_CLIENT_ID: freeeアプリのクライアントID
   - FREEE_CLIENT_SECRET: freeeアプリのクライアントシークレット
   - FREEE_REDIRECT_URI: リダイレクトURI

2. OAuth認証の実行
   - 認証URLにアクセスして認証コードを取得
   - 認証コードを使用してアクセストークンを取得

3. MCP Serverの起動
   - 設定完了後、MCP Serverが利用可能になります

詳細は README.md をご確認ください。`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('freee会計 MCP Server が起動しました');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
