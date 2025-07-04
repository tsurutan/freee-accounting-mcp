/**
 * ユーティリティ関数
 */
/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
export function formatDate(date) {
    return date.toISOString().split('T')[0];
}
/**
 * 金額を日本円形式にフォーマット
 */
export function formatAmount(amount) {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
    }).format(amount);
}
/**
 * 文字列が空かどうかをチェック
 */
export function isEmpty(value) {
    return !value || value.trim().length === 0;
}
/**
 * 数値が正の値かどうかをチェック
 */
export function isPositiveNumber(value) {
    return typeof value === 'number' && value > 0 && isFinite(value);
}
/**
 * 日付文字列が有効かどうかをチェック
 */
export function isValidDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}
/**
 * オブジェクトから undefined のプロパティを除去
 */
export function removeUndefined(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}
/**
 * 配列をページネーション
 */
export function paginate(items, page, limit) {
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);
    return {
        items: paginatedItems,
        total: items.length,
        hasMore: offset + limit < items.length,
    };
}
//# sourceMappingURL=utils.js.map