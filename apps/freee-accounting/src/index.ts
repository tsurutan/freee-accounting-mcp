#!/usr/bin/env node

/**
 * freee会計 MCP Server エントリーポイント
 */

// 環境変数を読み込み
import * as fs from 'fs';
import * as path from 'path';

// .envファイルを手動で読み込み（MCP Inspector対応）
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  // 環境変数読み込みエラーは無視（MCP Inspector使用時）
}

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
import {
  FreeeClient,
  FreeeOAuthClient,
  logger,
  MetricsCollector,
  SecurityAuditor
} from '@mcp-server/shared';
import { OAuthConfig, CreateDealRequest } from '@mcp-server/types';
import { getConfig, getCompanyId, getDateRange, getMonthDateRange } from './config.js';

// 環境変数から設定を読み込み
const accessToken = process.env.FREEE_ACCESS_TOKEN;
const appConfig = getConfig();
const baseUrl = appConfig.baseUrl;

// 認証方式の判定
const useDirectToken = !!accessToken;
const useOAuth = !useDirectToken && !!(process.env.FREEE_CLIENT_ID && process.env.FREEE_CLIENT_SECRET);

// OAuth設定（OAuth認証使用時のみ）
let oauthConfig: OAuthConfig | undefined;
if (useOAuth) {
  oauthConfig = {
    clientId: process.env.FREEE_CLIENT_ID || '',
    clientSecret: process.env.FREEE_CLIENT_SECRET || '',
    redirectUri: process.env.FREEE_REDIRECT_URI || 'http://localhost:3000/callback',
    baseUrl: baseUrl,
  };
}

// デバッグ用：環境変数の読み込み状況を確認（MCP Inspector使用時はコメントアウト）
// console.log('Environment variables loaded:', {
//   hasAccessToken: !!accessToken,
//   hasClientId: !!process.env.FREEE_CLIENT_ID,
//   hasClientSecret: !!process.env.FREEE_CLIENT_SECRET,
//   redirectUri: process.env.FREEE_REDIRECT_URI,
//   baseUrl: baseUrl,
//   authMode: useDirectToken ? 'direct_token' : useOAuth ? 'oauth' : 'none',
// });

// OAuth クライアントとAPIクライアントを初期化
let oauthClient: FreeeOAuthClient | undefined;
if (useOAuth && oauthConfig) {
  oauthClient = new FreeeOAuthClient(oauthConfig);
}

const freeeClient = new FreeeClient({
  baseURL: baseUrl,
  accessToken: useDirectToken ? accessToken : undefined,
  oauthClient: oauthClient,
  maxRetries: 3,
  retryDelay: 1000,
  enableCache: true,
  cacheTtl: 5 * 60 * 1000, // 5分
});

// メトリクス収集器を初期化
const metricsCollector = new MetricsCollector();

// MCP Inspector使用時はlogger出力を無効化
// logger.info('freee会計 MCP Server initializing', {
//   baseUrl: baseUrl,
//   authMode: useDirectToken ? 'direct_token' : useOAuth ? 'oauth' : 'none',
//   hasAccessToken: !!accessToken,
//   hasClientId: !!process.env.FREEE_CLIENT_ID,
//   hasClientSecret: !!process.env.FREEE_CLIENT_SECRET,
// });

// 認証状態チェック用のヘルパー関数
function checkAuthenticationStatus(): { isAuthenticated: boolean; errorResponse?: any } {
  if (useDirectToken) {
    // 直接トークン認証の場合は常に認証済みとみなす
    return { isAuthenticated: true };
  } else if (useOAuth && oauthClient) {
    const authState = oauthClient.getAuthState();
    if (!authState.isAuthenticated) {
      return {
        isAuthenticated: false,
        errorResponse: {
          error: '認証が必要です',
          message: 'generate-auth-url ツールを使用して認証を開始してください',
        }
      };
    }
    return { isAuthenticated: true };
  } else {
    return {
      isAuthenticated: false,
      errorResponse: {
        error: '認証設定が不正です',
        message: 'FREEE_ACCESS_TOKEN または OAuth設定（FREEE_CLIENT_ID, FREEE_CLIENT_SECRET）を設定してください',
      }
    };
  }
}

// 簡単なヘルスチェック機能
const healthChecks = {
  async checkAuthConfig(): Promise<boolean> {
    if (useDirectToken) {
      return !!accessToken;
    }
    if (useOAuth && oauthConfig) {
      return !!(oauthConfig.clientId && oauthConfig.clientSecret);
    }
    return false;
  },

  async checkFreeeAPI(): Promise<boolean> {
    try {
      // 簡単な接続テスト
      const response = await freeeClient.get('/api/1/companies');
      return response !== null;
    } catch (error) {
      return false;
    }
  },

  async runAllChecks(): Promise<Record<string, boolean>> {
    return {
      auth_config: await this.checkAuthConfig(),
      freee_api: await this.checkFreeeAPI(),
    };
  }
};

