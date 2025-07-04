/**
 * ツールハンドラーインターフェース
 * 
 * MCPツールハンドラーの統一インターフェース定義
 */

import { Result } from 'neverthrow';

// インターフェースレジストリ（実行時にアクセス可能）
export const TOOL_HANDLER_INTERFACES = {
  IToolHandler: 'IToolHandler',
  IAdvancedToolHandler: 'IAdvancedToolHandler',
  IToolRegistry: 'IToolRegistry',
  IToolMiddleware: 'IToolMiddleware',
  IToolValidator: 'IToolValidator',
  IToolMetrics: 'IToolMetrics',
  IToolProvider: 'IToolProvider',
  IToolFactory: 'IToolFactory',
} as const;
import { MCPToolInfo, MCPToolResponse } from '../types/mcp.js';
import { AppError } from '../utils/error-handler.js';

/**
 * ツールハンドラーの基本インターフェース
 */
export interface IToolHandler {
  /**
   * ハンドラーが提供するツール情報を取得
   */
  getToolInfo(): MCPToolInfo[];

  /**
   * 指定されたツールを実行
   */
  executeTool(name: string, args?: Record<string, any>): Promise<Result<MCPToolResponse, AppError>>;

  /**
   * 指定されたツールをサポートするかチェック
   */
  supportsTool(name: string): boolean;

  /**
   * ハンドラーの名前を取得
   */
  getName(): string;

  /**
   * ハンドラーの説明を取得
   */
  getDescription(): string;
}

/**
 * ツールハンドラーの拡張インターフェース
 */
export interface IAdvancedToolHandler extends IToolHandler {
  /**
   * ツールの実行前バリデーション
   */
  validateArguments?(name: string, args?: Record<string, any>): Result<void, AppError>;

  /**
   * ツールの実行前処理
   */
  beforeExecution?(name: string, args?: Record<string, any>): Promise<Record<string, any>>;

  /**
   * ツールの実行後処理
   */
  afterExecution?(name: string, result: MCPToolResponse): Promise<MCPToolResponse>;

  /**
   * ツールの実行状況を取得
   */
  getExecutionStatus?(executionId: string): Promise<ToolExecutionStatus>;

  /**
   * ツールの実行をキャンセル
   */
  cancelExecution?(executionId: string): Promise<void>;

  /**
   * ツールのヘルプ情報を取得
   */
  getToolHelp?(name: string): Promise<ToolHelpInfo>;

  /**
   * ツールの使用例を取得
   */
  getToolExamples?(name: string): Promise<ToolExample[]>;
}

/**
 * ツール実行状況
 */
export interface ToolExecutionStatus {
  executionId: string;
  toolName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  progress?: number;
  message?: string;
  result?: MCPToolResponse;
  error?: AppError;
}

/**
 * ツールヘルプ情報
 */
export interface ToolHelpInfo {
  name: string;
  description: string;
  usage: string;
  parameters: ToolParameterInfo[];
  examples: ToolExample[];
  notes?: string[];
  seeAlso?: string[];
}

/**
 * ツールパラメータ情報
 */
export interface ToolParameterInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: any;
  allowedValues?: any[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * ツール使用例
 */
export interface ToolExample {
  title: string;
  description: string;
  arguments: Record<string, any>;
  expectedOutput?: string;
}

/**
 * ツールレジストリインターフェース
 */
export interface IToolRegistry {
  /**
   * ツールハンドラーを登録
   */
  register(handler: IToolHandler): void;

  /**
   * ツールハンドラーの登録を解除
   */
  unregister(handler: IToolHandler): void;

  /**
   * 登録されているハンドラーを取得
   */
  getHandlers(): IToolHandler[];

  /**
   * 指定されたツールを処理できるハンドラーを検索
   */
  findHandler(name: string): IToolHandler | undefined;

  /**
   * 全てのツール情報を取得
   */
  getAllTools(): MCPToolInfo[];

  /**
   * ツールを実行
   */
  executeTool(name: string, args?: Record<string, any>): Promise<Result<MCPToolResponse, AppError>>;

  /**
   * ツールの存在チェック
   */
  toolExists(name: string): boolean;

  /**
   * ツールの検索
   */
  searchTools(query: ToolSearchQuery): MCPToolInfo[];
}

/**
 * ツール検索クエリ
 */
export interface ToolSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  sortBy?: 'name' | 'category' | 'usage';
  sortOrder?: 'asc' | 'desc';
}

