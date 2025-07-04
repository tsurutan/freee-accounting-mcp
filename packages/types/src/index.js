/**
 * freee会計 MCP Server 型定義
 */
export class FreeeError extends Error {
    statusCode;
    errors;
    originalError;
    timestamp;
    requestId;
    retryable;
    constructor(message, statusCode, errors, originalError, requestId) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.originalError = originalError;
        this.name = 'FreeeError';
        this.timestamp = new Date().toISOString();
        this.requestId = requestId;
        this.retryable = this.isRetryable(statusCode);
        // スタックトレースを保持
        if (originalError && originalError.stack) {
            this.stack = originalError.stack;
        }
    }
    isRetryable(statusCode) {
        // リトライ可能なステータスコード
        return [429, 500, 502, 503, 504].includes(statusCode);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            errors: this.errors,
            timestamp: this.timestamp,
            requestId: this.requestId,
            retryable: this.retryable,
        };
    }
    static isFreeeError(error) {
        return error instanceof FreeeError;
    }
    static fromAxiosError(error, requestId) {
        if (error.response) {
            return new FreeeError(error.response.data?.message || error.message || 'API Error', error.response.status, error.response.data?.errors, error, requestId);
        }
        if (error.request) {
            return new FreeeError('Network Error: No response received', 0, undefined, error, requestId);
        }
        return new FreeeError(error.message || 'Unknown Error', 0, undefined, error, requestId);
    }
}
//# sourceMappingURL=index.js.map