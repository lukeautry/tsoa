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
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'off',
      {
        multiline: {
          delimiter: 'none',
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
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
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-var-requires': 'off',
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
    'no-shadow': [
      'off',
      {
        hoist: 'all',
      },
    ],
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
        '@typescript-eslint/restrict-template-expressions': 'warn',
        // for expectations
        '@typescript-eslint/no-unused-expressions': 'off',
        // Crashes also fail the test
        'no-unsafe-optional-chaining': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  ],
};