// 定期的なメトリクス収集
setInterval(() => {
  const performanceMetrics = metricsCollector.getPerformanceMetrics();
  const systemMetrics = metricsCollector.getSystemMetrics();
  // logger.debug('Metrics collected', { performanceMetrics, systemMetrics });
}, 60000); // 1分間隔

const server = new Server({
  name: 'freee-accounting-mcp',
  version: '0.1.0',
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// リソース一覧の取得
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'companies://list',
        name: '事業所一覧',
        description: '利用可能な事業所の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'companies://current',
        name: '現在の事業所情報',
        description: '現在選択されている事業所の詳細情報を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'account-items://list',
        name: '勘定科目一覧',
        description: '利用可能な勘定科目の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'partners://list',
        name: '取引先一覧',
        description: '利用可能な取引先の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'sections://list',
        name: '部門一覧',
        description: '利用可能な部門の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'items://list',
        name: '品目一覧',
        description: '利用可能な品目の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'tags://list',
        name: 'メモタグ一覧',
        description: '利用可能なメモタグの一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'deals://list',
        name: '取引一覧',
        description: '取引（収入・支出）の一覧を取得します',
        mimeType: 'application/json',
      },
      {
        uri: 'trial-balance://current',
        name: '試算表',
        description: '現在の試算表データを取得します',
        mimeType: 'application/json',
      },
    ],
  };
});

// リソースの読み取り
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === 'companies://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 事業所一覧を取得
      const response = await freeeClient.get('/api/1/companies');
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              companies: response.data,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'companies://current') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所情報を取得
      const companyId = getCompanyId();
      const companyResponse = await freeeClient.get(`/api/1/companies/${companyId}`);
      const currentCompany = companyResponse.data;
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              company: currentCompany,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'account-items://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の勘定科目一覧を取得
      const companyId = getCompanyId();
      const accountItemsResponse = await freeeClient.get(`/api/1/account_items?company_id=${companyId}`);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              account_items: accountItemsResponse.data,
              company_id: companyId,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'partners://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の取引先一覧を取得
      const companyId = getCompanyId();
      const partnersResponse = await freeeClient.get(`/api/1/partners?company_id=${companyId}`);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              partners: partnersResponse.data,
              company_id: companyId,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'sections://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の部門一覧を取得
      const companyId = getCompanyId();
      const sectionsResponse = await freeeClient.get(`/api/1/sections?company_id=${companyId}`);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              sections: sectionsResponse.data,
              company_id: companyId,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'items://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の品目一覧を取得
      const companyId = getCompanyId();
      const itemsResponse = await freeeClient.get(`/api/1/items?company_id=${companyId}`);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              items: itemsResponse.data,
              company_id: companyId,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'tags://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所のメモタグ一覧を取得
      const companyId = getCompanyId();
      const tagsResponse = await freeeClient.get(`/api/1/tags?company_id=${companyId}`);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              tags: tagsResponse.data,
              company_id: companyId,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'deals://list') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の取引一覧を取得
      const companyId = getCompanyId();

      // 事業所一覧を取得して、指定した事業所IDが存在するかチェック
      const companiesResponse = await freeeClient.get('/api/1/companies');
      const rawData = companiesResponse.data as any;
      const companies = rawData?.companies || rawData || [];
      const targetCompany = companies.find((c: any) => c.id === companyId);

      // より広い期間の取引を取得（過去365日）
      const { startDate, endDate } = getDateRange(365);

      // パラメータの構築（既存のget-dealsツールと同じ方式）
      const params = new URLSearchParams({
        company_id: companyId.toString(),
        start_issue_date: startDate,
        end_issue_date: endDate,
        limit: '100',
        offset: '0',
      });

      const dealsResponse = await freeeClient.get(`/api/1/deals?${params.toString()}`);

      // freee APIのレスポンス形式に対応（既存実装と同じロジック）
      let deals: any[] = [];
      if (dealsResponse.data) {
        const data = dealsResponse.data as any;
        if (Array.isArray(data)) {
          deals = data;
        } else if (data.deals && Array.isArray(data.deals)) {
          deals = data.deals;
        } else if (data.data && Array.isArray(data.data)) {
          deals = data.data;
        }
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              deals: deals,
              company_id: companyId,
              period: { start_date: startDate, end_date: endDate },
              deals_count: deals.length,
              api_url: `/api/1/deals?${params.toString()}`,
              raw_response_structure: dealsResponse.data ? Object.keys(dealsResponse.data) : 'no_data',
              raw_response_sample: dealsResponse.data,
              available_companies: companies.map((c: any) => ({ id: c.id, name: c.name })),
              target_company_found: !!targetCompany,
              target_company_info: targetCompany,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    if (uri === 'trial-balance://current') {
      // 認証状態をチェック
      const authCheck = checkAuthenticationStatus();
      if (!authCheck.isAuthenticated) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(authCheck.errorResponse, null, 2),
            },
          ],
        };
      }

      // 固定の事業所の試算表を取得
      const companyId = getCompanyId();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // 当年度の試算表を取得
      const trialBalanceResponse = await freeeClient.get(
        `/api/1/reports/trial_bs?company_id=${companyId}&fiscal_year=${currentYear}&start_month=1&end_month=${currentMonth}&account_item_display_type=account_item&breakdown_display_type=breakdown&partner_display_type=not_partner_display&item_display_type=not_item_display&section_display_type=not_section_display&adjustment=not_adjustment&cost_allocation=not_cost_allocation`
      );

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              trial_balance: trialBalanceResponse.data,
              company_id: companyId,
              fiscal_year: currentYear,
              period: { start_month: 1, end_month: currentMonth },
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  } catch (error: any) {
    // logger.error('Resource read error', { uri, error: error.message }, error);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'API エラー',
            message: error.message,
            timestamp: new Date().toISOString(),
            retryable: error.retryable || false,
          }, null, 2),
        },
      ],
    };
  }
});

