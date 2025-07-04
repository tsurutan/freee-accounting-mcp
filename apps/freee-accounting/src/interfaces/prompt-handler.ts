/**
 * プロンプトハンドラーインターフェース
 * 
 * MCPプロンプトハンドラーの統一インターフェース定義
 */

import { Result } from 'neverthrow';

// インターフェースレジストリ（実行時にアクセス可能）
export const PROMPT_HANDLER_INTERFACES = {
  IPromptHandler: 'IPromptHandler',
  IAdvancedPromptHandler: 'IAdvancedPromptHandler',
  IPromptRegistry: 'IPromptRegistry',
  IPromptValidator: 'IPromptValidator',
  IPromptProvider: 'IPromptProvider',
  IPromptFactory: 'IPromptFactory',
} as const;
import { MCPPromptInfo, MCPPromptResponse } from '../types/mcp.js';
import { AppError } from '../utils/error-handler.js';

/**
 * プロンプトハンドラーの基本インターフェース
 */
export interface IPromptHandler {
  /**
   * ハンドラーが提供するプロンプト情報を取得
   */
  getPromptInfo(): MCPPromptInfo[];

  /**
   * 指定されたプロンプトを取得
   */
  getPrompt(name: string, args?: Record<string, any>): Promise<Result<MCPPromptResponse, AppError>>;

  /**
   * 指定されたプロンプトをサポートするかチェック
   */
  supportsPrompt(name: string): boolean;

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
 * プロンプトハンドラーの拡張インターフェース
 */
export interface IAdvancedPromptHandler extends IPromptHandler {
  /**
   * プロンプト引数のバリデーション
   */
  validateArguments?(name: string, args?: Record<string, any>): Result<void, AppError>;

  /**
   * プロンプトのプレビュー生成
   */
  previewPrompt?(name: string, args?: Record<string, any>): Promise<Result<PromptPreview, AppError>>;

  /**
   * プロンプトテンプレートの取得
   */
  getPromptTemplate?(name: string): Promise<Result<PromptTemplate, AppError>>;

  /**
   * プロンプトの使用例を取得
   */
  getPromptExamples?(name: string): Promise<PromptExample[]>;

  /**
   * プロンプトのバリエーションを取得
   */
  getPromptVariations?(name: string, args?: Record<string, any>): Promise<Result<MCPPromptResponse[], AppError>>;

  /**
   * プロンプトの評価・改善提案
   */
  evaluatePrompt?(name: string, args?: Record<string, any>): Promise<PromptEvaluation>;
}

/**
 * プロンプトプレビュー
 */
export interface PromptPreview {
  name: string;
  description: string;
  estimatedTokens: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens?: number;
  }>;
  metadata?: Record<string, any>;
}

/**
 * プロンプトテンプレート
 */
export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  examples: PromptExample[];
  metadata?: {
    category?: string;
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedTokens?: number;
  };
}

/**
 * プロンプト変数
 */
export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    allowedValues?: any[];
  };
}

/**
 * プロンプト使用例
 */
export interface PromptExample {
  title: string;
  description: string;
  arguments: Record<string, any>;
  expectedOutput?: string;
  useCase?: string;
}

/**
 * プロンプト評価
 */
export interface PromptEvaluation {
  name: string;
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  metrics: {
    clarity: number;
    specificity: number;
    completeness: number;
    efficiency: number;
  };
}

/**
 * プロンプトレジストリインターフェース
 */
export interface IPromptRegistry {
  /**
   * プロンプトハンドラーを登録
   */
  register(handler: IPromptHandler): void;

  /**
   * プロンプトハンドラーの登録を解除
   */
  unregister(handler: IPromptHandler): void;

  /**
   * 登録されているハンドラーを取得
   */
  getHandlers(): IPromptHandler[];

  /**
   * 指定されたプロンプトを処理できるハンドラーを検索
   */
  findHandler(name: string): IPromptHandler | undefined;

  /**
   * 全てのプロンプト情報を取得
   */
  getAllPrompts(): MCPPromptInfo[];

  /**
   * プロンプトを取得
   */
  getPrompt(name: string, args?: Record<string, any>): Promise<Result<MCPPromptResponse, AppError>>;

  /**
   * プロンプトの存在チェック
   */
  promptExists(name: string): boolean;

