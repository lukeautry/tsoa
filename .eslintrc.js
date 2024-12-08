module.exports = {
  env: {
    node: true,
    es6: true,
  },
  root: true,
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-requiring-type-checking', 'prettier'],
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
      },
    },
  ],
};