// ツール一覧の取得
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate-auth-url',
        description: 'freee OAuth認証URLを生成します（OAuth認証使用時のみ）',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'CSRF保護用のstate パラメータ（オプション）',
            },
          },
        },
      },
      {
        name: 'exchange-auth-code',
        description: '認証コードをアクセストークンに交換します（OAuth認証使用時のみ）',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'OAuth認証コード',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'check-auth-status',
        description: '現在の認証状態を確認します（直接トークン認証またはOAuth認証）',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-companies',
        description: '利用可能な事業所一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create-deal',
        description: '新しい取引を作成します（事業所ID: 2067140固定）',
        inputSchema: {
          type: 'object',
          properties: {
            issue_date: {
              type: 'string',
              description: '取引日（YYYY-MM-DD形式）',
            },
            type: {
              type: 'string',
              enum: ['income', 'expense'],
              description: '取引タイプ（income: 収入, expense: 支出）',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID（オプション）',
            },
            ref_number: {
              type: 'string',
              description: '管理番号（オプション）',
            },
            details: {
              type: 'array',
              description: '取引明細',
              items: {
                type: 'object',
                properties: {
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  entry_side: {
                    type: 'string',
                    enum: ['credit', 'debit'],
                    description: '貸借区分（credit: 貸方, debit: 借方）',
                  },
                  description: {
                    type: 'string',
                    description: '備考（オプション）',
                  },
                },
                required: ['account_item_id', 'tax_code', 'amount', 'entry_side'],
              },
            },
          },
          required: ['issue_date', 'type', 'details'],
        },
      },
      {
        name: 'test-connection',
        description: 'freee API への接続をテストします',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update-deal',
        description: '既存の取引を更新します（事業所ID: 2067140固定）',
        inputSchema: {
          type: 'object',
          properties: {
            deal_id: {
              type: 'number',
              description: '取引ID',
            },
            issue_date: {
              type: 'string',
              description: '取引日（YYYY-MM-DD形式）',
            },
            partner_id: {
              type: 'number',
              description: '取引先ID（オプション）',
            },
            ref_number: {
              type: 'string',
              description: '管理番号（オプション）',
            },
            details: {
              type: 'array',
              description: '取引明細',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
                    description: '明細ID（更新時）',
                  },
                  account_item_id: {
                    type: 'number',
                    description: '勘定科目ID',
                  },
                  tax_code: {
                    type: 'number',
                    description: '税区分コード',
                  },
                  amount: {
                    type: 'number',
                    description: '金額',
                  },
                  entry_side: {
                    type: 'string',
                    enum: ['credit', 'debit'],
                    description: '貸借区分（credit: 貸方, debit: 借方）',
                  },
                  description: {
                    type: 'string',
                    description: '備考（オプション）',
                  },
                },
                required: ['account_item_id', 'tax_code', 'amount', 'entry_side'],
              },
            },
          },
          required: ['deal_id'],
        },
      },
      {
        name: 'create-partner',
        description: '新しい取引先を作成します（事業所ID: 2067140固定）',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '取引先名',
            },
            shortcut1: {
              type: 'string',
              description: 'ショートカット1（オプション）',
            },
            shortcut2: {
              type: 'string',
              description: 'ショートカット2（オプション）',
            },
            long_name: {
              type: 'string',
              description: '正式名称（オプション）',
            },
            name_kana: {
              type: 'string',
              description: 'カナ名称（オプション）',
            },
            phone: {
              type: 'string',
              description: '電話番号（オプション）',
            },
            email: {
              type: 'string',
              description: 'メールアドレス（オプション）',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'create-account-item',
        description: '新しい勘定科目を作成します（事業所ID: 2067140固定）',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: '勘定科目名',
            },
            tax_code: {
              type: 'number',
              description: '税区分コード',
            },
            account_category_id: {
              type: 'number',
              description: '勘定科目カテゴリID',
            },
            shortcut: {
              type: 'string',
              description: 'ショートカット（オプション）',
            },
          },
          required: ['name', 'tax_code', 'account_category_id'],
        },
      },
      {
        name: 'get-rate-limit-info',
        description: 'freee API のレート制限情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-logs',
        description: 'システムログを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            level: {
              type: 'string',
              enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
              description: 'ログレベル（指定したレベル以上のログを取得）',
            },
            limit: {
              type: 'number',
              description: '取得するログの最大数（デフォルト: 100）',
            },
          },
        },
      },
      {
        name: 'get-metrics',
        description: 'システムメトリクスを取得します',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['performance', 'system', 'summary'],
              description: 'メトリクスの種類',
            },
            since: {
              type: 'number',
              description: '指定した時刻以降のメトリクスを取得（Unix timestamp）',
            },
          },
        },
      },
      {
        name: 'get-health',
        description: 'システムヘルスチェックを実行します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get-cache-stats',
        description: 'キャッシュ統計情報を取得します',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'clear-cache',
        description: 'キャッシュをクリアします',
        inputSchema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'キャッシュクリアの確認（true必須）',
            },
          },
          required: ['confirm'],
        },
      },
      {
        name: 'get-deals',
        description: '取引一覧を取得します',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: '開始日（YYYY-MM-DD形式、オプション）',
            },
            end_date: {
              type: 'string',
              description: '終了日（YYYY-MM-DD形式、オプション）',
            },
            year: {
              type: 'number',
              description: '年（YYYY形式、月と組み合わせて使用）',
            },
            month: {
              type: 'number',
              description: '月（1-12、年と組み合わせて使用）',
            },
            limit: {
              type: 'number',
              description: '取得件数の上限（デフォルト: 100）',
            },
            offset: {
              type: 'number',
              description: '取得開始位置（デフォルト: 0）',
            },
          },
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const startTime = Date.now();

  try {
    switch (name) {
      case 'generate-auth-url': {
        if (!useOAuth || !oauthClient) {
          return {
            content: [
              {
                type: 'text',
                text: 'OAuth認証が設定されていません。FREEE_ACCESS_TOKENを使用している場合、このツールは不要です。',
              },
            ],
          };
        }
        const state = args?.state as string | undefined;
        const authUrl = oauthClient.generateAuthUrl(state);
        return {
          content: [
            {
              type: 'text',
              text: `認証URL: ${authUrl}\n\nこのURLにアクセスしてfreeeアカウントで認証を行ってください。`,
            },
          ],
        };
      }

      case 'exchange-auth-code': {
        if (!useOAuth || !oauthClient) {
          return {
            content: [
              {
                type: 'text',
                text: 'OAuth認証が設定されていません。FREEE_ACCESS_TOKENを使用している場合、このツールは不要です。',
              },
            ],
          };
        }
        const code = args?.code as string;
        if (!code) {
          throw new Error('認証コードが必要です');
        }

        const tokens = await oauthClient.exchangeCodeForTokens(code);
        return {
          content: [
            {
              type: 'text',
              text: `認証が完了しました。\nアクセストークンの有効期限: ${new Date((tokens.created_at + tokens.expires_in) * 1000).toLocaleString()}`,
            },
          ],
        };
      }

      case 'check-auth-status': {
        if (useDirectToken) {
          return {
            content: [
              {
                type: 'text',
                text: `認証済み（直接トークン認証）\n認証方式: ACCESS_TOKEN`,
              },
            ],
          };
        } else if (useOAuth && oauthClient) {
          const authState = oauthClient.getAuthState();
          if (authState.isAuthenticated) {
            const expiresAt = authState.expiresAt ? new Date(authState.expiresAt * 1000).toLocaleString() : '不明';
            return {
              content: [
                {
                  type: 'text',
                  text: `認証済み（OAuth認証）\nトークン有効期限: ${expiresAt}`,
                },
              ],
            };
          } else {
            return {
              content: [
                {
                  type: 'text',
                  text: '未認証です。generate-auth-url ツールを使用して認証を開始してください。',
                },
              ],
            };
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: '認証設定が不正です。FREEE_ACCESS_TOKEN または OAuth設定（FREEE_CLIENT_ID, FREEE_CLIENT_SECRET）を設定してください。',
              },
            ],
          };
        }
      }

      case 'get-companies': {
        // 認証状態をチェック
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: '認証が必要です',
                  message: 'まず認証を完了してください。',
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }

        try {
          // 事業所一覧を取得
          const companiesResponse = await freeeClient.get('/api/1/companies');
          const rawData = companiesResponse.data as any;
          const companies = rawData?.companies || rawData || [];

          if (companies.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    companies: [],
                    message: '利用可能な事業所が見つかりませんでした。',
                    current_company_id: getCompanyId(),
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  companies: companies,
                  current_company_id: getCompanyId(),
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: '事業所一覧取得エラー',
                  message: error.message,
                  status: error.response?.status,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'create-deal': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          throw new Error('認証が必要です。まず認証を完了してください。');
        }

        const dealData = args as unknown as CreateDealRequest;

        // 固定のcompany_idを設定
        dealData.company_id = getCompanyId();

        // 必須フィールドの検証
        if (!dealData.issue_date || !dealData.type || !dealData.details) {
          throw new Error('必須フィールドが不足しています。');
        }

        if (!Array.isArray(dealData.details) || dealData.details.length === 0) {
          throw new Error('取引明細が必要です。');
        }

        // 日付形式の検証
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dealData.issue_date)) {
          throw new Error('取引日はYYYY-MM-DD形式で入力してください。');
        }

        try {
          // freee API に取引を作成
          const response = await freeeClient.post(`/api/1/deals`, dealData);
          const deal = response.data as any;

          return {
            content: [
              {
                type: 'text',
                text: `取引が正常に作成されました。\n取引ID: ${deal.id}\n取引日: ${deal.issue_date}\n金額: ${deal.amount}円`,
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`取引作成エラー: ${error.message}`);
        }
      }

      case 'test-connection': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: '認証が必要です。まず認証を完了してください。',
              },
            ],
          };
        }

        try {
          // 事業所一覧を取得してAPIの接続をテスト
          const companies = await freeeClient.get('/api/1/companies');
          const companiesData = companies.data as any[];
          return {
            content: [
              {
                type: 'text',
                text: `freee API への接続テストが成功しました。\n取得した事業所数: ${companiesData?.length || 0}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `API接続エラー: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'update-deal': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: '認証が必要です。まず認証を完了してください。',
              },
            ],
          };
        }

        const { deal_id, issue_date, partner_id, ref_number, details } = args as any;
        const company_id = getCompanyId();

        if (!deal_id) {
          throw new Error('deal_id は必須です');
        }

        try {
          const updateData: any = {};
          if (issue_date) updateData.issue_date = issue_date;
          if (partner_id) updateData.partner_id = partner_id;
          if (ref_number) updateData.ref_number = ref_number;
          if (details) updateData.details = details;

          const response = await freeeClient.put(`/api/1/deals/${deal_id}`, updateData);
          return {
            content: [
              {
                type: 'text',
                text: `取引が正常に更新されました。\n取引ID: ${deal_id}`,
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`取引更新エラー: ${error.message}`);
        }
      }

      case 'create-partner': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: '認証が必要です。まず認証を完了してください。',
              },
            ],
          };
        }

        const { name, shortcut1, shortcut2, long_name, name_kana, phone, email } = args as any;
        const company_id = getCompanyId();

        if (!name) {
          throw new Error('name は必須です');
        }

        try {
          const partnerData: any = {
            company_id,
            name,
          };
          if (shortcut1) partnerData.shortcut1 = shortcut1;
          if (shortcut2) partnerData.shortcut2 = shortcut2;
          if (long_name) partnerData.long_name = long_name;
          if (name_kana) partnerData.name_kana = name_kana;
          if (phone) partnerData.phone = phone;
          if (email) partnerData.email = email;

          const response = await freeeClient.post('/api/1/partners', partnerData);
          const partner = response.data as any;
          return {
            content: [
              {
                type: 'text',
                text: `取引先が正常に作成されました。\n取引先ID: ${partner.id}\n取引先名: ${partner.name}`,
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`取引先作成エラー: ${error.message}`);
        }
      }

      case 'create-account-item': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          return {
            content: [
              {
                type: 'text',
                text: '認証が必要です。まず認証を完了してください。',
              },
            ],
          };
        }

        const { name, tax_code, account_category_id, shortcut } = args as any;
        const company_id = getCompanyId();

        if (!name || tax_code === undefined || !account_category_id) {
          throw new Error('name, tax_code, account_category_id は必須です');
        }

        try {
          const accountItemData: any = {
            company_id,
            name,
            tax_code,
            account_category_id,
          };
          if (shortcut) accountItemData.shortcut = shortcut;

          const response = await freeeClient.post('/api/1/account_items', accountItemData);
          const accountItem = response.data as any;
          return {
            content: [
              {
                type: 'text',
                text: `勘定科目が正常に作成されました。\n勘定科目ID: ${accountItem.id}\n勘定科目名: ${accountItem.name}`,
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`勘定科目作成エラー: ${error.message}`);
        }
      }

      case 'get-rate-limit-info': {
        const rateLimitInfo = freeeClient.getRateLimitInfo();

        if (!rateLimitInfo) {
          return {
            content: [
              {
                type: 'text',
                text: 'レート制限情報はまだ利用できません。APIリクエストを実行後に再度確認してください。',
              },
            ],
          };
        }

        const resetTime = new Date(rateLimitInfo.resetTime).toLocaleString();
        return {
          content: [
            {
              type: 'text',
              text: `freee API レート制限情報:
制限数: ${rateLimitInfo.limit}
残り: ${rateLimitInfo.remaining}
リセット時刻: ${resetTime}

使用率: ${((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit * 100).toFixed(1)}%`,
            },
          ],
        };
      }

      case 'get-logs': {
        const { level, limit } = args as any;

        let logLevel;
        if (level) {
          const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
          logLevel = LogLevel[level as keyof typeof LogLevel];
        }

        const logs = logger.getLogs(logLevel);
        const limitedLogs = logs.slice(-(limit || 100));

        const logText = limitedLogs.map((log: any) => {
          const levelName = ['DEBUG', 'INFO', 'WARN', 'ERROR'][log.level];
          const context = log.context ? ` | ${JSON.stringify(log.context)}` : '';
          const error = log.error ? ` | Error: ${log.error.message}` : '';
          return `[${log.timestamp}] [${levelName}] ${log.message}${context}${error}`;
        }).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `システムログ (最新${limitedLogs.length}件):

${logText || 'ログがありません'}`,
            },
          ],
        };
      }

      case 'get-metrics': {
        const { type, since } = args as any;

        let metricsData;
        switch (type) {
          case 'performance':
            metricsData = metricsCollector.getPerformanceMetrics();
            break;
          case 'system':
            metricsData = metricsCollector.getSystemMetrics();
            break;
          case 'summary':
            metricsData = metricsCollector.getMetricsSummary(since);
            break;
          default:
            metricsData = {
              performance: metricsCollector.getPerformanceMetrics(),
              system: metricsCollector.getSystemMetrics(),
              summary: metricsCollector.getMetricsSummary(since),
            };
        }

        return {
          content: [
            {
              type: 'text',
              text: `システムメトリクス${type ? ` (${type})` : ''}:

${JSON.stringify(metricsData, null, 2)}`,
            },
          ],
        };
      }

      case 'get-health': {
        const healthResults = await healthChecks.runAllChecks();
        const isHealthy = Object.values(healthResults).every(result => result);

        return {
          content: [
            {
              type: 'text',
              text: `システムヘルスチェック結果:

全体ステータス: ${isHealthy ? '✅ 正常' : '❌ 異常'}

個別チェック:
${Object.entries(healthResults).map(([name, result]) =>
  `- ${name}: ${result ? '✅ 正常' : '❌ 異常'}`
).join('\n')}

アクティブアラート: 0件`,
            },
          ],
        };
      }

      case 'get-cache-stats': {
        const cacheStats = freeeClient.getCacheStats();

        if (!cacheStats) {
          return {
            content: [
              {
                type: 'text',
                text: 'キャッシュが無効になっています。',
              },
            ],
          };
        }

        const hitRate = (cacheStats.hitRate * 100).toFixed(1);
        const oldestAge = cacheStats.oldestEntry ?
          Math.floor((Date.now() - cacheStats.oldestEntry) / 1000) : 0;

        return {
          content: [
            {
              type: 'text',
              text: `キャッシュ統計情報:

サイズ: ${cacheStats.size}エントリ
ヒット数: ${cacheStats.hits}
ミス数: ${cacheStats.misses}
ヒット率: ${hitRate}%
最古エントリ: ${oldestAge}秒前`,
            },
          ],
        };
      }

      case 'clear-cache': {
        const { confirm } = args as any;

        if (!confirm) {
          return {
            content: [
              {
                type: 'text',
                text: 'キャッシュクリアには確認が必要です。confirm: true を指定してください。',
              },
            ],
          };
        }

        freeeClient.clearCache();
        SecurityAuditor.log('cache_cleared', 'low', { timestamp: Date.now() });

        return {
          content: [
            {
              type: 'text',
              text: 'キャッシュが正常にクリアされました。',
            },
          ],
        };
      }

      case 'get-deals': {
        const authCheck = checkAuthenticationStatus();
        if (!authCheck.isAuthenticated) {
          throw new Error('認証が必要です。まず認証を完了してください。');
        }

        const { start_date, end_date, year, month, limit, offset } = args as any;
        const companyId = getCompanyId();

        try {
          let startDate: string;
          let endDate: string;

          // 日付範囲の決定
          if (year && month) {
            // 年月指定の場合
            const dateRange = getMonthDateRange(year, month);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
          } else if (start_date && end_date) {
            // 開始日・終了日指定の場合
            startDate = start_date;
            endDate = end_date;
          } else {
            // デフォルト（過去30日）
            const dateRange = getDateRange();
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
          }

          // パラメータの構築
          const params = new URLSearchParams({
            company_id: companyId.toString(),
            start_issue_date: startDate,
            end_issue_date: endDate,
            limit: (limit || appConfig.defaultDealsLimit).toString(),
            offset: (offset || 0).toString(),
          });

          // 取引一覧を取得
          const response = await freeeClient.get(`/api/1/deals?${params.toString()}`);

          // freee APIのレスポンス形式に対応
          let deals: any[] = [];
          if (response.data) {
            const data = response.data as any;
            if (Array.isArray(data)) {
              deals = data;
            } else if (data.deals && Array.isArray(data.deals)) {
              deals = data.deals;
            } else if (data.data && Array.isArray(data.data)) {
              deals = data.data;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `取引一覧を取得しました。

期間: ${startDate} ～ ${endDate}
事業所ID: ${companyId}
取得件数: ${deals.length}件

取引データ:
${deals.length > 0 ? JSON.stringify(deals, null, 2) : '取引データがありません'}`,
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`取引一覧取得エラー: ${error.message}`);
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(responseTime, true);
    // logger.error('Tool execution error', { toolName: name, args, error: error.message }, error);

    return {
      content: [
        {
          type: 'text',
          text: `エラー: ${error.message}${error.retryable ? '\n\nこのエラーはリトライ可能です。' : ''}`,
        },
      ],
      isError: true,
    };
  } finally {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(responseTime, false);
  }
});

