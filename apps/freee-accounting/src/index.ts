#!/usr/bin/env node

/**
 * freee会計 MCP Server 新しいエントリーポイント
 * 
 * Phase 2 リファクタリング後の簡潔なエントリーポイント
 */

// Load .env file if it exists (before any other imports)
import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { logger as mcpLogger } from 'mcp-framework';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const result = dotenvConfig({ path: envPath });
  if (result.error) {
    mcpLogger.warn(`Warning: Failed to load .env file: ${result.error.message}`);
  }
}

import 'reflect-metadata';
import { serviceContainer } from './container/service-container.js';
import { TYPES } from './container/types.js';
import { MCPServer } from './server/mcp-server.js';
import { Logger } from './infrastructure/logger.js';
import { EnvironmentConfig } from './config/environment-config.js';

/**
 * メイン関数
 */
async function main(): Promise<void> {
  try {
    // DIコンテナから必要なサービスを取得
    const logger = serviceContainer.get<Logger>(TYPES.Logger);
    const envConfig = serviceContainer.get<EnvironmentConfig>(TYPES.EnvironmentConfig);
    const mcpServer = serviceContainer.get<MCPServer>(TYPES.MCPServer);

    // 環境変数の検証
    const validation = envConfig.validate();
    if (validation.isErr()) {
      logger.warn('Environment validation warning', { 
        error: validation.error.message 
      });
    }

    // 設定情報をログ出力
    const envSummary = envConfig.getSummary();
    logger.info('freee会計 MCP Server starting', {
      authMode: envSummary.authMode,
      hasClientId: envSummary.hasClientId,
      baseUrl: envSummary.baseUrl,
      debug: envSummary.debug,
    });

    // MCPサーバーを開始
    await mcpServer.start();

    // プロセス終了時のクリーンアップ
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      await mcpServer.stop();
      process.exit(0);
    });

  } catch (error) {
    mcpLogger.error(`Failed to start freee会計 MCP Server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  mcpLogger.error(`Unhandled Rejection at promise: ${promise} reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  mcpLogger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// メイン関数を実行
main().catch((error) => {
  mcpLogger.error(`Main function failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
