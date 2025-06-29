/**
 * 日付関連ユーティリティ
 */

import { injectable } from 'inversify';

/**
 * 日付範囲の型定義
 */
export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * 日付ユーティリティクラス
 */
@injectable()
export class DateUtils {
  /**
   * 日付範囲を生成（YYYY-MM-DD形式）
   */
  getDateRange(days: number = 30): DateRange {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    };
  }

  /**
   * 年月を指定して日付範囲を生成
   */
  getMonthDateRange(year: number, month: number): DateRange {
    // UTCで日付を作成してタイムゾーンの影響を避ける
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // 翌月の0日 = 当月の最終日

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
    };
  }

  /**
   * 現在の年月を取得
   */
  getCurrentYearMonth(): { year: number; month: number } {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  }

  /**
   * 前月の年月を取得
   */
  getPreviousYearMonth(): { year: number; month: number } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    if (month === 0) {
      return { year: year - 1, month: 12 };
    } else {
      return { year, month };
    }
  }

  /**
   * 日付をYYYY-MM-DD形式でフォーマット
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0]!;
  }

  /**
   * 日付文字列をDateオブジェクトに変換
   */
  parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * 日付文字列が有効かどうかを検証
   */
  isValidDateString(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * 日付の差分を日数で取得
   */
  getDaysDifference(startDate: string, endDate: string): number {
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 日付に日数を加算
   */
  addDays(dateString: string, days: number): string {
    const date = this.parseDate(dateString);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  }

  /**
   * 日付から日数を減算
   */
  subtractDays(dateString: string, days: number): string {
    return this.addDays(dateString, -days);
  }

  /**
   * 今日の日付を取得
   */
  getToday(): string {
    return this.formatDate(new Date());
  }

  /**
   * 昨日の日付を取得
   */
  getYesterday(): string {
    return this.subtractDays(this.getToday(), 1);
  }

  /**
   * 明日の日付を取得
   */
  getTomorrow(): string {
    return this.addDays(this.getToday(), 1);
  }

  /**
   * 月初の日付を取得
   */
  getMonthStart(year?: number, month?: number): string {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? (now.getMonth() + 1);
    
    const date = new Date(targetYear, targetMonth - 1, 1);
    return this.formatDate(date);
  }

  /**
   * 月末の日付を取得
   */
  getMonthEnd(year?: number, month?: number): string {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? (now.getMonth() + 1);
    
    const date = new Date(targetYear, targetMonth, 0); // 翌月の0日 = 当月の最終日
    return this.formatDate(date);
  }

  /**
   * 年度の開始日を取得（4月1日）
   */
  getFiscalYearStart(year?: number): string {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    
    // 現在が4月以降なら今年度、3月以前なら前年度
    const fiscalYear = year ?? (now.getMonth() >= 3 ? targetYear : targetYear - 1);
    
    return this.formatDate(new Date(fiscalYear, 3, 1)); // 4月1日
  }

  /**
   * 年度の終了日を取得（3月31日）
   */
  getFiscalYearEnd(year?: number): string {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    
    // 現在が4月以降なら今年度、3月以前なら前年度
    const fiscalYear = year ?? (now.getMonth() >= 3 ? targetYear : targetYear - 1);
    
    return this.formatDate(new Date(fiscalYear + 1, 2, 31)); // 翌年3月31日
  }

  /**
   * 日付が範囲内にあるかどうかを検証
   */
  isDateInRange(date: string, startDate: string, endDate: string): boolean {
    const targetDate = this.parseDate(date);
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    
    return targetDate >= start && targetDate <= end;
  }

  /**
   * 日付を日本語形式でフォーマット
   */
  formatDateJapanese(dateString: string): string {
    const date = this.parseDate(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  /**
   * 相対的な日付表現を取得
   */
  getRelativeDateString(dateString: string): string {
    const date = this.parseDate(dateString);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays === -1) {
      return '明日';
    } else if (diffDays > 0) {
      return `${diffDays}日前`;
    } else {
      return `${Math.abs(diffDays)}日後`;
    }
  }
}
