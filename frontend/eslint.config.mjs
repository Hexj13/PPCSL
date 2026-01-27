import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';
import noHardcodedTextPlugin from './eslint-plugin-no-hardcoded-text.mjs';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
        React: 'readonly',
        process: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/.storybook/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      'vitest.config.ts',
      'scripts/**',
      '**/design-system/**',
      '**/color-palette/**',
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'no-hardcoded-text': noHardcodedTextPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/react-in-jsx-scope': 'off',
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'max-lines': [
        'warn',
        {
          max: 1500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['lib/config/legal.ts'],
    rules: {
      'max-lines': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      import: importPlugin,
      'no-hardcoded-text': noHardcodedTextPlugin,
    },
    rules: {
      'max-lines-per-function': [
        'warn',
        {
          max: 1500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'complexity': ['warn', { max: 75 }],
      'sort-imports': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: false,
          },
        },
      ],
      'no-hardcoded-text/no-hardcoded-text': [
        'warn',
        {
          allowedElements: ['script', 'style', 'noscript', 'meta', 'link'],
          allowedAttributes: ['className', 'id', 'key', 'data-testid', 'data-cy', 'href', 'src'],
          translationFunction: 't',
          ignorePatterns: [
            '^\\s*$',
            '^[0-9\\s.,\\-+()]+$',
            '^[a-z]+://',
            '^www\\.',
            '^mailto:',
            '^#',
            '^#[0-9]',
            '^[:;|•\\-\\s\\/×·]+$',
            '^[×·\\/|:\\-;]+$',
            '^[A-Z]$',
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      '**/*.stories.{ts,tsx}',
      '**/design-system/**',
      '**/color-palette/**',
      'app/design-system/**',
      'app/color-palette/**',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-hardcoded-text/no-hardcoded-text': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='it'] > Literal[value=/[а-яА-ЯёЁ]/], CallExpression[callee.name='describe'] > Literal[value=/[а-яА-ЯёЁ]/], CallExpression[callee.name='test'] > Literal[value=/[а-яА-ЯёЁ]/]",
          message:
            'Test descriptions must be in English. Cyrillic characters are not allowed in test names.',
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'stories.backup/**',
      '**/*.css',
    ],
  },
  prettierConfig,
];

