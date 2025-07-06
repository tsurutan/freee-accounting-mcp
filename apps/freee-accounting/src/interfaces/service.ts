/**
 * サービスインターフェース
 *
 * アプリケーションサービスの統一インターフェース定義
 */

import { Result } from 'neverthrow';

// インターフェースレジストリ（実行時にアクセス可能）
export const SERVICE_INTERFACES = {
  IBaseService: 'IBaseService',
  IAuthService: 'IAuthService',
  ICompanyService: 'ICompanyService',
  IDealService: 'IDealService',
  IAccountItemService: 'IAccountItemService',
  IPartnerService: 'IPartnerService',
  IHealthService: 'IHealthService',
  ICacheService: 'ICacheService',
  IServiceFactory: 'IServiceFactory',
} as const;
import {
  Company,
  Deal,
  AccountItem,
  Partner,
  Section,
  Item,
  Tag,
  TrialBalance,
  DealFilter,
  DealCreateRequest,
  DealUpdateRequest,
  CompanyContext
} from '../types/domain.js';
import {
  OAuthTokenResponse,
  AuthContext,
  ApiResponse,
  HttpError
} from '../types/api.js';
import { AppError } from '../utils/error-handler.js';
import { OAuthTokens } from '../services/auth-service.js';

/**
 * 基本サービスインターフェース
 */
export interface IBaseService {
  /**
   * サービスの名前を取得
   */
  getName(): string;

  /**
   * サービスの説明を取得
   */
  getDescription(): string;

  /**
   * サービスの健全性をチェック
   */
  healthCheck(): Promise<Result<ServiceHealthStatus, AppError>>;

  /**
   * サービスの統計情報を取得
   */
  getStats(): Promise<ServiceStats>;
}

/**
 * サービス健全性状況
 */
export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * サービス統計情報
 */
export interface ServiceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestAt?: Date;
}

/**
 * 認証サービスインターフェース
 */
export interface IAuthService extends IBaseService {
  /**
   * OAuth認証URLを生成
   */
  generateAuthUrl(redirectUri: string, state?: string): Result<string, AppError>;

  /**
   * 認証コードをアクセストークンに交換
   */
  exchangeCodeForToken(code: string, redirectUri: string): Promise<Result<OAuthTokens, AppError>>;

  /**
   * リフレッシュトークンでアクセストークンを更新
   */
  refreshToken(refreshToken: string): Promise<Result<OAuthTokens, AppError>>;

  /**
   * 現在の認証コンテキストを取得
   */
  getAuthContext(): AuthContext;

  /**
   * 認証コンテキストを設定
   */
  setAuthContext(context: AuthContext): void;

  /**
   * 認証状態をチェック
   */
  isAuthenticated(): boolean;

  /**
   * トークンの有効性をチェック
   */
  validateToken(token: string): Promise<Result<boolean, AppError>>;

  /**
   * ログアウト
   */
  logout(): Promise<Result<void, AppError>>;
}

/**
 * 事業所サービスインターフェース
 */
export interface ICompanyService extends IBaseService {
  /**
   * 事業所一覧を取得
   */
  getCompanies(): Promise<Result<Company[], AppError>>;

  /**
   * 指定された事業所の詳細を取得
   */
  getCompany(companyId: number): Promise<Result<Company, AppError>>;

  /**
   * 事業所コンテキストを設定
   */
  setCompanyContext(context: CompanyContext): void;

  /**
   * 現在の事業所コンテキストを取得
   */
  getCompanyContext(): CompanyContext | null;
}

/**
 * 取引サービスインターフェース
 */
export interface IDealService extends IBaseService {
  /**
   * 取引一覧を取得
   */
  getDeals(filter?: DealFilter): Promise<Result<Deal[], AppError>>;

  /**
   * 指定された取引の詳細を取得
   */
  getDeal(dealId: number): Promise<Result<Deal, AppError>>;

  /**
   * 新しい取引を作成
   */
  createDeal(request: DealCreateRequest): Promise<Result<Deal, AppError>>;

  /**
   * 取引を更新
   */
  updateDeal(dealId: number, request: DealUpdateRequest): Promise<Result<Deal, AppError>>;

  /**
   * 取引を削除
   */
  deleteDeal(dealId: number): Promise<Result<void, AppError>>;

  /**
   * 取引の検索
   */
  searchDeals(query: string, filter?: DealFilter): Promise<Result<Deal[], AppError>>;
}

/**
 * 勘定科目サービスインターフェース
 */
export interface IAccountItemService extends IBaseService {
  /**
   * 勘定科目一覧を取得
   */
  getAccountItems(companyId: number, baseDate?: string): Promise<Result<AccountItem[], AppError>>;

  /**
   * 指定された勘定科目の詳細を取得
   */
  getAccountItem(companyId: number, accountItemId: number): Promise<Result<AccountItem, AppError>>;

  /**
   * 勘定科目の検索
   */
  searchAccountItems(companyId: number, query: string): Promise<Result<AccountItem[], AppError>>;
}

/**
 * 取引先サービスインターフェース
 */
export interface IPartnerService extends IBaseService {
  /**
   * 取引先一覧を取得
   */
  getPartners(companyId: number, offset?: number, limit?: number): Promise<Result<Partner[], AppError>>;

  /**
   * 指定された取引先の詳細を取得
   */
  getPartner(companyId: number, partnerId: number): Promise<Result<Partner, AppError>>;

  /**
   * 取引先の検索
   */
  searchPartners(companyId: number, keyword: string): Promise<Result<Partner[], AppError>>;
}

