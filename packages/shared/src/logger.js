/**
 * ログ機能
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    static instance;
    logLevel;
    logs = [];
    maxLogs = 1000;
    constructor() {
        this.logLevel = this.getLogLevelFromEnv();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    getLogLevelFromEnv() {
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
    shouldLog(level) {
        return level >= this.logLevel;
    }
    addLog(level, message, context, error) {
        if (!this.shouldLog(level))
            return;
        const logEntry = {
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
        // コンソールにも出力
        this.outputToConsole(logEntry);
    }
    outputToConsole(logEntry) {
        const { timestamp, level, message, context, error } = logEntry;
        const levelName = LogLevel[level];
        const prefix = `[${timestamp}] [${levelName}]`;
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, message, context || '');
                break;
            case LogLevel.INFO:
                console.info(prefix, message, context || '');
                break;
            case LogLevel.WARN:
                console.warn(prefix, message, context || '');
                break;
            case LogLevel.ERROR:
                console.error(prefix, message, context || '', error || '');
                break;
        }
    }
    debug(message, context) {
        this.addLog(LogLevel.DEBUG, message, context);
    }
    info(message, context) {
        this.addLog(LogLevel.INFO, message, context);
    }
    warn(message, context) {
        this.addLog(LogLevel.WARN, message, context);
    }
    error(message, context, error) {
        this.addLog(LogLevel.ERROR, message, context, error);
    }
    getLogs(level) {
        if (level !== undefined) {
            return this.logs.filter(log => log.level >= level);
        }
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    getLogLevel() {
        return this.logLevel;
    }
}
// シングルトンインスタンスをエクスポート
export const logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map