// Jest setup file for freee-accounting app
// Aggressive timer cleanup to prevent Jest from hanging

// Override global setInterval and setTimeout to track timers
let intervalIds = [];
let timeoutIds = [];

const originalSetInterval = global.setInterval;
const originalSetTimeout = global.setTimeout;
const originalClearInterval = global.clearInterval;
const originalClearTimeout = global.clearTimeout;

global.setInterval = function(...args) {
  const id = originalSetInterval.apply(this, args);
  intervalIds.push(id);
  return id;
};

global.setTimeout = function(...args) {
  const id = originalSetTimeout.apply(this, args);
  timeoutIds.push(id);
  return id;
};

global.clearInterval = function(id) {
  const index = intervalIds.indexOf(id);
  if (index > -1) {
    intervalIds.splice(index, 1);
  }
  return originalClearInterval.apply(this, arguments);
};

global.clearTimeout = function(id) {
  const index = timeoutIds.indexOf(id);
  if (index > -1) {
    timeoutIds.splice(index, 1);
  }
  return originalClearTimeout.apply(this, arguments);
};

// Clean up after each test
afterEach(() => {
  // Clear all tracked intervals
  intervalIds.forEach(id => {
    try {
      originalClearInterval(id);
    } catch (e) {
      // Ignore errors when clearing intervals
    }
  });
  intervalIds = [];
  
  // Clear all tracked timeouts
  timeoutIds.forEach(id => {
    try {
      originalClearTimeout(id);
    } catch (e) {
      // Ignore errors when clearing timeouts
    }
  });
  timeoutIds = [];
});

// Global cleanup to prevent Jest from hanging
afterAll(async () => {
  // Clear all tracked timers
  intervalIds.forEach(id => {
    try {
      originalClearInterval(id);
    } catch (e) {}
  });
  timeoutIds.forEach(id => {
    try {
      originalClearTimeout(id);
    } catch (e) {}
  });
  
  // Clear all timers with brute force approach
  jest.clearAllTimers();
  
  // Clear any remaining intervals and timeouts
  if (typeof global !== 'undefined') {
    // Get the highest timer ID and clear all timers
    const maxTimerId = originalSetTimeout(() => {}, 0);
    for (let i = maxTimerId; i >= 0; i--) {
      try {
        originalClearTimeout(i);
        originalClearInterval(i);
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  // Try to clean up global cache if it exists
  try {
    const shared = require('@mcp-server/shared');
    if (shared.globalCache && typeof shared.globalCache.destroy === 'function') {
      shared.globalCache.destroy();
    }
  } catch (error) {
    // Ignore import errors
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});