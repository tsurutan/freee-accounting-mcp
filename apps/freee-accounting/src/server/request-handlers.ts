/**
 * MCPサーバーのリクエストハンドラー統合
 */

import { injectable, inject } from 'inversify';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TYPES } from '../container/types.js';
import { ResourceRegistry } from '../handlers/resource-registry.js';
import { ToolRegistry } from '../handlers/tool-registry.js';

/**
 * リクエストハンドラー統合クラス
 */
@injectable()
export class RequestHandlers {
  constructor(
    @inject(TYPES.Logger) private readonly logger: any,
    @inject(TYPES.ResourceRegistry) private readonly resourceRegistry: ResourceRegistry,
    @inject(TYPES.ToolRegistry) private readonly toolRegistry: ToolRegistry
  ) {}

  /**
   * すべてのリクエストハンドラーを設定
   */
  setupHandlers(server: Server): void {
    this.setupResourceHandlers(server);
    this.setupToolHandlers(server);
    this.setupPromptHandlers(server);
  }

  /**
   * リソースハンドラーを設定
   */
  private setupResourceHandlers(server: Server): void {
    // リソース一覧の取得
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
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
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
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
  private setupToolHandlers(server: Server): void {
    // ツール一覧の取得
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        this.logger.info('Listing tools');

        const allTools = this.toolRegistry.getAllTools();

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
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        this.logger.info('Executing tool', { toolName: name });

        // ツールレジストリで実行
        const response = await this.toolRegistry.executeTool(name, args);
        this.logger.info('Tool executed successfully', { toolName: name });
        return response;
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
  private setupPromptHandlers(server: Server): void {
    // プロンプト一覧の取得
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
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
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
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
    return {
      description: 'freee会計 MCP Server のセットアップガイド',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `freee会計 MCP Server のセットアップを支援してください。

以下の手順でセットアップを進めてください：

1. **環境変数の設定**
   - FREEE_CLIENT_ID: freee APIのクライアントID
   - FREEE_CLIENT_SECRET: freee APIのクライアントシークレット
   - FREEE_REDIRECT_URI: OAuth認証のリダイレクトURI
   - FREEE_COMPANY_ID: 対象の事業所ID（オプション）

2. **OAuth認証の実行**
   - \`get-auth-url\` ツールで認証URLを取得
   - ブラウザで認証を実行
   - 認証コードを取得
   - \`exchange-code\` ツールでアクセストークンを取得

3. **接続テスト**
   - \`get-companies\` ツールで事業所一覧を取得
   - \`get-health\` ツールでシステム状態を確認

セットアップでお困りの点があれば、具体的にお聞かせください。`,
          },
        },
      ],
    };
  }

  /**
   * 取引入力支援ガイドプロンプトを取得
   */
  private getTransactionInputGuidePrompt() {
    return {
      description: '取引入力の支援ガイド',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `freee会計での取引入力を支援します。

取引入力に必要な情報（日付、金額、勘定科目、取引先など）の入力方法を説明し、
実際の取引データ作成をサポートしてください。`,
          },
        },
      ],
    };
  }
}