// プロンプト一覧の取得
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'setup-guide',
        description: 'freee会計 MCP Server のセットアップガイド',
      },
      {
        name: 'transaction-entry',
        description: '取引入力支援プロンプト - 取引の入力方法をガイドします',
        arguments: [
          {
            name: 'transaction_type',
            description: '取引タイプ（income: 収入, expense: 支出）',
            required: false,
          },
          {
            name: 'amount',
            description: '取引金額',
            required: false,
          },
        ],
      },
      {
        name: 'monthly-closing',
        description: '月次決算チェックリスト - 月次決算の手順をガイドします',
        arguments: [
          {
            name: 'target_month',
            description: '対象月（YYYY-MM形式）',
            required: false,
          },
        ],
      },
      {
        name: 'trial-balance-analysis',
        description: '試算表分析ガイド - 試算表の見方と分析方法をガイドします',
        arguments: [
          {
            name: 'focus_area',
            description: '分析したい領域（assets: 資産, liabilities: 負債, equity: 純資産, income: 収益, expenses: 費用）',
            required: false,
          },
        ],
      },
    ],
  };
});

// プロンプトの取得
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'setup-guide') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'freee会計 MCP Server のセットアップ方法を教えてください。',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `freee会計 MCP Server のセットアップ手順：

## 認証方式の選択

### 方式1: 直接トークン認証（推奨）
1. 環境変数の設定
   - FREEE_ACCESS_TOKEN: freee APIのアクセストークン

### 方式2: OAuth認証
1. 環境変数の設定
   - FREEE_CLIENT_ID: freeeアプリのクライアントID
   - FREEE_CLIENT_SECRET: freeeアプリのクライアントシークレット
   - FREEE_REDIRECT_URI: リダイレクトURI

2. OAuth認証の実行
   - generate-auth-url ツールで認証URLを生成
   - 認証URLにアクセスして認証コードを取得
   - exchange-auth-code ツールで認証コードをアクセストークンに交換

## 共通設定
- FREEE_API_BASE_URL: freee APIのベースURL（オプション、デフォルト: https://api.freee.co.jp）

## MCP Serverの起動
設定完了後、MCP Serverが利用可能になります。

詳細は README.md をご確認ください。`,
          },
        },
      ],
    };
  }

  if (name === 'transaction-entry') {
    const transactionType = args?.transaction_type as string;
    const amount = args?.amount;

    let contextText = '取引入力の支援をします。';
    if (transactionType) {
      contextText += `\n取引タイプ: ${transactionType === 'income' ? '収入' : '支出'}`;
    }
    if (typeof amount === 'number') {
      contextText += `\n金額: ${(amount as number).toLocaleString()}円`;
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${contextText}\n\n取引入力の手順を教えてください。`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `freee会計での取引入力手順：

1. 取引の基本情報を確認
   - 取引日（issue_date）
   - 取引タイプ（income: 収入 / expense: 支出）
   - 取引先（partner_id）※任意
   - 管理番号（ref_number）※任意

2. 取引明細の設定
   - 勘定科目（account_item_id）
   - 税区分（tax_code）
   - 金額（amount）
   - 貸借区分（entry_side: credit/debit）
   - 備考（description）※任意

3. 複式簿記の原則
   - 借方と貸方の合計金額が一致する必要があります
   - 収入取引: 現金・預金（借方）+ 売上等（貸方）
   - 支出取引: 費用等（借方）+ 現金・預金（貸方）

4. create-deal ツールを使用して取引を作成

利用可能なリソース:
- account-items://list で勘定科目一覧を確認
- partners://list で取引先一覧を確認

${transactionType ? `\n現在の取引タイプ（${transactionType === 'income' ? '収入' : '支出'}）に適した勘定科目を選択してください。` : ''}`,
          },
        },
      ],
    };
  }

  if (name === 'monthly-closing') {
    const targetMonth = args?.target_month as string;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${targetMonth ? `${targetMonth}の` : ''}月次決算の手順を教えてください。`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `月次決算チェックリスト${targetMonth ? `（${targetMonth}）` : ''}：

1. 取引入力の完了確認
   - 当月分の全ての取引が入力済みか確認
   - deals://list で取引一覧を確認
   - 未入力の領収書・請求書がないか確認

2. 残高確認
   - 現金・預金残高の実際残高との照合
   - 売掛金・買掛金の残高確認
   - 在庫の棚卸（該当する場合）

3. 試算表の確認
   - trial-balance://current で試算表を取得
   - 貸借対照表の借方・貸方の一致確認
   - 損益計算書の数値確認

4. 調整仕訳の検討
   - 減価償却費の計上
   - 前払費用・未払費用の調整
   - 引当金の設定

5. 月次レポートの作成
   - 売上・利益の前月比較
   - 主要な費用項目の分析
   - キャッシュフローの確認

6. 次月への準備
   - 請求書の発行準備
   - 支払予定の確認

利用可能なツール:
- deals://list で取引確認
- trial-balance://current で試算表確認
- partners://list で取引先確認`,
          },
        },
      ],
    };
  }

  if (name === 'trial-balance-analysis') {
    const focusArea = args?.focus_area as string;

    let analysisText = '試算表の分析方法をガイドします。';
    if (focusArea) {
      const areaNames: { [key: string]: string } = {
        assets: '資産',
        liabilities: '負債',
        equity: '純資産',
        income: '収益',
        expenses: '費用',
      };
      analysisText += `\n分析対象: ${areaNames[focusArea] || focusArea}`;
    }

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${analysisText}\n\n試算表の見方と分析のポイントを教えてください。`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `試算表分析ガイド${focusArea ? `（${focusArea}重点）` : ''}：

1. 試算表の基本構造
   - 貸借対照表（B/S）: 資産・負債・純資産
   - 損益計算書（P/L）: 収益・費用

2. 分析のポイント

【資産の分析】
- 流動資産: 現金・売掛金・在庫の適正性
- 固定資産: 設備投資の効果と減価償却
- 売掛金回転率: 売上÷平均売掛金残高

【負債の分析】
- 流動負債: 支払能力の確認
- 固定負債: 長期的な返済計画
- 負債比率: 負債÷総資産

【純資産の分析】
- 自己資本比率: 純資産÷総資産
- 利益剰余金の推移

【収益の分析】
- 売上高の前年同月比
- 売上総利益率: （売上-売上原価）÷売上
- 主要顧客・商品別の売上構成

【費用の分析】
- 変動費と固定費の区分
- 費用率: 各費用÷売上高
- 前年同月との比較

3. 重要な財務指標
- 流動比率: 流動資産÷流動負債（120%以上が目安）
- 当座比率: （現金+売掛金）÷流動負債
- ROA: 当期純利益÷総資産
- ROE: 当期純利益÷純資産

4. 異常値のチェック
- 前月・前年同月との大幅な変動
- 業界平均との比較
- 予算との差異分析

利用方法:
- trial-balance://current で最新の試算表を取得
- 各勘定科目の残高推移を確認
- 必要に応じて取引明細を deals://list で確認

${focusArea === 'assets' ? '\n【資産重点分析】\n- 現金・預金の適正水準\n- 売掛金の回収状況\n- 在庫の回転率' : ''}
${focusArea === 'liabilities' ? '\n【負債重点分析】\n- 支払サイトの管理\n- 借入金の返済計画\n- 資金繰りの安全性' : ''}
${focusArea === 'income' ? '\n【収益重点分析】\n- 売上の成長性\n- 収益性の改善\n- 売上構成の変化' : ''}
${focusArea === 'expenses' ? '\n【費用重点分析】\n- コスト構造の把握\n- 費用削減の機会\n- 効率性の向上' : ''}`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  const authMode = useDirectToken ? '直接トークン認証' : useOAuth ? 'OAuth認証' : '認証未設定';
  console.error(`freee会計 MCP Server が起動しました (認証方式: ${authMode})`);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
