module.exports = {
  env: {
    node: true,
    es6: true,
  },
  root: true,
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-type-checked', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./packages/**/tsconfig.json', './tests/tsconfig.json', './tests/esm/tsconfig.json'],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/array-type': [
      'error',
      {
        default: 'array-simple',
      },
    ],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/triple-slash-reference': [
      'error',
      {
        path: 'always',
        types: 'prefer-import',
        lib: 'always',
      },
    ],
    '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
    eqeqeq: ['error', 'smart'],
  },
  overrides: [
    {
      files: './packages/runtime/src/decorators/*.ts',
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: 'tests/**/*.ts',
      rules: {
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        // Crashes also fail the test
        'no-unsafe-optional-chaining': 'off',
        // chai assertions like expect(x).to.be.ok are expressions by design
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/prefer-promise-reject-errors': 'off',
        '@typescript-eslint/only-throw-error': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        // Fires inconsistently across TS versions on fixtures that import generated (lint-excluded) routes
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      },
    },
  ],
};
