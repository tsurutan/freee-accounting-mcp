/**
 * ログ機能
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
    error?: Error;
}
export declare class Logger {
    private static instance;
    private logLevel;
    private logs;
    private maxLogs;
    private constructor();
    static getInstance(): Logger;
    private getLogLevelFromEnv;
    private shouldLog;
    private addLog;
    private outputToConsole;
    debug(message: string, context?: any): void;
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, context?: any, error?: Error): void;
    getLogs(level?: LogLevel): LogEntry[];
    clearLogs(): void;
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map