/**
 * ツール実行コンテキスト
 */
export interface ToolExecutionContext {
  executionId: string;
  toolName: string;
  arguments: Record<string, any>;
  startTime: Date;
  timeout?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * ツール実行ミドルウェアインターフェース
 */
export interface IToolMiddleware {
  /**
   * ミドルウェアの名前
   */
  getName(): string;

  /**
   * 実行前処理
   */
  beforeExecution?(context: ToolExecutionContext): Promise<ToolExecutionContext>;

  /**
   * 実行後処理
   */
  afterExecution?(context: ToolExecutionContext, result: MCPToolResponse): Promise<MCPToolResponse>;

  /**
   * エラー処理
   */
  onError?(context: ToolExecutionContext, error: AppError): Promise<AppError>;
}

/**
 * ツールバリデーターインターフェース
 */
export interface IToolValidator {
  /**
   * ツール名の妥当性をチェック
   */
  validateToolName(name: string): Result<void, AppError>;

  /**
   * ツール引数の妥当性をチェック
   */
  validateArguments(name: string, args?: Record<string, any>): Result<void, AppError>;

  /**
   * ツール実行権限をチェック
   */
  validatePermissions(name: string, userId?: string): Result<void, AppError>;

  /**
   * ツール実行レート制限をチェック
   */
  validateRateLimit(name: string, userId?: string): Result<void, AppError>;
}

/**
 * ツールメトリクスインターフェース
 */
export interface IToolMetrics {
  /**
   * ツール実行回数を記録
   */
  recordExecution(name: string, duration: number, success: boolean): void;

  /**
   * ツールエラーを記録
   */
  recordError(name: string, error: AppError): void;

  /**
   * ツールの統計情報を取得
   */
  getToolStats(name: string): ToolStats;

  /**
   * 全ツールの統計情報を取得
   */
  getAllStats(): Record<string, ToolStats>;

  /**
   * メトリクスをリセット
   */
  reset(): void;
}

/**
 * ツール統計情報
 */
export interface ToolStats {
  name: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  errorRate: number;
  popularityScore: number;
}

/**
 * ツールプロバイダーインターフェース
 */
export interface IToolProvider {
  /**
   * プロバイダーの名前
   */
  getName(): string;

  /**
   * プロバイダーの説明
   */
  getDescription(): string;

  /**
   * サポートするツールカテゴリ
   */
  getSupportedCategories(): string[];

  /**
   * ツールハンドラーを作成
   */
  createHandler(config: ToolProviderConfig): IToolHandler;

  /**
   * プロバイダーの設定を検証
   */
  validateConfig(config: ToolProviderConfig): Result<void, AppError>;
}

/**
 * ツールプロバイダー設定
 */
export interface ToolProviderConfig {
  name: string;
  category?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'oauth';
    credentials?: Record<string, any>;
  };
  rateLimit?: {
    maxExecutions: number;
    windowMs: number;
  };
  timeout?: number;
  retryConfig?: {
    retries: number;
    retryDelay: number;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
  };
}

/**
 * ツールファクトリーインターフェース
 */
export interface IToolFactory {
  /**
   * ツールハンドラーを作成
   */
  createToolHandler(type: string, config: ToolProviderConfig): IToolHandler;

  /**
   * ツールレジストリを作成
   */
  createToolRegistry(): IToolRegistry;

  /**
   * ツールバリデーターを作成
   */
  createToolValidator(): IToolValidator;

  /**
   * ツールメトリクスを作成
   */
  createToolMetrics(): IToolMetrics;
}

/**
 * ツール実行結果
 */
export interface ToolExecutionResult {
  executionId: string;
  toolName: string;
  success: boolean;
  result?: MCPToolResponse;
  error?: AppError;
  executionTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}
