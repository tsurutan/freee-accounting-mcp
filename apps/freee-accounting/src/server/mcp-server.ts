/**
 * freee会計 MCP Server メインクラス
 */

import { injectable, inject } from 'inversify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TYPES } from '../container/types.js';
import { Logger } from '../infrastructure/logger.js';
import { ResourceRegistry } from '../handlers/resource-registry.js';
import { AuthToolHandler } from '../handlers/auth-tool-handler.js';
import { AppConfig } from '../config/app-config.js';
import { EnvironmentConfig } from '../config/environment-config.js';

/**
 * MCP Server統合管理クラス
 */
@injectable()
export class MCPServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.AppConfig) private appConfig: AppConfig,
    @inject(TYPES.EnvironmentConfig) private envConfig: EnvironmentConfig,
    @inject(ResourceRegistry) private resourceRegistry: ResourceRegistry,
    @inject(AuthToolHandler) private authToolHandler: AuthToolHandler
  ) {
    this.server = new Server({
      name: 'freee-accounting-mcp',
      version: '0.1.0',
    }, {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    });

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  /**
   * リクエストハンドラーを設定
   */
  private setupHandlers(): void {
    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupPromptHandlers();
  }

  /**
   * リソースハンドラーを設定
   */
  private setupResourceHandlers(): void {
    // リソース一覧の取得
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        this.logger.info('Listing resources');
        const resources = this.resourceRegistry.getAllResources();
        
        this.logger.info('Resources listed successfully', { 
          count: resources.length 
        });

        return {
          resources: resources.map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
          })),
        };
      } catch (error) {
        this.logger.error('Failed to list resources', { error });
        throw error;
      }
    });

    // リソースの読み取り
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        const { uri } = request.params;
        this.logger.info('Reading resource', { uri });

        const response = await this.resourceRegistry.readResource(uri);
        
        this.logger.info('Resource read successfully', { uri });
        return response;
      } catch (error) {
        this.logger.error('Failed to read resource', { 
          uri: request.params.uri,
          error 
        });
        throw error;
      }
    });
  }

  /**
   * ツールハンドラーを設定
   */
  private setupToolHandlers(): void {
    // ツール一覧の取得
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        this.logger.info('Listing tools');
        
        const authTools = this.authToolHandler.getToolInfo();
        const allTools = [...authTools];

        this.logger.info('Tools listed successfully', { 
          count: allTools.length 
        });

        return {
          tools: allTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        };
      } catch (error) {
        this.logger.error('Failed to list tools', { error });
        throw error;
      }
    });

    // ツールの実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        this.logger.info('Executing tool', { toolName: name });

        // 認証ツールの処理
        if (this.authToolHandler.canHandle(name)) {
          const response = await this.authToolHandler.handleToolExecution(name, args);
          this.logger.info('Tool executed successfully', { toolName: name });
          return response;
        }

        // 未知のツール
        this.logger.warn('Unknown tool requested', { toolName: name });
        return {
          content: [
            {
              type: 'text',
              text: `未知のツール: ${name}`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        this.logger.error('Failed to execute tool', { 
          toolName: request.params.name,
          error 
        });
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
    });
  }

  /**
   * プロンプトハンドラーを設定
   */
  private setupPromptHandlers(): void {
    // プロンプト一覧の取得
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        this.logger.info('Listing prompts');

        // 基本的なプロンプトを定義
        const prompts = [
          {
            name: 'setup-guide',
            description: 'freee会計 MCP Server のセットアップガイド',
          },
          {
            name: 'transaction-input-guide',
            description: '取引入力の支援ガイド',
          },
        ];

        this.logger.info('Prompts listed successfully', { 
          count: prompts.length 
        });

        return { prompts };
      } catch (error) {
        this.logger.error('Failed to list prompts', { error });
        throw error;
      }
    });

    // プロンプトの取得
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      try {
        const { name } = request.params;
        this.logger.info('Getting prompt', { promptName: name });

        switch (name) {
          case 'setup-guide':
            return this.getSetupGuidePrompt();
          
          case 'transaction-input-guide':
            return this.getTransactionInputGuidePrompt();
          
          default:
            this.logger.warn('Unknown prompt requested', { promptName: name });
            return {
              description: `未知のプロンプト: ${name}`,
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `プロンプト "${name}" は存在しません。`,
                  },
                },
              ],
            };
        }
      } catch (error) {
        this.logger.error('Failed to get prompt', { 
          promptName: request.params.name,
          error 
        });
        throw error;
      }
    });
  }

  /**
   * セットアップガイドプロンプトを取得
   */
  private getSetupGuidePrompt() {
    const envSummary = this.envConfig.getSummary();
    
    return {
      description: 'freee会計 MCP Server のセットアップガイド',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `freee会計 MCP Server のセットアップ状況を確認し、必要な設定を案内してください。

現在の設定状況:
- 認証方式: ${envSummary.authMode}
- アクセストークン: ${envSummary.hasAccessToken ? '設定済み' : '未設定'}
- クライアントID: ${envSummary.hasClientId ? '設定済み' : '未設定'}
- クライアントシークレット: ${envSummary.hasClientSecret ? '設定済み' : '未設定'}
- リダイレクトURI: ${envSummary.redirectUri}
- ベースURL: ${envSummary.baseUrl}

適切なセットアップ手順を案内してください。`,
          },
        },
      ],
    };
  }

  /**
   * 取引入力ガイドプロンプトを取得
   */
  private getTransactionInputGuidePrompt() {
    return {
      description: '取引入力の支援ガイド',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `freee会計での取引入力を支援してください。

以下の情報を基に、適切な取引データの作成を案内してください:
- 事業所ID: ${this.appConfig.companyId}
- 利用可能なツール: 取引一覧取得、事業所情報取得、認証状態確認

取引入力に必要な情報（日付、金額、勘定科目、取引先など）の入力方法を説明し、
実際の取引データ作成をサポートしてください。`,
          },
        },
      ],
    };
  }

  /**
   * サーバーを開始
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting MCP Server', {
        serverName: 'freee-accounting-mcp',
        version: '0.1.0',
        authMode: this.envConfig.getSummary().authMode,
        companyId: this.appConfig.companyId,
      });

      await this.server.connect(this.transport);
      
      this.logger.info('MCP Server started successfully');
    } catch (error) {
      this.logger.error('Failed to start MCP Server', { error });
      throw error;
    }
  }

  /**
   * サーバーを停止
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping MCP Server');
      await this.server.close();
      this.logger.info('MCP Server stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop MCP Server', { error });
      throw error;
    }
  }
}
