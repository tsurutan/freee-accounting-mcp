/**
 * ログ設定の統合管理
 */

import { injectable } from 'inversify';
import { Logger, LogLevel, LoggerConfig } from './logger.js';

/**
 * ログプロファイル設定
 */
export interface LogProfile {
  name: string;
  description: string;
  config: LoggerConfig;
}

/**
 * ログ設定管理
 */
@injectable()
export class LoggerSetup {
  private logger: Logger;
  private readonly profiles: Map<string, LogProfile>;

  constructor() {
    this.profiles = new Map();
    this.initializeProfiles();
    this.logger = new Logger();
  }

  /**
   * 事前定義されたプロファイルを初期化
   */
  private initializeProfiles(): void {
    // 開発環境用プロファイル
    this.profiles.set('development', {
      name: 'development',
      description: 'Development environment with verbose logging',
      config: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: false,
        enableMCPInspector: false,
      },
    });

    // 本番環境用プロファイル
    this.profiles.set('production', {
      name: 'production',
      description: 'Production environment with minimal logging',
      config: {
        level: LogLevel.WARN,
        enableConsole: false,
        enableFile: true,
        filename: 'freee-mcp-production.log',
        maxFiles: 10,
        maxSize: '50m',
        enableMCPInspector: false,
      },
    });

    // テスト環境用プロファイル
    this.profiles.set('test', {
      name: 'test',
      description: 'Test environment with structured logging',
      config: {
        level: LogLevel.INFO,
        enableConsole: false,
        enableFile: true,
        filename: 'freee-mcp-test.log',
        maxFiles: 3,
        maxSize: '10m',
        enableMCPInspector: false,
      },
    });

    // MCP Inspector用プロファイル
    this.profiles.set('mcp-inspector', {
      name: 'mcp-inspector',
      description: 'MCP Inspector debugging environment',
      config: {
        level: LogLevel.DEBUG,
        enableConsole: false,
        enableFile: true,
        filename: 'freee-mcp-debug.log',
        maxFiles: 5,
        maxSize: '20m',
        enableMCPInspector: true,
      },
    });

