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
  moduleNameMapper: {
    '^@mcp-server/(.*)$': '<rootDir>/../../packages/$1/dist',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol|@mcp-server)/)',
  ],
  moduleNameMapper: {
    '^@mcp-server/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@mcp-server/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

module.exports = config;
