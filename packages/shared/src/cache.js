/**
 * キャッシュ機能
 */
export class MemoryCache {
    cache = new Map();
    defaultTtl;
    maxSize;
    cleanupInterval;
    cleanupTimer;
    stats = {
        hits: 0,
        misses: 0,
    };
    constructor(options = {}) {
        this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes default
        this.maxSize = options.maxSize || 1000;
        this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
        this.startCleanup();
    }
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        // If still over max size, remove least recently used entries
        if (this.cache.size > this.maxSize) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
            const toRemove = entries.slice(0, this.cache.size - this.maxSize);
            toRemove.forEach(([key]) => this.cache.delete(key));
        }
    }
    set(key, data, ttl) {
        const now = Date.now();
        const entry = {
            data,
            timestamp: now,
            ttl: ttl || this.defaultTtl,
            accessCount: 0,
            lastAccessed: now,
        };
        this.cache.set(key, entry);
        // Immediate cleanup if over max size
        if (this.cache.size > this.maxSize) {
            this.cleanup();
        }
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        const now = Date.now();
        // Check if expired
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        // Update access stats
        entry.accessCount++;
        entry.lastAccessed = now;
        this.stats.hits++;
        return entry.data;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
        this.stats.hits = 0;
        this.stats.misses = 0;
    }
    getStats() {
        const entries = Array.from(this.cache.values());
        const timestamps = entries.map(e => e.timestamp);
        return {
            size: this.cache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: this.stats.hits + this.stats.misses > 0
                ? this.stats.hits / (this.stats.hits + this.stats.misses)
                : 0,
            oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
            newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
        };
    }
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.clear();
    }
}
// キャッシュキー生成ユーティリティ
export class CacheKeyGenerator {
    static forApiRequest(method, url, params) {
        const paramString = params ? JSON.stringify(params) : '';
        return `api:${method}:${url}:${this.hash(paramString)}`;
    }
    static forResource(resourceType, id) {
        return `resource:${resourceType}${id ? `:${id}` : ''}`;
    }
    static forUser(userId, operation) {
        return `user:${userId}:${operation}`;
    }
    static hash(str) {
        let hash = 0;
        if (str.length === 0)
            return hash.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}
// グローバルキャッシュインスタンス
export const globalCache = new MemoryCache({
    ttl: 5 * 60 * 1000,
    maxSize: 500,
    cleanupInterval: 2 * 60 * 1000, // 2 minutes
});
//# sourceMappingURL=cache.js.map