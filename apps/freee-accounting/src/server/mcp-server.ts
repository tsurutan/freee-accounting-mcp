/**
 * freee会計 MCP Server メインクラス
 */

import { injectable, inject } from 'inversify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TYPES } from '../container/types.js';
import { Logger } from '../infrastructure/logger.js';
import { AppConfig } from '../config/app-config.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { RequestHandlers } from './request-handlers.js';
import { Middleware } from './middleware.js';

/**
 * MCP Server統合管理クラス
 */
@injectable()
export class MCPServer {
  private readonly server: Server;
  private readonly transport: StdioServerTransport;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger,
    @inject(TYPES.AppConfig) private readonly appConfig: AppConfig,
    @inject(TYPES.EnvironmentConfig) private readonly envConfig: EnvironmentConfig,
    @inject(TYPES.RequestHandlers) private readonly requestHandlers: RequestHandlers,
    @inject(TYPES.Middleware) private readonly middleware: Middleware
  ) {
    this.server = new Server({
      name: 'freee-accounting-mcp',
      version: '0.1.0',
    });

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  /**
   * リクエストハンドラーを設定
   */
  private setupHandlers(): void {
    // RequestHandlersクラスに委譲
    this.requestHandlers.setupHandlers(this.server);
  }

  /**
   * サーバーを開始
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting MCP Server', {
        serverName: 'freee-accounting-mcp',
        version: '0.1.0',
        authMode: this.envConfig.getSummary().authMode,
        companyId: this.appConfig.companyId,
      });

      await this.server.connect(this.transport);

      this.logger.info('MCP Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start MCP Server', { error });
      throw error;
    }
  }

  /**
   * サーバーを停止
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping MCP Server');
      await this.server.close();
      this.logger.info('MCP Server stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop MCP Server', { error });
      throw error;
    }
  }
}
