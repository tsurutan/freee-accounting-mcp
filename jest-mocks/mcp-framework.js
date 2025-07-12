// Mock for mcp-framework module
// This mock provides the same interface as the real mcp-framework logger

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

module.exports = {
  logger: mockLogger,
  // Export the logger as default as well in case it's imported as default
  default: {
    logger: mockLogger,
  },
};