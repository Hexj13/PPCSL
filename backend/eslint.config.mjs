import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const noHardcodedTextPlugin = require('./eslint-plugin-no-hardcoded-text.cjs');
const requireVehicleTypePlugin = require('./eslint-plugin-require-vehicle-type.cjs');

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'import': importPlugin,
      'no-hardcoded-text': noHardcodedTextPlugin,
      'require-vehicle-type': requireVehicleTypePlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'sort-imports': 'off',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
        },
      ],
      'no-hardcoded-text/no-hardcoded-text': [
        'error',
        {
          allowedPatterns: [
            '^[A-Za-z0-9\\s\\-_.,:;!?()\\[\\]{}@#$%^&*+=|\\\\/<>`~]+$',
            '^[0-9\\s.,\\-+()]+$',
            '^[a-z]+://',
            '^www\\.',
            '^mailto:',
            '^#',
          ],
        },
      ],
      'require-vehicle-type/require-vehicle-type': [
        'error',
        {
          checkScripts: true,
        },
      ],
    },
  },
  {
    ignores: [
      '.eslintrc.js',
      'eslint.config.js',
      'eslint.config.mjs',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.integration.ts',
      'src/test/**',
      'dist/**',
      'node_modules/**',
    ],
  },
);

