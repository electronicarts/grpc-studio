module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  // `prettier` last: turns off rules that only concern formatting, which Prettier owns
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['./*', '../*'],
        message: 'Import through #src/ (e.g. #src/utils/logger.js), mapped in package.json "imports".',
      }],
    }],
  },
}
