/**
 * リソースハンドラーインターフェース
 * 
 * MCPリソースハンドラーの統一インターフェース定義
 */

import { Result } from 'neverthrow';

// インターフェースレジストリ（実行時にアクセス可能）
export const RESOURCE_HANDLER_INTERFACES = {
  IResourceHandler: 'IResourceHandler',
  IAdvancedResourceHandler: 'IAdvancedResourceHandler',
  IResourceRegistry: 'IResourceRegistry',
  IResourceCache: 'IResourceCache',
  IResourceValidator: 'IResourceValidator',
  IResourceProvider: 'IResourceProvider',
  IResourceFactory: 'IResourceFactory',
} as const;
import { MCPResourceInfo, MCPResourceResponse } from '../types/mcp.js';
import { AppError } from '../utils/error-handler.js';

/**
 * リソースハンドラーの基本インターフェース
 */
export interface IResourceHandler {
  /**
   * ハンドラーが提供するリソース情報を取得
   */
  getResourceInfo(): MCPResourceInfo[];

  /**
   * 指定されたURIのリソースを読み取り
   */
  readResource(uri: string): Promise<Result<MCPResourceResponse, AppError>>;

  /**
   * 指定されたURIをサポートするかチェック
   */
  supportsUri(uri: string): boolean;

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
 * リソースハンドラーの拡張インターフェース
 */
export interface IAdvancedResourceHandler extends IResourceHandler {
  /**
   * リソースの変更を監視
   */
  watchResource?(uri: string, callback: (event: ResourceChangeEvent) => void): Promise<void>;

  /**
   * リソースの監視を停止
   */
  unwatchResource?(uri: string): Promise<void>;

  /**
   * リソースのメタデータを取得
   */
  getResourceMetadata?(uri: string): Promise<Result<ResourceMetadata, AppError>>;

  /**
   * リソースの検索
   */
  searchResources?(query: ResourceSearchQuery): Promise<Result<MCPResourceInfo[], AppError>>;

  /**
   * リソースの一括読み取り
   */
  readMultipleResources?(uris: string[]): Promise<Result<MCPResourceResponse[], AppError>>;
}

/**
 * リソース変更イベント
 */
export interface ResourceChangeEvent {
  uri: string;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * リソースメタデータ
 */
export interface ResourceMetadata {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  size?: number;
  lastModified?: Date;
  version?: string;
  tags?: string[];
  permissions?: ResourcePermissions;
  cacheInfo?: ResourceCacheInfo;
}

/**
 * リソース権限
 */
export interface ResourcePermissions {
  read: boolean;
  write: boolean;
  delete: boolean;
  share: boolean;
}

/**
 * リソースキャッシュ情報
 */
export interface ResourceCacheInfo {
  cacheable: boolean;
  ttl?: number;
  etag?: string;
  lastModified?: Date;
}

/**
 * リソース検索クエリ
 */
export interface ResourceSearchQuery {
  query?: string;
  mimeType?: string;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'lastModified' | 'size';
  sortOrder?: 'asc' | 'desc';
}

/**
 * リソースレジストリインターフェース
 */
export interface IResourceRegistry {
  /**
   * リソースハンドラーを登録
   */
  register(handler: IResourceHandler): void;

  /**
   * リソースハンドラーの登録を解除
   */
  unregister(handler: IResourceHandler): void;

  /**
   * 登録されているハンドラーを取得
   */
  getHandlers(): IResourceHandler[];

  /**
   * 指定されたURIを処理できるハンドラーを検索
   */
  findHandler(uri: string): IResourceHandler | undefined;

  /**
   * 全てのリソース情報を取得
   */
  getAllResources(): MCPResourceInfo[];

  /**
   * リソースを読み取り
   */
  readResource(uri: string): Promise<Result<MCPResourceResponse, AppError>>;

  /**
   * リソースの存在チェック
   */
  resourceExists(uri: string): boolean;

  /**
   * リソースの検索
   */
  searchResources(query: ResourceSearchQuery): Promise<Result<MCPResourceInfo[], AppError>>;
}

/**
 * リソースキャッシュインターフェース
 */
export interface IResourceCache {
  /**
   * リソースをキャッシュに保存
   */
  set(uri: string, content: MCPResourceResponse, ttl?: number): Promise<void>;

  /**
   * キャッシュからリソースを取得
   */
  get(uri: string): Promise<MCPResourceResponse | null>;

  /**
   * キャッシュからリソースを削除
   */
  delete(uri: string): Promise<void>;

  /**
   * キャッシュをクリア
   */
  clear(): Promise<void>;

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): Promise<CacheStats>;

  /**
   * キャッシュの有効性をチェック
   */
  isValid(uri: string): Promise<boolean>;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * リソースバリデーターインターフェース
 */
export interface IResourceValidator {
  /**
   * リソースURIの妥当性をチェック
   */
  validateUri(uri: string): Result<void, AppError>;

  /**
   * リソースコンテンツの妥当性をチェック
   */
  validateContent(content: MCPResourceResponse): Result<void, AppError>;

  /**
   * リソースメタデータの妥当性をチェック
   */
  validateMetadata(metadata: ResourceMetadata): Result<void, AppError>;

  /**
   * リソースの権限をチェック
   */
  validatePermissions(uri: string, operation: 'read' | 'write' | 'delete'): Result<void, AppError>;
}

/**
 * リソースプロバイダーインターフェース
 */
export interface IResourceProvider {
  /**
   * プロバイダーの名前
   */
  getName(): string;

  /**
   * プロバイダーの説明
   */
  getDescription(): string;

  /**
   * サポートするURIスキーム
   */
  getSupportedSchemes(): string[];

  /**
   * リソースハンドラーを作成
   */
  createHandler(config: ResourceProviderConfig): IResourceHandler;

  /**
   * プロバイダーの設定を検証
   */
  validateConfig(config: ResourceProviderConfig): Result<void, AppError>;
}

/**
 * リソースプロバイダー設定
 */
export interface ResourceProviderConfig {
  name: string;
  baseUri?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'oauth';
    credentials?: Record<string, any>;
  };
  caching?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  timeout?: number;
  retryConfig?: {
    retries: number;
    retryDelay: number;
  };
}

/**
 * リソースファクトリーインターフェース
 */
export interface IResourceFactory {
  /**
   * リソースハンドラーを作成
   */
  createResourceHandler(type: string, config: ResourceProviderConfig): IResourceHandler;

  /**
   * リソースレジストリを作成
   */
  createResourceRegistry(): IResourceRegistry;

  /**
   * リソースキャッシュを作成
   */
  createResourceCache(config: CacheConfig): IResourceCache;

  /**
   * リソースバリデーターを作成
   */
  createResourceValidator(): IResourceValidator;
}

/**
 * キャッシュ設定
 */
export interface CacheConfig {
  maxSize: number;
  ttl: number;
  strategy: 'lru' | 'fifo' | 'ttl';
  persistToDisk?: boolean;
  diskPath?: string;
}
