/**
 * リソースハンドラーレジストリ
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import { BaseResourceHandler, ResourceInfo } from './base-resource-handler.js';
import { CompaniesResourceHandler } from './companies-resource-handler.js';
import { DealsResourceHandler } from './deals-resource-handler.js';
import { MCPResourceResponse } from '../utils/response-builder.js';
import { Logger } from '../infrastructure/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

/**
 * リソースハンドラーレジストリ
 * 全てのリソースハンドラーを管理し、適切なハンドラーにリクエストをルーティング
 */
@injectable()
export class ResourceRegistry {
  private handlers: BaseResourceHandler[] = [];

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler,
    // 各リソースハンドラーを注入
    @inject(TYPES.CompaniesResourceHandler) companiesHandler: CompaniesResourceHandler,
    @inject(TYPES.DealsResourceHandler) dealsHandler: DealsResourceHandler
  ) {
    // ハンドラーを登録
    this.registerHandler(companiesHandler);
    this.registerHandler(dealsHandler);
    
    this.logger.info('Resource registry initialized', {
      handlerCount: this.handlers.length,
      handlers: this.handlers.map(h => h.constructor.name)
    });
  }

  /**
   * ハンドラーを登録
   */
  private registerHandler(handler: BaseResourceHandler): void {
    this.handlers.push(handler);
    this.logger.debug('Resource handler registered', {
      handler: handler.constructor.name,
      resources: handler.getResourceInfo().map(r => r.uri)
    });
  }

  /**
   * 全てのリソース情報を取得
   */
  getAllResources(): ResourceInfo[] {
    const allResources: ResourceInfo[] = [];
    
    for (const handler of this.handlers) {
      const resources = handler.getResourceInfo();
      allResources.push(...resources);
    }

    this.logger.debug('Retrieved all resources', {
      totalCount: allResources.length,
      resources: allResources.map(r => r.uri)
    });

    return allResources;
  }

  /**
   * 指定されたURIを処理できるハンドラーを見つける
   */
  private findHandler(uri: string): BaseResourceHandler | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(uri)) {
        this.logger.debug('Handler found for URI', {
          uri,
          handler: handler.constructor.name
        });
        return handler;
      }
    }

    this.logger.warn('No handler found for URI', { uri });
    return null;
  }

  /**
   * リソースを読み取り
   */
  async readResource(uri: string): Promise<MCPResourceResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Reading resource', { uri });

      // 適切なハンドラーを見つける
      const handler = this.findHandler(uri);
      
      if (!handler) {
        const duration = Date.now() - startTime;
        this.logger.warn('Resource not found', { uri, duration });
        
        const error = this.errorHandler.apiError(`Unknown resource: ${uri}`, 404);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.errorHandler.toMCPError(error), null, 2),
            },
          ],
        };
      }

      // ハンドラーでリソースを読み取り
      const response = await handler.handleReadResource(uri);
      const duration = Date.now() - startTime;

      this.logger.info('Resource read completed', {
        uri,
        handler: handler.constructor.name,
        duration,
        success: !response.contents[0]?.text.includes('"error"')
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Resource read failed', {
        uri,
        duration,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      const appError = this.errorHandler.fromException(error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(this.errorHandler.toMCPError(appError), null, 2),
          },
        ],
      };
    }
  }

  /**
   * リソースの存在確認
   */
  resourceExists(uri: string): boolean {
    const exists = this.findHandler(uri) !== null;
    this.logger.debug('Resource existence check', { uri, exists });
    return exists;
  }

  /**
   * ハンドラー別のリソース一覧を取得
   */
  getResourcesByHandler(): Record<string, ResourceInfo[]> {
    const resourcesByHandler: Record<string, ResourceInfo[]> = {};
    
    for (const handler of this.handlers) {
      const handlerName = handler.constructor.name;
      resourcesByHandler[handlerName] = handler.getResourceInfo();
    }

    return resourcesByHandler;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalHandlers: number;
    totalResources: number;
    handlerStats: Array<{
      name: string;
      resourceCount: number;
      resources: string[];
    }>;
  } {
    const handlerStats = this.handlers.map(handler => ({
      name: handler.constructor.name,
      resourceCount: handler.getResourceInfo().length,
      resources: handler.getResourceInfo().map(r => r.uri),
    }));

    return {
      totalHandlers: this.handlers.length,
      totalResources: this.getAllResources().length,
      handlerStats,
    };
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    handlers: Array<{
      name: string;
      healthy: boolean;
      resourceCount: number;
    }>;
  }> {
    const handlerResults = this.handlers.map(handler => {
      try {
        const resources = handler.getResourceInfo();
        return {
          name: handler.constructor.name,
          healthy: true,
          resourceCount: resources.length,
        };
      } catch (error) {
        this.logger.error('Handler health check failed', {
          handler: handler.constructor.name,
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          name: handler.constructor.name,
          healthy: false,
          resourceCount: 0,
        };
      }
    });

    const healthy = handlerResults.every(result => result.healthy);

    this.logger.debug('Resource registry health check completed', {
      healthy,
      handlerCount: handlerResults.length,
      healthyHandlers: handlerResults.filter(r => r.healthy).length
    });

    return {
      healthy,
      handlers: handlerResults,
    };
  }
}
