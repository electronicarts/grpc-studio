module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:tailwindcss/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'tailwindcss'],
  settings: {
    tailwindcss: {
      // Absolute path so the plugin resolves the config regardless of the cwd eslint
      // runs from (tailwindcss is hoisted to the monorepo root in this workspace).
      config: require('path').join(__dirname, 'tailwind.config.js'),
      callees: ['cn', 'clsx', 'cva', 'classnames'],
    },
  },
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
    // Catch utility classes that don't exist in the Tailwind theme (e.g. a typo'd
    // `bg-gray-750`, which silently emits no CSS and broke dark-mode hover). This is
    // the guardrail that would have caught that bug at lint time. The allowlist covers
    // classes provided by the tailwindcss-animate plugin (shadcn animations), which the
    // linter can't see from config alone.
    'tailwindcss/no-custom-classname': ['error', {
      whitelist: ['animate-in', 'fade-in', 'slide-in-from-top-2', 'slide-in-from-.+', 'fade-out', 'zoom-in-.+', 'zoom-out-.+'],
    }],
    // Contradicting classes (e.g. two conflicting bg-* on one element) are always a bug.
    'tailwindcss/no-contradicting-classname': 'error',
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
