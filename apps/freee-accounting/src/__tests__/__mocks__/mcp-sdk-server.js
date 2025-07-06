// Mock for @modelcontextprotocol/sdk/server/index.js

// Create global mock that can be accessed from tests
global.mockServerInstance = {
  setRequestHandler: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  notification: jest.fn(),
};

const Server = jest.fn().mockImplementation(() => global.mockServerInstance);

module.exports = { Server };