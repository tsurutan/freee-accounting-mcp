/**
 * ユーティリティ関数
 */

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/**
 * 金額を日本円形式にフォーマット
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * 文字列が空かどうかをチェック
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * 数値が正の値かどうかをチェック
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * 日付文字列が有効かどうかをチェック
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * オブジェクトから undefined のプロパティを除去
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  return result;
}

/**
 * 配列をページネーション
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): { items: T[]; total: number; hasMore: boolean } {
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);

  return {
    items: paginatedItems,
    total: items.length,
    hasMore: offset + limit < items.length,
  };
}
