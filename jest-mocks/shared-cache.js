// Mock for shared package cache module to prevent timer issues
const mockGlobalCache = {
  set: jest.fn(),
  get: jest.fn().mockReturnValue(null),
  has: jest.fn().mockReturnValue(false),
  delete: jest.fn().mockReturnValue(true),
  clear: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    oldestEntry: 0,
    newestEntry: 0,
  }),
  destroy: jest.fn(),
};

// Mock MemoryCache class that doesn't create timers
class MockMemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  set(key, data, ttl) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttl || 300000 });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0,
      oldestEntry: 0,
      newestEntry: 0,
    };
  }

  destroy() {
    // No timers to clean up in mock
    this.clear();
  }
}

module.exports = {
  MemoryCache: MockMemoryCache,
  CacheKeyGenerator: {
    forApiRequest: jest.fn((method, url, params) => `api:${method}:${url}`),
    forResource: jest.fn((resourceType, id) => `resource:${resourceType}${id ? `:${id}` : ''}`),
    forUser: jest.fn((userId, operation) => `user:${userId}:${operation}`),
  },
  globalCache: mockGlobalCache,
};