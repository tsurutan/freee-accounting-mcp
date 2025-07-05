import config from '../../eslint.config.js';

export default [
  ...config,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];