  /**
   * プロンプトの検索
   */
  searchPrompts(query: PromptSearchQuery): MCPPromptInfo[];
}

/**
 * プロンプト検索クエリ
 */
export interface PromptSearchQuery {
  query?: string;
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  sortBy?: 'name' | 'category' | 'usage' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

/**
 * プロンプトコンテキスト
 */
export interface PromptContext {
  name: string;
  arguments: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * プロンプトミドルウェアインターフェース
 */
export interface IPromptMiddleware {
  /**
   * ミドルウェアの名前
   */
  getName(): string;

  /**
   * プロンプト生成前処理
   */
  beforeGeneration?(context: PromptContext): Promise<PromptContext>;

  /**
   * プロンプト生成後処理
   */
  afterGeneration?(context: PromptContext, response: MCPPromptResponse): Promise<MCPPromptResponse>;

  /**
   * エラー処理
   */
  onError?(context: PromptContext, error: AppError): Promise<AppError>;
}

/**
 * プロンプトバリデーターインターフェース
 */
export interface IPromptValidator {
  /**
   * プロンプト名の妥当性をチェック
   */
  validatePromptName(name: string): Result<void, AppError>;

  /**
   * プロンプト引数の妥当性をチェック
   */
  validateArguments(name: string, args?: Record<string, any>): Result<void, AppError>;

  /**
   * プロンプトアクセス権限をチェック
   */
  validatePermissions(name: string, userId?: string): Result<void, AppError>;

  /**
   * プロンプト使用レート制限をチェック
   */
  validateRateLimit(name: string, userId?: string): Result<void, AppError>;
}

/**
 * プロンプトメトリクスインターフェース
 */
export interface IPromptMetrics {
  /**
   * プロンプト使用回数を記録
   */
  recordUsage(name: string, tokenCount: number, success: boolean): void;

  /**
   * プロンプトエラーを記録
   */
  recordError(name: string, error: AppError): void;

  /**
   * プロンプトの統計情報を取得
   */
  getPromptStats(name: string): PromptStats;

  /**
   * 全プロンプトの統計情報を取得
   */
  getAllStats(): Record<string, PromptStats>;

  /**
   * メトリクスをリセット
   */
  reset(): void;
}

/**
 * プロンプト統計情報
 */
export interface PromptStats {
  name: string;
  totalUsage: number;
  successfulUsage: number;
  failedUsage: number;
  averageTokenCount: number;
  lastUsedAt?: Date;
  errorRate: number;
  popularityScore: number;
  userRating?: number;
}

/**
 * プロンプトプロバイダーインターフェース
 */
export interface IPromptProvider {
  /**
   * プロバイダーの名前
   */
  getName(): string;

  /**
   * プロバイダーの説明
   */
  getDescription(): string;

  /**
   * サポートするプロンプトカテゴリ
   */
  getSupportedCategories(): string[];

  /**
   * プロンプトハンドラーを作成
   */
  createHandler(config: PromptProviderConfig): IPromptHandler;

  /**
   * プロバイダーの設定を検証
   */
  validateConfig(config: PromptProviderConfig): Result<void, AppError>;
}

/**
 * プロンプトプロバイダー設定
 */
export interface PromptProviderConfig {
  name: string;
  category?: string;
  templates?: PromptTemplate[];
  rateLimit?: {
    maxUsage: number;
    windowMs: number;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
  };
  evaluation?: {
    enabled: boolean;
    autoImprove?: boolean;
  };
}

/**
 * プロンプトファクトリーインターフェース
 */
export interface IPromptFactory {
  /**
   * プロンプトハンドラーを作成
   */
  createPromptHandler(type: string, config: PromptProviderConfig): IPromptHandler;

  /**
   * プロンプトレジストリを作成
   */
  createPromptRegistry(): IPromptRegistry;

  /**
   * プロンプトバリデーターを作成
   */
  createPromptValidator(): IPromptValidator;

  /**
   * プロンプトメトリクスを作成
   */
  createPromptMetrics(): IPromptMetrics;
}

/**
 * プロンプト生成結果
 */
export interface PromptGenerationResult {
  name: string;
  success: boolean;
  response?: MCPPromptResponse;
  error?: AppError;
  tokenCount?: number;
  generationTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}
