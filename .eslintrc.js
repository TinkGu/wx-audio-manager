module.exports = {
  parser: 'babel-eslint',
  extends: ['airbnb', 'plugin:prettier/recommended'],
  env: {
    jest: true,
    browser: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'],
      },
    },
  },
  rules: {
    camelcase: 'off',
    'no-use-before-define': 'off',
    'no-underscore-dangle': 'off',
    'no-bitwise': 'off',
    'no-restricted-syntax': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'import/extensions': 'off',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        'no-restricted-globals': 'off',
        'no-use-before-define': 'off',
        'no-plusplus': 'off',
        'no-redeclare': 'off',
      },
    },
  ],
};
