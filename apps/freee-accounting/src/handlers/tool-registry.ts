/**
 * ツールハンドラーレジストリ
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import { BaseToolHandler, ToolInfo } from './base-tool-handler.js';
import { AuthToolHandler } from './auth-tool-handler.js';
import { DealToolHandler } from './deal-tool-handler.js';
import { CompanyToolHandler } from './company-tool-handler.js';
import { SystemToolHandler } from './system-tool-handler.js';
import { MCPToolResponse } from '../utils/response-builder.js';
import { Logger } from '../infrastructure/logger.js';
import { ErrorHandler } from '../utils/error-handler.js';

/**
 * ツールハンドラーレジストリ
 * 全てのツールハンドラーを管理し、適切なハンドラーにリクエストをルーティング
 */
@injectable()
export class ToolRegistry {
  private handlers: BaseToolHandler[] = [];

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.ErrorHandler) private errorHandler: ErrorHandler,
    // 各ツールハンドラーを注入
    @inject(TYPES.AuthToolHandler) authHandler: AuthToolHandler,
    @inject(TYPES.DealToolHandler) dealHandler: DealToolHandler,
    @inject(TYPES.CompanyToolHandler) companyHandler: CompanyToolHandler,
    @inject(TYPES.SystemToolHandler) systemHandler: SystemToolHandler
  ) {
    // ハンドラーを登録
    this.registerHandler(authHandler);
    this.registerHandler(dealHandler);
    this.registerHandler(companyHandler);
    this.registerHandler(systemHandler);
    
    this.logger.info('Tool registry initialized', {
      handlerCount: this.handlers.length,
      handlers: this.handlers.map(h => h.constructor.name)
    });
  }

  /**
   * ハンドラーを登録
   */
  private registerHandler(handler: BaseToolHandler): void {
    this.handlers.push(handler);
    this.logger.debug('Tool handler registered', {
      handler: handler.constructor.name,
      tools: handler.getToolInfo().map(t => t.name)
    });
  }

  /**
   * 全てのツール情報を取得
   */
  getAllTools(): ToolInfo[] {
    const allTools: ToolInfo[] = [];
    
    for (const handler of this.handlers) {
      const tools = handler.getToolInfo();
      allTools.push(...tools);
    }

    this.logger.debug('Retrieved all tools', {
      totalCount: allTools.length,
      tools: allTools.map(t => t.name)
    });

    return allTools;
  }

  /**
   * 指定されたツールを処理できるハンドラーを見つける
   */
  private findHandler(toolName: string): BaseToolHandler | null {
    for (const handler of this.handlers) {
      if (handler.canHandle(toolName)) {
        this.logger.debug('Handler found for tool', {
          toolName,
          handler: handler.constructor.name
        });
        return handler;
      }
    }

    this.logger.warn('No handler found for tool', { toolName });
    return null;
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<MCPToolResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Executing tool', { toolName: name });

      // 適切なハンドラーを見つける
      const handler = this.findHandler(name);
      
      if (!handler) {
        const duration = Date.now() - startTime;
        this.logger.warn('Tool not found', { toolName: name, duration });
        
        const error = this.errorHandler.apiError(`Unknown tool: ${name}`, 404);
        return {
          content: [
            {
              type: 'text',
              text: `未知のツール: ${name}`,
            },
          ],
          isError: true,
        };
      }

      // ハンドラーでツールを実行
      const response = await handler.handleToolExecution(name, args);
      const duration = Date.now() - startTime;

      this.logger.info('Tool execution completed', {
        toolName: name,
        handler: handler.constructor.name,
        duration,
        success: !response.isError
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Tool execution failed', {
        toolName: name,
        duration,
        error: error instanceof Error ? error.message : String(error)
      }, error instanceof Error ? error : undefined);

      return {
        content: [
          {
            type: 'text',
            text: `ツール実行エラー: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * ツールの存在確認
   */
  toolExists(toolName: string): boolean {
    const exists = this.findHandler(toolName) !== null;
    this.logger.debug('Tool existence check', { toolName, exists });
    return exists;
  }

  /**
   * ハンドラー別のツール一覧を取得
   */
  getToolsByHandler(): Record<string, ToolInfo[]> {
    const toolsByHandler: Record<string, ToolInfo[]> = {};
    
    for (const handler of this.handlers) {
      const handlerName = handler.constructor.name;
      toolsByHandler[handlerName] = handler.getToolInfo();
    }

    return toolsByHandler;
  }

  /**
   * カテゴリ別のツール一覧を取得
   */
  getToolsByCategory(): Record<string, ToolInfo[]> {
    const categories: Record<string, ToolInfo[]> = {
      '認証': [],
      '取引': [],
      '事業所': [],
      'システム': [],
    };

    for (const handler of this.handlers) {
      const tools = handler.getToolInfo();
      const handlerName = handler.constructor.name;

      if (handlerName.includes('Auth')) {
        categories['認証']?.push(...tools);
      } else if (handlerName.includes('Deal')) {
        categories['取引']?.push(...tools);
      } else if (handlerName.includes('Company')) {
        categories['事業所']?.push(...tools);
      } else if (handlerName.includes('System')) {
        categories['システム']?.push(...tools);
      }
    }

    return categories;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalHandlers: number;
    totalTools: number;
    handlerStats: Array<{
      name: string;
      toolCount: number;
      tools: string[];
    }>;
    categoryStats: Record<string, number>;
  } {
    const handlerStats = this.handlers.map(handler => ({
      name: handler.constructor.name,
      toolCount: handler.getToolInfo().length,
      tools: handler.getToolInfo().map(t => t.name),
    }));

    const categories = this.getToolsByCategory();
    const categoryStats: Record<string, number> = {};
    for (const [category, tools] of Object.entries(categories)) {
      categoryStats[category] = tools.length;
    }

    return {
      totalHandlers: this.handlers.length,
      totalTools: this.getAllTools().length,
      handlerStats,
      categoryStats,
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
      toolCount: number;
    }>;
  }> {
    const handlerResults = this.handlers.map(handler => {
      try {
        const tools = handler.getToolInfo();
        return {
          name: handler.constructor.name,
          healthy: true,
          toolCount: tools.length,
        };
      } catch (error) {
        this.logger.error('Handler health check failed', {
          handler: handler.constructor.name,
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          name: handler.constructor.name,
          healthy: false,
          toolCount: 0,
        };
      }
    });

    const healthy = handlerResults.every(result => result.healthy);

    this.logger.debug('Tool registry health check completed', {
      healthy,
      handlerCount: handlerResults.length,
      healthyHandlers: handlerResults.filter(r => r.healthy).length
    });

    return {
      healthy,
      handlers: handlerResults,
    };
  }

  /**
   * ツール検索
   */
  searchTools(query: string): ToolInfo[] {
    const allTools = this.getAllTools();
    const lowerQuery = query.toLowerCase();

    const matchedTools = allTools.filter(tool => 
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery)
    );

    this.logger.debug('Tool search completed', {
      query,
      totalTools: allTools.length,
      matchedCount: matchedTools.length
    });

    return matchedTools;
  }

  /**
   * ツールの詳細情報を取得
   */
  getToolDetails(toolName: string): ToolInfo | null {
    const allTools = this.getAllTools();
    const tool = allTools.find(t => t.name === toolName);

    if (tool) {
      this.logger.debug('Tool details retrieved', { toolName });
    } else {
      this.logger.warn('Tool details not found', { toolName });
    }

    return tool || null;
  }
}
