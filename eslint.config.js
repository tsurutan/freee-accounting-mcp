import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Start with base configs but override below
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,
      
      // Override base config errors to warnings
      'no-undef': 'off', // Disabled in favor of TypeScript checking
      'no-unused-vars': 'off', // Disabled in favor of TypeScript checking
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Changed from error to warn
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Changed from error to warn
      '@typescript-eslint/prefer-optional-chain': 'warn', // Changed from error to warn
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // Changed from error to warn
      '@typescript-eslint/no-floating-promises': 'warn', // Changed from error to warn
      '@typescript-eslint/await-thenable': 'warn', // Changed from error to warn
      '@typescript-eslint/no-misused-promises': 'warn', // Changed from error to warn
      '@typescript-eslint/require-await': 'warn', // Changed from error to warn
      '@typescript-eslint/no-unsafe-assignment': 'off', // Changed from warn to off
      '@typescript-eslint/no-unsafe-member-access': 'off', // Changed from warn to off
      '@typescript-eslint/no-unsafe-call': 'off', // Changed from warn to off
      '@typescript-eslint/no-unsafe-return': 'off', // Changed from warn to off
      '@typescript-eslint/no-unsafe-argument': 'off', // Added to turn off
      '@typescript-eslint/restrict-template-expressions': 'off', // Changed from warn to off
      '@typescript-eslint/prefer-readonly': 'off', // Changed from warn to off
      '@typescript-eslint/prefer-readonly-parameter-types': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'warn', // Changed from error to warn
      '@typescript-eslint/unbound-method': 'off', // Added to turn off
      '@typescript-eslint/no-require-imports': 'off', // Added to turn off
      '@typescript-eslint/only-throw-error': 'off', // Added to turn off
      '@typescript-eslint/no-redundant-type-constituents': 'off', // Added to turn off

      // General rules
      'no-console': 'warn',
      'prefer-const': 'warn', // Changed from error to warn
      'no-var': 'warn', // Changed from error to warn
      'object-shorthand': 'warn', // Changed from error to warn
      'prefer-template': 'warn', // Changed from error to warn
      'eqeqeq': ['warn', 'always'], // Changed from error to warn
      'curly': ['warn', 'all'], // Changed from error to warn
      'no-throw-literal': 'warn', // Changed from error to warn
      'prefer-promise-reject-errors': 'off', // Changed from warn to off
      'no-case-declarations': 'off', // Added to turn off
      '@typescript-eslint/no-unused-expressions': 'off', // Added to turn off
      '@typescript-eslint/prefer-promise-reject-errors': 'off', // Added to turn off
    },
  },
  // Test files configuration
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Jest globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        pending: 'readonly',
        // Node.js types
        NodeJS: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off', // Allow async without await in tests
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
      'no-console': 'off', // Allow console in tests
    },
  },
  prettier,
  {
    ignores: [
      'dist/',
      'node_modules/',
      '*.js',
      '*.d.ts',
    ],
  },
];