    // デバッグ用プロファイル
    this.profiles.set('debug', {
      name: 'debug',
      description: 'Debug environment with maximum verbosity',
      config: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: true,
        filename: 'freee-mcp-debug.log',
        maxFiles: 5,
        maxSize: '20m',
        enableMCPInspector: false,
      },
    });

    // 静寂モード（最小限のログ）
    this.profiles.set('silent', {
      name: 'silent',
      description: 'Silent mode with error logging only',
      config: {
        level: LogLevel.ERROR,
        enableConsole: false,
        enableFile: true,
        filename: 'freee-mcp-errors.log',
        maxFiles: 3,
        maxSize: '10m',
        enableMCPInspector: false,
      },
    });
  }

  /**
   * 環境変数からログ設定を自動検出
   */
  autoDetectProfile(): string {
    // 明示的にプロファイルが指定されている場合
    const explicitProfile = process.env.LOG_PROFILE;
    if (explicitProfile && this.profiles.has(explicitProfile)) {
      return explicitProfile;
    }

    // MCP Inspector使用時
    if (process.env.MCP_INSPECTOR === 'true') {
      return 'mcp-inspector';
    }

    // NODE_ENV による自動判定
    const nodeEnv = process.env.NODE_ENV;
    switch (nodeEnv) {
      case 'production':
        return 'production';
      case 'test':
        return 'test';
      case 'development':
        return 'development';
      default:
        // デバッグフラグが設定されている場合
        if (process.env.DEBUG_FREEE_API === 'true' || process.env.DEBUG_AXIOS === 'true') {
          return 'debug';
        }
        return 'development';
    }
  }

  /**
   * プロファイルを適用してLoggerを設定
   */
  setupLogger(profileName?: string): Logger {
    const profile = profileName || this.autoDetectProfile();
    const logProfile = this.profiles.get(profile);

    if (!logProfile) {
      console.warn(`Unknown log profile: ${profile}, using development profile`);
      return this.setupLogger('development');
    }

    // 新しいLoggerインスタンスを作成
    this.logger = new Logger();

    console.info(`[LoggerSetup] Applied log profile: ${logProfile.name} - ${logProfile.description}`);
    
    return this.logger;
  }

  /**
   * カスタム設定でLoggerを設定
   */
  setupCustomLogger(config: Partial<LoggerConfig>): Logger {
    // デフォルト設定をベースにカスタム設定を適用
    const baseProfile = this.profiles.get('development')!;
    const customConfig = { ...baseProfile.config, ...config };

    this.logger = new Logger();
    
    console.info('[LoggerSetup] Applied custom log configuration', customConfig);
    
    return this.logger;
  }

  /**
   * 利用可能なプロファイル一覧を取得
   */
  getAvailableProfiles(): LogProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 特定のプロファイルを取得
   */
  getProfile(name: string): LogProfile | undefined {
    return this.profiles.get(name);
  }

  /**
   * カスタムプロファイルを追加
   */
  addProfile(profile: LogProfile): void {
    this.profiles.set(profile.name, profile);
    console.info(`[LoggerSetup] Added custom log profile: ${profile.name}`);
  }

  /**
   * プロファイルを削除
   */
  removeProfile(name: string): boolean {
    if (['development', 'production', 'test'].includes(name)) {
      console.warn(`[LoggerSetup] Cannot remove built-in profile: ${name}`);
      return false;
    }

    const removed = this.profiles.delete(name);
    if (removed) {
      console.info(`[LoggerSetup] Removed log profile: ${name}`);
    }
    return removed;
  }

  /**
   * 現在のLogger設定を取得
   */
  getCurrentConfig(): LoggerConfig | undefined {
    return this.logger?.getConfig();
  }

  /**
   * ログレベルを動的に変更
   */
  setLogLevel(level: LogLevel): void {
    if (this.logger) {
      this.logger.setLogLevel(level);
      console.info(`[LoggerSetup] Log level changed to: ${level}`);
    }
  }

  /**
   * 設定の妥当性をチェック
   */
  validateConfig(config: LoggerConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // ログレベルの妥当性チェック
    if (!Object.values(LogLevel).includes(config.level)) {
      errors.push(`Invalid log level: ${config.level}`);
    }

    // ファイル出力設定のチェック
    if (config.enableFile) {
      if (!config.filename) {
        errors.push('Filename is required when file logging is enabled');
      }
      
      if (config.maxFiles && config.maxFiles < 1) {
        errors.push('maxFiles must be greater than 0');
      }
      
      if (config.maxSize && !config.maxSize.match(/^\d+[kmg]?$/i)) {
        errors.push('Invalid maxSize format (expected: number with optional k/m/g suffix)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 環境変数からの設定オーバーライド
   */
  getEnvironmentOverrides(): Partial<LoggerConfig> {
    const overrides: Partial<LoggerConfig> = {};

    if (process.env.LOG_LEVEL) {
      overrides.level = process.env.LOG_LEVEL as LogLevel;
    }

    if (process.env.LOG_CONSOLE !== undefined) {
      overrides.enableConsole = process.env.LOG_CONSOLE !== 'false';
    }

    if (process.env.LOG_FILE !== undefined) {
      overrides.enableFile = process.env.LOG_FILE === 'true';
    }

    if (process.env.LOG_FILENAME) {
      overrides.filename = process.env.LOG_FILENAME;
    }

    if (process.env.LOG_MAX_FILES) {
      overrides.maxFiles = parseInt(process.env.LOG_MAX_FILES);
    }

    if (process.env.LOG_MAX_SIZE) {
      overrides.maxSize = process.env.LOG_MAX_SIZE;
    }

    if (process.env.MCP_INSPECTOR !== undefined) {
      overrides.enableMCPInspector = process.env.MCP_INSPECTOR === 'true';
    }

    return overrides;
  }

  /**
   * 設定の診断情報を取得
   */
  getDiagnostics(): Record<string, any> {
    const currentConfig = this.getCurrentConfig();
    const environmentOverrides = this.getEnvironmentOverrides();
    const autoDetectedProfile = this.autoDetectProfile();

    return {
      currentConfig,
      environmentOverrides,
      autoDetectedProfile,
      availableProfiles: this.getAvailableProfiles().map(p => ({
        name: p.name,
        description: p.description,
      })),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        LOG_PROFILE: process.env.LOG_PROFILE,
        MCP_INSPECTOR: process.env.MCP_INSPECTOR,
        DEBUG_FREEE_API: process.env.DEBUG_FREEE_API,
        DEBUG_AXIOS: process.env.DEBUG_AXIOS,
      },
    };
  }

  /**
   * 設定されたLoggerインスタンスを取得
   */
  getLogger(): Logger {
    if (!this.logger) {
      this.logger = this.setupLogger();
    }
    return this.logger;
  }
}
