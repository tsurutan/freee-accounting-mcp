/**
 * セキュリティ機能
 */
export interface EncryptionConfig {
    algorithm?: string;
    keyLength?: number;
    ivLength?: number;
}
export declare class TokenEncryption {
    private algorithm;
    private keyLength;
    private ivLength;
    private key;
    constructor(config?: EncryptionConfig);
    private generateMachineKey;
    encrypt(data: string): string;
    decrypt(encryptedData: string): string;
    isEncrypted(data: string): boolean;
}
export declare class SecurityHeaders {
    static getSecureHeaders(): Record<string, string>;
    static sanitizeHeaders(headers: Record<string, any>): Record<string, string>;
}
export declare class InputValidator {
    static validateUrl(url: string): boolean;
    static validateEmail(email: string): boolean;
    static sanitizeString(input: string, maxLength?: number): string;
    static validateCompanyId(companyId: any): number;
    static validateDateString(dateString: string): string;
}
export declare class RateLimitValidator {
    private static requests;
    private static readonly WINDOW_SIZE;
    private static readonly MAX_REQUESTS;
    static checkRateLimit(identifier: string): boolean;
    static getRemainingRequests(identifier: string): number;
}
export declare const tokenEncryption: TokenEncryption;
export interface SecurityAuditLog {
    timestamp: string;
    event: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    userAgent?: string;
    ip?: string;
}
export declare class SecurityAuditor {
    private static logs;
    private static readonly MAX_LOGS;
    static log(event: string, severity: SecurityAuditLog['severity'], details: any): void;
    static getLogs(severity?: SecurityAuditLog['severity']): SecurityAuditLog[];
    static clearLogs(): void;
    static getLogsSummary(): {
        total: number;
        bySeverity: Record<SecurityAuditLog['severity'], number>;
        recent: SecurityAuditLog[];
    };
}
//# sourceMappingURL=security.d.ts.map