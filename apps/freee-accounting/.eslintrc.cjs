module.exports = {
  extends: ['../../.eslintrc.cjs'],
  parserOptions: {
    project: './tsconfig.json',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/__mocks__/**/*.js'],
      env: {
        jest: true,
        node: true,
      },
      globals: {
        jest: 'readonly',
        global: 'readonly',
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
