#!/usr/bin/env node

/**
 * freee会計 MCP Server 新しいエントリーポイント
 * 
 * Phase 2 リファクタリング後の簡潔なエントリーポイント
 */

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
    console.error('Failed to start freee会計 MCP Server:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// メイン関数を実行
main().catch((error) => {
  console.error('Main function failed:', error);
  process.exit(1);
});
