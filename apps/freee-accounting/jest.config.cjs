/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/test-*.ts',
    '!src/index-old.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol|@mcp-server))',
  ],
  moduleNameMapper: {
    '^@modelcontextprotocol/sdk/server/index.js$': '<rootDir>/src/__tests__/__mocks__/mcp-sdk-server.js',
    '^@modelcontextprotocol/sdk/server/stdio.js$': '<rootDir>/src/__tests__/__mocks__/mcp-sdk-stdio.js',
    '^@modelcontextprotocol/sdk/types.js$': '<rootDir>/src/__tests__/__mocks__/mcp-sdk-types.js',
    '^@mcp-server/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@mcp-server/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

module.exports = config;