/**
 * 部門サービスインターフェース
 */
export interface ISectionService extends IBaseService {
  /**
   * 部門一覧を取得
   */
  getSections(companyId: number): Promise<Result<Section[], AppError>>;

  /**
   * 指定された部門の詳細を取得
   */
  getSection(companyId: number, sectionId: number): Promise<Result<Section, AppError>>;
}

/**
 * 品目サービスインターフェース
 */
export interface IItemService extends IBaseService {
  /**
   * 品目一覧を取得
   */
  getItems(companyId: number): Promise<Result<Item[], AppError>>;

  /**
   * 指定された品目の詳細を取得
   */
  getItem(companyId: number, itemId: number): Promise<Result<Item, AppError>>;
}

/**
 * メモタグサービスインターフェース
 */
export interface ITagService extends IBaseService {
  /**
   * メモタグ一覧を取得
   */
  getTags(companyId: number): Promise<Result<Tag[], AppError>>;

  /**
   * 指定されたメモタグの詳細を取得
   */
  getTag(companyId: number, tagId: number): Promise<Result<Tag, AppError>>;
}

/**
 * 試算表サービスインターフェース
 */
export interface ITrialBalanceService extends IBaseService {
  /**
   * 試算表を取得
   */
  getTrialBalance(companyId: number, params?: TrialBalanceParams): Promise<Result<TrialBalanceResult, AppError>>;

  /**
   * 貸借対照表を取得
   */
  getBalanceSheet(companyId: number, params?: TrialBalanceParams): Promise<Result<TrialBalance, AppError>>;

  /**
   * 損益計算書を取得
   */
  getProfitAndLoss(companyId: number, params?: TrialBalanceParams): Promise<Result<TrialBalance, AppError>>;
}

/**
 * 試算表パラメータ
 */
export interface TrialBalanceParams {
  fiscalYear?: number;
  startMonth?: number;
  endMonth?: number;
  startDate?: string;
  endDate?: string;
  accountItemDisplayType?: 'account_item' | 'group';
  breakdownDisplayType?: 'partner' | 'item' | 'section' | 'account_item';
  partnerId?: number;
  partnerCode?: string;
  itemId?: number;
  sectionId?: number;
  adjustment?: 'only' | 'without';
  costAllocation?: 'only' | 'without';
  approved?: 'only' | 'without';
}

/**
 * 試算表結果
 */
export interface TrialBalanceResult {
  balanceSheet: TrialBalance;
  profitAndLoss: TrialBalance;
  generatedAt: Date;
  period: {
    start: string;
    end: string;
  };
}

/**
 * ヘルスサービスインターフェース
 */
export interface IHealthService extends IBaseService {
  /**
   * システム全体の健全性をチェック
   */
  checkSystemHealth(): Promise<Result<SystemHealthStatus, AppError>>;

  /**
   * freee API接続の健全性をチェック
   */
  checkFreeeApiHealth(): Promise<Result<ApiHealthStatus, AppError>>;

  /**
   * 認証状態の健全性をチェック
   */
  checkAuthHealth(): Promise<Result<AuthHealthStatus, AppError>>;

  /**
   * データベース接続の健全性をチェック
   */
  checkDatabaseHealth(): Promise<Result<DatabaseHealthStatus, AppError>>;
}

/**
 * システム健全性状況
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealthStatus>;
  uptime: number;
  version: string;
  timestamp: Date;
}

/**
 * API健全性状況
 */
export interface ApiHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastSuccessfulRequest?: Date;
  errorRate: number;
  rateLimitRemaining?: number;
}

/**
 * 認証健全性状況
 */
export interface AuthHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  isAuthenticated: boolean;
  tokenExpiresAt?: Date;
  lastAuthCheck?: Date;
}

/**
 * データベース健全性状況
 */
export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionCount: number;
  responseTime: number;
  lastQuery?: Date;
}

/**
 * キャッシュサービスインターフェース
 */
export interface ICacheService extends IBaseService {
  /**
   * キャッシュに値を設定
   */
  set<T>(key: string, value: T, ttl?: number): Promise<Result<void, AppError>>;

  /**
   * キャッシュから値を取得
   */
  get<T>(key: string): Promise<Result<T | null, AppError>>;

  /**
   * キャッシュから値を削除
   */
  delete(key: string): Promise<Result<void, AppError>>;

  /**
   * キャッシュをクリア
   */
  clear(): Promise<Result<void, AppError>>;

  /**
   * キャッシュの存在チェック
   */
  exists(key: string): Promise<Result<boolean, AppError>>;

  /**
   * キャッシュの統計情報を取得
   */
  getCacheStats(): Promise<ServiceCacheStats>;
}

/**
 * サービスキャッシュ統計情報
 */
export interface ServiceCacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * サービスファクトリーインターフェース
 */
export interface IServiceFactory {
  /**
   * 認証サービスを作成
   */
  createAuthService(): IAuthService;

  /**
   * 事業所サービスを作成
   */
  createCompanyService(): ICompanyService;

  /**
   * 取引サービスを作成
   */
  createDealService(): IDealService;

  /**
   * 勘定科目サービスを作成
   */
  createAccountItemService(): IAccountItemService;

  /**
   * 取引先サービスを作成
   */
  createPartnerService(): IPartnerService;

  /**
   * ヘルスサービスを作成
   */
  createHealthService(): IHealthService;

  /**
   * キャッシュサービスを作成
   */
  createCacheService(): ICacheService;
}
