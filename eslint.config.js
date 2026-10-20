import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'extension/_metadata/**'],
  },
  js.configs.recommended,
  {
    files: ['extension/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.serviceworker, chrome: 'readonly' },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'test/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
];
