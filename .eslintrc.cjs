module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: false
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: null
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: { version: 'detect' }
  },
  rules: {
    // ⚠️ Console logs (warn для постепенного исправления)
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // 🔒 TypeScript Strict Rules
    '@typescript-eslint/no-explicit-any': 'error', // ✅ УСИЛЕНО: Запрещаем any
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],

    // ⚠️ Code Quality
    'no-empty': 'error',
    'no-async-promise-executor': 'error',
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',

    // 🚫 Disabled type-checking rules (require parserOptions.project)
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',

    // ⚛️ React Rules
    'react/react-in-jsx-scope': 'off', // React 18+
    'react/display-name': 'off',
    'react-refresh/only-export-components': 'off',
    'react-hooks/exhaustive-deps': 'error', // ✅ УСИЛЕНО
    'react-hooks/rules-of-hooks': 'error'
  },
  ignorePatterns: ['dist/', 'android/', 'ios/', 'scripts/'],
  overrides: [
    {
      files: ['**/*.tsx'],
      rules: {
        'react/react-in-jsx-scope': 'off'
      }
    },
    {
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};
