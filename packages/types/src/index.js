/**
 * freee会計 MCP Server 型定義
 */
export class FreeeError extends Error {
    statusCode;
    errors;
    constructor(message, statusCode, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = 'FreeeError';
    }
}
//# sourceMappingURL=index.js.map