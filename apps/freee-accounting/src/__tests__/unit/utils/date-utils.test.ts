/**
 * DateUtils ユニットテスト
 */

import 'reflect-metadata';
import { DateUtils } from '../../../utils/date-utils.js';

describe('DateUtils', () => {
  let dateUtils: DateUtils;

  beforeEach(() => {
    dateUtils = new DateUtils();
  });

  describe('getDateRange', () => {
    it('デフォルト30日の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getDateRange();

      // Assert
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const startDate = new Date(result.startDate);
      const endDate = new Date(result.endDate);
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(30);
    });

    it('指定した日数の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getDateRange(7);

      // Assert
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const startDate = new Date(result.startDate);
      const endDate = new Date(result.endDate);
      const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(7);
    });
  });

  describe('getMonthDateRange', () => {
    it('2024年1月の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getMonthDateRange(2024, 1);

      // Assert
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
    });

    it('2024年2月（うるう年）の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getMonthDateRange(2024, 2);

      // Assert
      expect(result.startDate).toBe('2024-02-01');
      expect(result.endDate).toBe('2024-02-29');
    });

    it('2023年2月（平年）の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getMonthDateRange(2023, 2);

      // Assert
      expect(result.startDate).toBe('2023-02-01');
      expect(result.endDate).toBe('2023-02-28');
    });

    it('2024年12月の日付範囲を正しく生成する', () => {
      // Act
      const result = dateUtils.getMonthDateRange(2024, 12);

      // Assert
      expect(result.startDate).toBe('2024-12-01');
      expect(result.endDate).toBe('2024-12-31');
    });
  });

  describe('formatDate', () => {
    it('日付を正しくフォーマットする', () => {
      // Arrange
      const date = new Date('2024-01-15T10:30:00Z');

      // Act
      const result = dateUtils.formatDate(date);

      // Assert
      expect(result).toBe('2024-01-15');
    });
  });

  describe('parseDate', () => {
    it('日付文字列を正しくパースする', () => {
      // Act
      const result = dateUtils.parseDate('2024-01-15');

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // 0-based
      expect(result.getDate()).toBe(15);
    });
  });

  describe('isValidDateString', () => {
    it('有効な日付文字列を正しく判定する', () => {
      // Act & Assert
      expect(dateUtils.isValidDateString('2024-01-15')).toBe(true);
      expect(dateUtils.isValidDateString('2024-12-31')).toBe(true);
      expect(dateUtils.isValidDateString('2024-02-29')).toBe(true); // うるう年
    });

    it('無効な日付文字列を正しく判定する', () => {
      // Act & Assert
      expect(dateUtils.isValidDateString('2024-13-01')).toBe(false); // 無効な月
      expect(dateUtils.isValidDateString('2024-02-30')).toBe(false); // 無効な日
      expect(dateUtils.isValidDateString('2023-02-29')).toBe(false); // 平年のうるう日
      expect(dateUtils.isValidDateString('invalid-date')).toBe(false);
      expect(dateUtils.isValidDateString('2024/01/15')).toBe(false); // 間違ったフォーマット
    });
  });

  describe('getDaysDifference', () => {
    it('日付の差分を正しく計算する', () => {
      // Act
      const result = dateUtils.getDaysDifference('2024-01-01', '2024-01-31');

      // Assert
      expect(result).toBe(30);
    });

    it('同じ日付の差分を正しく計算する', () => {
      // Act
      const result = dateUtils.getDaysDifference('2024-01-15', '2024-01-15');

      // Assert
      expect(result).toBe(0);
    });

    it('逆順の日付の差分を正しく計算する', () => {
      // Act
      const result = dateUtils.getDaysDifference('2024-01-31', '2024-01-01');

      // Assert
      expect(result).toBe(-30);
    });
  });

  describe('addDays', () => {
    it('日数を正しく加算する', () => {
      // Act
      const result = dateUtils.addDays('2024-01-15', 10);

      // Assert
      expect(result).toBe('2024-01-25');
    });

    it('月をまたいで日数を正しく加算する', () => {
      // Act
      const result = dateUtils.addDays('2024-01-25', 10);

      // Assert
      expect(result).toBe('2024-02-04');
    });
  });

  describe('subtractDays', () => {
    it('日数を正しく減算する', () => {
      // Act
      const result = dateUtils.subtractDays('2024-01-15', 10);

      // Assert
      expect(result).toBe('2024-01-05');
    });

    it('月をまたいで日数を正しく減算する', () => {
      // Act
      const result = dateUtils.subtractDays('2024-02-05', 10);

      // Assert
      expect(result).toBe('2024-01-26');
    });
  });

  describe('getToday', () => {
    it('今日の日付を正しく取得する', () => {
      // Act
      const result = dateUtils.getToday();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const today = new Date();
      const expectedToday = today.toISOString().split('T')[0];
      expect(result).toBe(expectedToday);
    });
  });

  describe('getYesterday', () => {
    it('昨日の日付を正しく取得する', () => {
      // Act
      const result = dateUtils.getYesterday();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedYesterday = yesterday.toISOString().split('T')[0];
      expect(result).toBe(expectedYesterday);
    });
  });

  describe('getTomorrow', () => {
    it('明日の日付を正しく取得する', () => {
      // Act
      const result = dateUtils.getTomorrow();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expectedTomorrow = tomorrow.toISOString().split('T')[0];
      expect(result).toBe(expectedTomorrow);
    });
  });

  describe('getMonthStart', () => {
    it('現在月の月初を正しく取得する', () => {
      // Act
      const result = dateUtils.getMonthStart();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-01$/);
    });

    it('指定した年月の月初を正しく取得する', () => {
      // Act
      const result = dateUtils.getMonthStart(2024, 3);

      // Assert
      expect(result).toBe('2024-03-01');
    });
  });

  describe('getMonthEnd', () => {
    it('現在月の月末を正しく取得する', () => {
      // Act
      const result = dateUtils.getMonthEnd();

      // Assert
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('指定した年月の月末を正しく取得する', () => {
      // Act
      const result = dateUtils.getMonthEnd(2024, 2);

      // Assert
      expect(result).toBe('2024-02-29'); // うるう年
    });

    it('平年2月の月末を正しく取得する', () => {
      // Act
      const result = dateUtils.getMonthEnd(2023, 2);

      // Assert
      expect(result).toBe('2023-02-28');
    });
  });
});
