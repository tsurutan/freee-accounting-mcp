module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/?(*.)+(spec|test).ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/__tests__/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  moduleNameMapper: {
    '^@mcp-server/types$': '<rootDir>/../types/src/index.ts',
    '^@mcp-server/shared$': '<rootDir>/src/index.ts',
    '^mcp-framework$': '<rootDir>/../../jest-mocks/mcp-framework.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
  // Timer management and cleanup
  fakeTimers: {
    enableGlobally: false,
  },
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles to help debug hanging issues
  detectOpenHandles: true,
  // Ensure tests exit cleanly
  clearMocks: true,
  restoreMocks: true,
};
