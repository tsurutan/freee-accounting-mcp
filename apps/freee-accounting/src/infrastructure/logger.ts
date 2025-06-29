/**
 * 改善されたログシステム（Winston使用）
 */

import { injectable } from 'inversify';
import winston from 'winston';

/**
 * ログレベルの定義
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * ログエントリの型定義
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  service?: string;
  operation?: string;
  duration?: number;
  userId?: string;
  requestId?: string;
}

/**
 * ログ設定の型定義
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filename?: string;
  maxFiles?: number;
  maxSize?: string;
  enableMCPInspector: boolean;
}

/**
 * 改善されたLoggerクラス
 */
@injectable()
export class Logger {
  private winston: winston.Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private config: LoggerConfig;

  constructor() {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      enableConsole: process.env.LOG_CONSOLE !== 'false',
      enableFile: process.env.LOG_FILE === 'true',
      filename: process.env.LOG_FILENAME || 'freee-mcp.log',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
      maxSize: process.env.LOG_MAX_SIZE || '10m',
      enableMCPInspector: process.env.MCP_INSPECTOR === 'true',
    };

    this.winston = this.createWinstonLogger();
  }

  /**
   * Winstonロガーを作成
   */
  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // コンソール出力（MCP Inspector使用時は無効化）
    if (this.config.enableConsole && !this.config.enableMCPInspector) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          ),
        })
      );
    }

    // ファイル出力
    if (this.config.enableFile) {
      transports.push(
        new winston.transports.File({
          filename: this.config.filename,
          maxFiles: this.config.maxFiles,
          maxsize: this.parseSize(this.config.maxSize || '10m'),
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
      // エラー時の例外処理
      exceptionHandlers: this.config.enableFile ? [
        new winston.transports.File({ filename: 'exceptions.log' })
      ] : [],
      rejectionHandlers: this.config.enableFile ? [
        new winston.transports.File({ filename: 'rejections.log' })
      ] : [],
    });
  }

  /**
   * サイズ文字列をバイト数に変換
   */
  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 10 * 1024 * 1024; // デフォルト10MB

    const size = parseInt(match[1]!);
    const unit = match[2]?.toLowerCase() || '';

    switch (unit) {
      case 'k': return size * 1024;
      case 'm': return size * 1024 * 1024;
      case 'g': return size * 1024 * 1024 * 1024;
      default: return size;
    }
  }

  /**
   * ログエントリを内部配列に保存
   */
  private saveLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 最大ログ数を超えた場合、古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * エラーログ
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    this.winston.error(message, { ...context, error: error?.stack });
    this.saveLogEntry(entry);
  }

  /**
   * 警告ログ
   */
  warn(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.winston.warn(message, context);
    this.saveLogEntry(entry);
  }

  /**
   * 情報ログ
   */
  info(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.winston.info(message, context);
    this.saveLogEntry(entry);
  }

  /**
   * デバッグログ
   */
  debug(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.winston.debug(message, context);
    this.saveLogEntry(entry);
  }

  /**
   * 操作ログ（実行時間付き）
   */
  operation(
    operation: string,
    duration: number,
    context?: Record<string, any>,
    level: LogLevel = LogLevel.INFO
  ): void {
    const entry: LogEntry = {
      level,
      message: `Operation completed: ${operation}`,
      timestamp: new Date().toISOString(),
      context,
      operation,
      duration,
    };

    this.winston.log(level, entry.message, { 
      ...context, 
      operation, 
      duration: `${duration}ms` 
    });
    this.saveLogEntry(entry);
  }

  /**
   * APIリクエストログ
   */
  apiRequest(
    method: string,
    url: string,
    status: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const entry: LogEntry = {
      level,
      message: `API Request: ${method} ${url} - ${status}`,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        method,
        url,
        status,
        duration,
      },
      operation: 'api_request',
      duration,
    };

    this.winston.log(level, entry.message, entry.context);
    this.saveLogEntry(entry);
  }

  /**
   * 認証ログ
   */
  auth(message: string, userId?: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message: `Auth: ${message}`,
      timestamp: new Date().toISOString(),
      context,
      userId,
      operation: 'authentication',
    };

    this.winston.info(entry.message, { ...context, userId });
    this.saveLogEntry(entry);
  }

  /**
   * 保存されたログを取得
   */
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      const levelPriority = {
        [LogLevel.ERROR]: 3,
        [LogLevel.WARN]: 2,
        [LogLevel.INFO]: 1,
        [LogLevel.DEBUG]: 0,
      };

      const minPriority = levelPriority[level];
      filteredLogs = this.logs.filter(log => 
        levelPriority[log.level] >= minPriority
      );
    }

    if (limit) {
      return filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  /**
   * ログレベルを取得
   */
  getLogLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * ログレベルを設定
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.winston.level = level;
  }

  /**
   * ログをクリア
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * ログ統計を取得
   */
  getLogStats(): Record<LogLevel, number> {
    const stats = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.DEBUG]: 0,
    };

    for (const log of this.logs) {
      stats[log.level]++;
    }

    return stats;
  }

  /**
   * 設定を取得
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}
