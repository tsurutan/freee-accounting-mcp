#!/usr/bin/env node

/**
 * freee会計 MCP Server 新しいエントリーポイント
 * 
 * Phase 2 リファクタリング後の簡潔なエントリーポイント
 */

import 'reflect-metadata';
import { container } from './container/container.js';
import { MCPServer } from './server/mcp-server.js';
import { Logger } from './infrastructure/logger.js';
import { EnvironmentConfig } from './config/environment-config.js';

/**
 * メイン関数
 */
async function main(): Promise<void> {
  try {
    // DIコンテナから必要なサービスを取得
    const logger = container.get<Logger>('Logger');
    const envConfig = container.get<EnvironmentConfig>('EnvironmentConfig');
    const mcpServer = container.get<MCPServer>(MCPServer);

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
      hasAccessToken: envSummary.hasAccessToken,
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
