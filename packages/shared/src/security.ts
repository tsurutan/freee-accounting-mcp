/**
 * セキュリティ機能
 */

import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';

export interface EncryptionConfig {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
}

export class TokenEncryption {
  private algorithm: string;
  private keyLength: number;
  private ivLength: number;
  private key: Buffer;

  constructor(config: EncryptionConfig = {}) {
    this.algorithm = config.algorithm || 'aes-256-gcm';
    this.keyLength = config.keyLength || 32;
    this.ivLength = config.ivLength || 16;

    // マシン固有のキーを生成
    this.key = this.generateMachineKey();
  }

  private generateMachineKey(): Buffer {
    // マシン固有の情報を使用してキーを生成
    const machineInfo = [
      os.hostname(),
      os.platform(),
      os.arch(),
      process.env.USER || process.env.USERNAME || 'default',
    ].join('|');

    // 固定のソルトと組み合わせてキーを生成
    const salt = 'freee-mcp-server-salt-2024';
    return crypto.pbkdf2Sync(machineInfo, salt, 100000, this.keyLength, 'sha256');
  }

  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.key);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // IVと暗号化データを結合
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0] || '', 'hex');
      const encrypted = parts[1] || '';

      const decipher = crypto.createDecipher(this.algorithm, this.key);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isEncrypted(data: string): boolean {
    // 暗号化されたデータの形式をチェック
    return data.includes(':') && data.split(':').length === 2;
  }
}

export class SecurityHeaders {
  static getSecureHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
    };
  }

  static sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // ヘッダー名と値をサニタイズ
      const sanitizedKey = key.replace(/[^\w-]/g, '');
      const sanitizedValue = String(value).replace(/[\r\n]/g, '');

      if (sanitizedKey && sanitizedValue) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }

    return sanitized;
  }
}

export class InputValidator {
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static sanitizeString(input: string, maxLength: number = 1000): string {
    return input
      .replace(/[<>]/g, '') // HTMLタグを除去
      .replace(/javascript:/gi, '') // JavaScriptプロトコルを除去
      .substring(0, maxLength)
      .trim();
  }

  static validateCompanyId(companyId: any): number {
    const id = Number(companyId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid company ID');
    }
    return id;
  }

  static validateDateString(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return dateString;
  }
}

export class RateLimitValidator {
  private static requests = new Map<string, number[]>();
  private static readonly WINDOW_SIZE = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS = 100; // per minute

  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE;

    // 現在のリクエスト履歴を取得
    const requests = this.requests.get(identifier) || [];

    // ウィンドウ外のリクエストを削除
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    // レート制限チェック
    if (validRequests.length >= this.MAX_REQUESTS) {
      return false;
    }

    // 新しいリクエストを記録
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  static getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE;

    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    return Math.max(0, this.MAX_REQUESTS - validRequests.length);
  }
}

// セキュリティユーティリティのシングルトンインスタンス
export const tokenEncryption = new TokenEncryption();

export interface SecurityAuditLog {
  timestamp: string;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  userAgent?: string;
  ip?: string;
}

export class SecurityAuditor {
  private static logs: SecurityAuditLog[] = [];
  private static readonly MAX_LOGS = 1000;

  static log(event: string, severity: SecurityAuditLog['severity'], details: any): void {
    const logEntry: SecurityAuditLog = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
    };

    this.logs.push(logEntry);

    // ログサイズ制限
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // 重要度が高い場合はコンソールにも出力
    if (severity === 'high' || severity === 'critical') {
      console.warn(`[SECURITY ${severity.toUpperCase()}] ${event}`, details);
    }
  }

  static getLogs(severity?: SecurityAuditLog['severity']): SecurityAuditLog[] {
    if (severity) {
      return this.logs.filter(log => log.severity === severity);
    }
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static getLogsSummary(): {
    total: number;
    bySeverity: Record<SecurityAuditLog['severity'], number>;
    recent: SecurityAuditLog[];
  } {
    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    this.logs.forEach(log => {
      bySeverity[log.severity]++;
    });

    return {
      total: this.logs.length,
      bySeverity,
      recent: this.logs.slice(-10),
    };
  }
}
