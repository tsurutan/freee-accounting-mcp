/**
 * キャッシュ機能
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
    cleanupInterval?: number;
}
export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
}
export declare class MemoryCache<T> {
    private cache;
    private defaultTtl;
    private maxSize;
    private cleanupInterval;
    private cleanupTimer?;
    private stats;
    constructor(options?: CacheOptions);
    private startCleanup;
    private cleanup;
    set(key: string, data: T, ttl?: number): void;
    get(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    getStats(): CacheStats;
    destroy(): void;
}
export declare class CacheKeyGenerator {
    static forApiRequest(method: string, url: string, params?: any): string;
    static forResource(resourceType: string, id?: string | number): string;
    static forUser(userId: string, operation: string): string;
    private static hash;
}
export declare const globalCache: MemoryCache<unknown>;
//# sourceMappingURL=cache.d.ts.map