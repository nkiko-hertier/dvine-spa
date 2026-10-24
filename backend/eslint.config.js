// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Plain Node scripts (no TypeScript, run with `node`): globals like
    // process/console/fetch are theirs, not the browser's.
    files: ['scripts/**/*.mjs', 'scripts/**/*.js', '*.config.js', '*.config.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
      },
    },
  },
  {
    // The Vercel serverless entry adapts an Express app to the platform's
    // handler signature; its @ts-nocheck is deliberate (see the file).
    files: ['api/**/*.ts'],
    rules: { '@typescript-eslint/ban-ts-comment': 'off' },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
);
