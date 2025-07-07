/**
 * MCP Framework Logger for shared package
 */

import { logger as mcpLogger } from 'mcp-framework';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    this.logs.push(logEntry);

    // ログの上限を超えた場合は古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // MCP Framework logger に出力
    this.outputToMCPLogger(logEntry);
  }

  private outputToMCPLogger(logEntry: LogEntry): void {
    const { message, context, error } = logEntry;
    
    const logMessage = context || error 
      ? `${message} ${JSON.stringify({ ...context, error: error?.stack })}`
      : message;
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        mcpLogger.debug(logMessage);
        break;
      case LogLevel.INFO:
        mcpLogger.info(logMessage);
        break;
      case LogLevel.WARN:
        mcpLogger.warn(logMessage);
        break;
      case LogLevel.ERROR:
        mcpLogger.error(logMessage);
        break;
    }
  }

  debug(message: string, context?: any): void {
    this.addLog(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.addLog(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.addLog(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any, error?: Error): void {
    this.addLog(LogLevel.ERROR, message, context, error);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance();