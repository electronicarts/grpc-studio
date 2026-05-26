module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true, allowExportNames: ['badgeVariants', 'buttonVariants'] },
    ],
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: 'protobufjs',
          message: 'Frontend protobuf handling must use @bufbuild/protobuf.',
        },
        {
          name: 'google-protobuf',
          message: 'Frontend protobuf handling must use @bufbuild/protobuf.',
        },
        {
          name: '@grpc/proto-loader',
          message: 'Frontend protobuf handling must use @bufbuild/protobuf.',
        },
        {
          name: 'grpc-web',
          message: 'Frontend protobuf handling must use @bufbuild/protobuf.',
        },
      ],
      patterns: [
        {
          group: ['protobufjs/*', 'google-protobuf/*'],
          message: 'Frontend protobuf handling must use @bufbuild/protobuf.',
        },
      ],
    }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      // Context files export both providers and hooks — standard React pattern
      // Feature index files re-export sub-components — standard barrel pattern
      files: ['**/stores/*Context.tsx', '**/stores/*context.tsx', '**/features/*/index.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}
