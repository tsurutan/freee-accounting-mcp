/**
 * アプリケーション設定
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types.js';
import { EnvironmentConfig } from './environment-config.js';

/**
 * アプリケーション設定の型定義
 */
export interface AppConfigData {
  /** 固定の事業所ID */
  companyId: number;
  /** APIベースURL */
  baseUrl: string;
  /** デフォルトの取引取得期間（日数） */
  defaultDealsPeriodDays: number;
  /** デフォルトの取引取得件数 */
  defaultDealsLimit: number;
  /** キャッシュTTL（ミリ秒） */
  cacheTtl: number;
  /** リトライ設定 */
  retry: {
    maxRetries: number;
    retryDelay: number;
  };
  /** メトリクス収集間隔（ミリ秒） */
  metricsInterval: number;
}

/**
 * アプリケーション設定クラス
 */
@injectable()
export class AppConfig {
  private readonly config: AppConfigData;

  constructor(
    @inject(TYPES.EnvironmentConfig) private envConfig: EnvironmentConfig
  ) {
    this.config = {
      // 固定の事業所ID
      companyId: 2067140,
      
      // APIベースURL（環境変数から取得）
      baseUrl: this.envConfig.oauthConfig?.baseUrl || 'https://api.freee.co.jp',
      
      // デフォルトの取引取得期間（30日）
      defaultDealsPeriodDays: 30,
      
      // デフォルトの取引取得件数
      defaultDealsLimit: 100,
      
      // キャッシュTTL（5分）
      cacheTtl: 5 * 60 * 1000,
      
      // リトライ設定
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
      },
      
      // メトリクス収集間隔（1分）
      metricsInterval: 60 * 1000,
    };
  }

  /**
   * 事業所IDを取得
   */
  get companyId(): number {
    return this.config.companyId;
  }

  /**
   * APIベースURLを取得
   */
  get baseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * デフォルトの取引取得期間を取得
   */
  get defaultDealsPeriodDays(): number {
    return this.config.defaultDealsPeriodDays;
  }

  /**
   * デフォルトの取引取得件数を取得
   */
  get defaultDealsLimit(): number {
    return this.config.defaultDealsLimit;
  }

  /**
   * キャッシュTTLを取得
   */
  get cacheTtl(): number {
    return this.config.cacheTtl;
  }

  /**
   * リトライ設定を取得
   */
  get retryConfig() {
    return this.config.retry;
  }

  /**
   * メトリクス収集間隔を取得
   */
  get metricsInterval(): number {
    return this.config.metricsInterval;
  }

  /**
   * 全設定を取得
   */
  getAll(): AppConfigData {
    return { ...this.config };
  }

  /**
   * 日付範囲を生成（YYYY-MM-DD形式）
   */
  getDateRange(days: number = this.defaultDealsPeriodDays): {
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
  getMonthDateRange(year: number, month: number): {
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
}
