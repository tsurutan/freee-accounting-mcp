/**
 * freee会計 MCP Server 設定
 */

export interface FreeeConfig {
  /** 固定の事業所ID */
  companyId: number;
  /** APIベースURL */
  baseUrl: string;
  /** デフォルトの取引取得期間（日数） */
  defaultDealsPeriodDays: number;
  /** デフォルトの取引取得件数 */
  defaultDealsLimit: number;
}

/**
 * freee会計 MCP Server設定
 */
export const config: FreeeConfig = {
  // 固定の事業所ID
  companyId: 2067140,
  
  // APIベースURL
  baseUrl: process.env.FREEE_API_BASE_URL || 'https://api.freee.co.jp',
  
  // デフォルトの取引取得期間（30日）
  defaultDealsPeriodDays: 30,
  
  // デフォルトの取引取得件数
  defaultDealsLimit: 100,
};

/**
 * 設定値を取得
 */
export function getConfig(): FreeeConfig {
  return config;
}

/**
 * 事業所IDを取得
 */
export function getCompanyId(): number {
  return config.companyId;
}

/**
 * 日付範囲を生成（YYYY-MM-DD形式）
 */
export function getDateRange(days: number = config.defaultDealsPeriodDays): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  
  return {
    startDate: startDate.toISOString().split('T')[0]!,
    endDate: endDate.toISOString().split('T')[0]!,
  };
}

/**
 * 年月を指定して日付範囲を生成
 */
export function getMonthDateRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  // UTCで日付を作成してタイムゾーンの影響を避ける
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0)); // 翌月の0日 = 当月の最終日

  return {
    startDate: startDate.toISOString().split('T')[0]!,
    endDate: endDate.toISOString().split('T')[0]!,
  };
}
