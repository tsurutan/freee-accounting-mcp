/**
 * ユーティリティ関数のテスト
 */

import {
  formatDate,
  formatAmount,
  isEmpty,
  isPositiveNumber,
  isValidDate,
  removeUndefined,
  paginate,
} from '../utils';

describe('Utils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toBe('2024-01-15');
    });

    it('should handle different dates correctly', () => {
      const date1 = new Date('2023-12-31T23:59:59Z');
      const date2 = new Date('2024-06-01T00:00:00Z');

      expect(formatDate(date1)).toBe('2023-12-31');
      expect(formatDate(date2)).toBe('2024-06-01');
    });
  });

  describe('formatAmount', () => {
    it('should format positive amounts correctly', () => {
      expect(formatAmount(1000)).toBe('￥1,000');
      expect(formatAmount(1234567)).toBe('￥1,234,567');
    });

    it('should format negative amounts correctly', () => {
      expect(formatAmount(-1000)).toBe('-￥1,000');
    });

    it('should format zero correctly', () => {
      expect(formatAmount(0)).toBe('￥0');
    });

    it('should format decimal amounts correctly', () => {
      expect(formatAmount(1000.5)).toBe('￥1,001');
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty strings', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    it('should return true for null and undefined', () => {
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty strings', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
      expect(isEmpty('0')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
      expect(isPositiveNumber(1000)).toBe(true);
    });

    it('should return false for zero and negative numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber(-0.1)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(isPositiveNumber(NaN)).toBe(false);
      expect(isPositiveNumber(Infinity)).toBe(false);
      expect(isPositiveNumber(-Infinity)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    });

    it('should return false for invalid date strings', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2024-13-01')).toBe(false);
      expect(isValidDate('2024-01-32')).toBe(false);
      expect(isValidDate('')).toBe(false);
    });
  });

  describe('removeUndefined', () => {
    it('should remove undefined properties', () => {
      const obj = {
        a: 1,
        b: undefined,
        c: 'hello',
        d: null,
        e: undefined,
      };

      const result = removeUndefined(obj);

      expect(result).toEqual({
        a: 1,
        c: 'hello',
        d: null,
      });
    });

    it('should handle empty objects', () => {
      expect(removeUndefined({})).toEqual({});
    });

    it('should handle objects with all undefined values', () => {
      const obj = {
        a: undefined,
        b: undefined,
      };

      expect(removeUndefined(obj)).toEqual({});
    });
  });

  describe('paginate', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should paginate correctly for first page', () => {
      const result = paginate(items, 1, 3);

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should paginate correctly for middle page', () => {
      const result = paginate(items, 2, 3);

      expect(result.items).toEqual([4, 5, 6]);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should paginate correctly for last page', () => {
      const result = paginate(items, 4, 3);

      expect(result.items).toEqual([10]);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty arrays', () => {
      const result = paginate([], 1, 3);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle page beyond available items', () => {
      const result = paginate(items, 10, 3);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(false);
    });
  });
});
