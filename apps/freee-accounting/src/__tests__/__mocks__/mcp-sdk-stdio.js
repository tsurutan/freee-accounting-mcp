// Mock for @modelcontextprotocol/sdk/server/stdio.js
/* eslint-env node, jest */

// Create global mock that can be accessed from tests
global.mockTransportInstance = {
  start: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

const StdioServerTransport = jest.fn().mockImplementation(() => global.mockTransportInstance);

module.exports = { StdioServerTransport };