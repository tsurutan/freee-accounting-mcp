module.exports = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/apps'],
  testMatch: [
    '<rootDir>/packages/*/src/**/__tests__/**/*.ts',
    '<rootDir>/packages/*/src/**/?(*.)+(spec|test).ts',
    '<rootDir>/apps/*/src/**/__tests__/**/*.ts',
    '<rootDir>/apps/*/src/**/?(*.)+(spec|test).ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: false,
        declarationMap: false,
        sourceMap: false,
      },
    }],
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
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
    '^@mcp-server/types$': '<rootDir>/packages/types/src',
    '^@mcp-server/shared$': '<rootDir>/packages/shared/src',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
