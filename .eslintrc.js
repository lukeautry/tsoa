module.exports = {
  env: {
    node: true,
    es6: true,
  },
  root: true,
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:@typescript-eslint/recommended-requiring-type-checking', 'prettier', 'prettier/@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['packages/**/tsconfig.json', 'tests/tsconfig.json'],
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
    '@typescript-eslint/member-ordering': 'off',
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
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/semi': ['off', null],
    '@typescript-eslint/triple-slash-reference': [
      'off',
      {
        path: 'always',
        types: 'prefer-import',
        lib: 'always',
      },
    ],
    'arrow-parens': 'off',
    complexity: 'off',
    eqeqeq: ['error', 'smart'],
    'max-classes-per-file': 'off',
    'no-array-constructor': 'off',
    'no-empty-function': 'off',
    'no-fallthrough': 'off',
    'no-invalid-this': 'off',
    'no-shadow': [
      'off',
      {
        hoist: 'all',
      },
    ],
    'no-unused-vars': 'off',
    'require-await': 'off',
    'valid-typeof': 'off',
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
        'prefer-spread': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
      },
    },
  ],
};
