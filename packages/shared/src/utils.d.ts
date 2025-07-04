/**
 * ユーティリティ関数
 */
/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
export declare function formatDate(date: Date): string;
/**
 * 金額を日本円形式にフォーマット
 */
export declare function formatAmount(amount: number): string;
/**
 * 文字列が空かどうかをチェック
 */
export declare function isEmpty(value: string | null | undefined): boolean;
/**
 * 数値が正の値かどうかをチェック
 */
export declare function isPositiveNumber(value: number): boolean;
/**
 * 日付文字列が有効かどうかをチェック
 */
export declare function isValidDate(dateString: string): boolean;
/**
 * オブジェクトから undefined のプロパティを除去
 */
export declare function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T>;
/**
 * 配列をページネーション
 */
export declare function paginate<T>(items: T[], page: number, limit: number): {
    items: T[];
    total: number;
    hasMore: boolean;
};
//# sourceMappingURL=utils.d.ts.map