/**
 * MCP Framework Logger implementation
 */

import { injectable } from 'inversify';
import { logger } from 'mcp-framework';

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
 * MCP Framework Logger wrapper
 */
@injectable()
export class Logger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private readonly config: LoggerConfig;

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

    const logMessage = context || error 
      ? `${message} ${JSON.stringify({ ...context, error: error?.stack })}`
      : message;
    logger.error(logMessage);
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

    const logMessage = context 
      ? `${message} ${JSON.stringify(context)}`
      : message;
    logger.warn(logMessage);
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

    const logMessage = context 
      ? `${message} ${JSON.stringify(context)}`
      : message;
    logger.info(logMessage);
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

    const logMessage = context 
      ? `${message} ${JSON.stringify(context)}`
      : message;
    logger.debug(logMessage);
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

    const logMessage = `${entry.message} (${duration}ms)`;
    const logContext = { 
      ...context, 
      operation, 
      duration: `${duration}ms` 
    };

    const finalMessage = `${logMessage} ${JSON.stringify(logContext)}`;
    
    switch (level) {
      case LogLevel.ERROR:
        logger.error(finalMessage);
        break;
      case LogLevel.WARN:
        logger.warn(finalMessage);
        break;
      case LogLevel.INFO:
        logger.info(finalMessage);
        break;
      case LogLevel.DEBUG:
        logger.debug(finalMessage);
        break;
    }
    
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

    const logMessage = `${entry.message} ${JSON.stringify(entry.context)}`;
    
    if (level === LogLevel.ERROR) {
      logger.error(logMessage);
    } else {
      logger.info(logMessage);
    }
    
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

    const logMessage = `${entry.message} ${JSON.stringify({ ...context, userId })}`;
    logger.info(logMessage);
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