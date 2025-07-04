/**
 * freee会計 MCP Server 設定（後方互換性ラッパー）
 *
 * @deprecated 新しいコードでは AppConfig と DateUtils を使用してください
 */

import { container } from './container/container.js';
import { TYPES } from './container/types.js';
import { AppConfig } from './config/app-config.js';
import { DateUtils } from './utils/date-utils.js';

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

// DIコンテナから新しい設定クラスを取得
const appConfig = container.get<AppConfig>(TYPES.AppConfig);
const dateUtils = container.get<DateUtils>(TYPES.DateUtils);

/**
 * freee会計 MCP Server設定（後方互換性のため）
 * @deprecated AppConfig を直接使用してください
 */
export const config: FreeeConfig = {
  companyId: appConfig.companyId,
  baseUrl: appConfig.baseUrl,
  defaultDealsPeriodDays: appConfig.defaultDealsPeriodDays,
  defaultDealsLimit: appConfig.defaultDealsLimit,
};

/**
 * 設定値を取得
 * @deprecated AppConfig を直接使用してください
 */
export function getConfig(): FreeeConfig {
  return {
    companyId: appConfig.companyId,
    baseUrl: appConfig.baseUrl,
    defaultDealsPeriodDays: appConfig.defaultDealsPeriodDays,
    defaultDealsLimit: appConfig.defaultDealsLimit,
  };
}

/**
 * 事業所IDを取得
 * @deprecated AppConfig.companyId を直接使用してください
 */
export function getCompanyId(): number {
  return appConfig.companyId;
}

/**
 * 日付範囲を生成（YYYY-MM-DD形式）
 * @deprecated DateUtils.getDateRange を使用してください
 */
export function getDateRange(days: number = appConfig.defaultDealsPeriodDays): {
  startDate: string;
  endDate: string;
} {
  return dateUtils.getDateRange(days);
}

/**
 * 年月を指定して日付範囲を生成
 * @deprecated DateUtils.getMonthDateRange を使用してください
 */
export function getMonthDateRange(year: number, month: number): {
  startDate: string;
  endDate: string;
} {
  return dateUtils.getMonthDateRange(year, month);
}
