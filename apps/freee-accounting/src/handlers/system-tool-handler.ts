/**
 * システム関連ツールハンドラー
 */

import { injectable, inject } from 'inversify';
import { Result, ok, err } from 'neverthrow';
import { TYPES } from '../container/types.js';
import { BaseToolHandler, ToolInfo } from './base-tool-handler.js';
import { AppError } from '../utils/error-handler.js';
import { AppConfig } from '../config/app-config.js';
import { EnvironmentConfig } from '../config/environment-config.js';
import { Logger } from '../infrastructure/logger.js';
import { MCPToolResponse } from '../utils/response-builder.js';

/**
 * システム関連ツールハンドラー
 */
@injectable()
export class SystemToolHandler extends BaseToolHandler {
  constructor(
    @inject(TYPES.AuthService) authService: any,
    @inject(TYPES.ResponseBuilder) responseBuilder: any,
    @inject(TYPES.ErrorHandler) errorHandler: any,
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.Validator) validator: any,
    @inject(TYPES.AppConfig) private appConfig: AppConfig,
    @inject(TYPES.EnvironmentConfig) private envConfig: EnvironmentConfig
  ) {
    super(authService, responseBuilder, errorHandler, logger, validator);
  }

  /**
   * 認証が必要なツールかどうかを判定
   */
  protected requiresAuthentication(toolName: string): boolean {
    // システム関連ツールは認証不要
    const noAuthTools = ['health-check', 'get-system-info', 'get-logs', 'get-metrics'];
    return !noAuthTools.includes(toolName);
  }

  /**
   * 処理可能なツール情報を返す
   */
  getToolInfo(): ToolInfo[] {
    return [
      {
        name: 'health-check',
        description: 'システムのヘルスチェックを実行します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-system-info',
        description: 'システム情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-logs',
        description: 'システムログを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'debug'],
              description: 'ログレベル（オプション）',
            },
            limit: {
              type: 'number',
              description: '取得件数（デフォルト: 50）',
            },
          },
        },
      },
      {
        name: 'get-metrics',
        description: 'システムメトリクスを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['performance', 'usage', 'errors'],
              description: 'メトリクスタイプ（オプション）',
            },
          },
        },
      },
      {
        name: 'clear-logs',
        description: 'システムログをクリアします',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set-log-level',
        description: 'ログレベルを設定します',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'debug'],
              description: '設定するログレベル',
            },
          },
          required: ['level'],
        },
      },
    ];
  }

  /**
   * ハンドラーの名前を取得
   */
  getName(): string {
    return 'SystemToolHandler';
  }

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string {
    return 'システム管理とモニタリング機能を提供するツールハンドラー';
  }

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean {
    const supportedTools = [
      'health-check',
      'get-system-info',
      'get-logs',
      'get-metrics',
      'clear-logs',
      'set-log-level'
    ];
    return supportedTools.includes(name);
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<Result<MCPToolResponse, AppError>> {
    switch (name) {
      case 'health-check':
        return this.healthCheck();

      case 'get-system-info':
        return this.getSystemInfo();

      case 'get-logs':
        return this.getLogs(args);

      case 'get-metrics':
        return this.getMetrics(args);

      case 'clear-logs':
        return this.clearLogs();

      case 'set-log-level':
        return this.setLogLevel(args);

      default:
        return err(this.errorHandler.apiError(`Unknown tool: ${name}`, 404));
    }
  }

  /**
   * ヘルスチェックを実行
   */
  private async healthCheck(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Performing health check');

      const results: Record<string, boolean> = {};

      // 環境変数設定チェック
      const envValidation = this.envConfig.validate();
      results['環境変数設定'] = envValidation.isOk();

      // 認証設定チェック
      const authResult = this.authService.checkAuthenticationStatus();
      results['認証設定'] = authResult.isOk();

      // ログシステムチェック
      try {
        this.logger.debug('Health check test log');
        results['ログシステム'] = true;
      } catch {
        results['ログシステム'] = false;
      }

      // DIコンテナチェック
      try {
        const testConfig = this.appConfig.getAll();
        results['DIコンテナ'] = !!testConfig;
      } catch {
        results['DIコンテナ'] = false;
      }

      const message = this.responseBuilder.formatHealthCheckResponse(results);

      this.logger.info('Health check completed', { results });

      return this.createSuccessResult(results, message);
    }, 'healthCheck');
  }

  /**
   * システム情報を取得
   */
  private async getSystemInfo(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting system info');

      const envSummary = this.envConfig.getSummary();
      const appConfigData = this.appConfig.getAll();
      const logConfig = this.logger.getConfig();

      const systemInfo = {
        version: '0.1.0',
        name: 'freee-accounting-mcp',
        environment: envSummary,
        appConfig: appConfigData,
        logConfig,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      };

      this.logger.info('System info retrieved successfully');

      return this.createSuccessResult(
        systemInfo,
        `システム情報:\n\n${JSON.stringify(systemInfo, null, 2)}`
      );
    }, 'getSystemInfo');
  }

  /**
   * ログを取得
   */
  private async getLogs(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting logs', { args });

      const levelString = args.level as 'error' | 'warn' | 'info' | 'debug' | undefined;
      const level = levelString ? (levelString as any) : undefined;
      const limit = args.limit || 50;

      const logs = this.logger.getLogs(level, limit);
      const logStats = this.logger.getLogStats();

      this.logger.info('Logs retrieved successfully', {
        level,
        limit,
        retrievedCount: logs.length
      });

      return this.createSuccessResult(
        { logs, stats: logStats },
        `ログを取得しました。\n取得件数: ${logs.length}件\nレベル: ${level || '全て'}\n\nログ統計:\n${JSON.stringify(logStats, null, 2)}`
      );
    }, 'getLogs');
  }

  /**
   * メトリクスを取得
   */
  private async getMetrics(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Getting metrics', { args });

      const type = args.type;
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const metricsData = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        logs: this.logger.getLogStats(),
      };

      const message = this.responseBuilder.formatMetricsResponse(metricsData, type);

      this.logger.info('Metrics retrieved successfully', { type });

      return this.createSuccessResult(metricsData, message);
    }, 'getMetrics');
  }

  /**
   * ログをクリア
   */
  private async clearLogs(): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Clearing logs');

      this.logger.clearLogs();

      this.logger.info('Logs cleared successfully');

      return this.createSuccessResult(
        { cleared: true },
        'システムログをクリアしました。'
      );
    }, 'clearLogs');
  }

  /**
   * ログレベルを設定
   */
  private async setLogLevel(args: any): Promise<Result<MCPToolResponse, AppError>> {
    return this.executeWithErrorHandling(async () => {
      this.logger.info('Setting log level', { level: args.level });

      // 引数の検証
      const validationResult = this.validateRequiredFields(args, ['level']);
      if (validationResult.isErr()) {
        return this.createErrorResult(validationResult.error);
      }

      const levelString = args.level as 'error' | 'warn' | 'info' | 'debug';
      const level = levelString as any;
      const oldLevel = this.logger.getLogLevel();

      this.logger.setLogLevel(level);

      this.logger.info('Log level changed successfully', {
        oldLevel,
        newLevel: level
      });

      return this.createSuccessResult(
        { oldLevel, newLevel: level },
        `ログレベルを変更しました。\n変更前: ${oldLevel}\n変更後: ${level}`
      );
    }, 'setLogLevel');
  }
}
