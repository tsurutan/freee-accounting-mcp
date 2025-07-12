// Jest setup file
// Global test configuration

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.FREEE_CLIENT_ID = 'test_client_id';
process.env.FREEE_CLIENT_SECRET = 'test_client_secret';
process.env.FREEE_REDIRECT_URI = 'http://localhost:3000/callback';
process.env.FREEE_API_BASE_URL = 'https://api.freee.co.jp';

// Mock the globalCache to prevent timer issues during tests
jest.mock('./packages/shared/src/cache.js', () => {
  const originalModule = jest.requireActual('./packages/shared/src/cache.js');
  
  // Create a mock cache that doesn't start timers
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
  
  return {
    ...originalModule,
    globalCache: mockGlobalCache,
  };
});

// Global cleanup to prevent Jest from hanging
afterAll(async () => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear any remaining intervals and timeouts
  if (typeof global !== 'undefined' && global.setInterval) {
    // Get the highest timer ID and clear all timers
    const maxTimerId = setTimeout(() => {}, 0);
    for (let i = maxTimerId; i >= 0; i--) {
      clearTimeout(i);
      clearInterval(i);
    }
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});
