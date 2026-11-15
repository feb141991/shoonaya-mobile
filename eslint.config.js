// ESLint, set up as https://docs.expo.dev/guides/using-eslint/ describes: Expo's flat config
// plus this project's rules. How the severities work is in AGENTS.md ("Lint is a gate, and its
// warnings only ratchet down"): an ERROR is a rule the repo already satisfies, so it must stay at
// zero; a WARNING is a rule existing code still breaks, counted per rule in lint-baseline.json,
// and `npm run check:lint` fails if any rule's count goes up.
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  globalIgnores([
    'node_modules/*',
    '.expo/*',
    'dist/*',
    'ios/*',
    'android/*',
    'vendor/*',
    'store-assets/*', // one-off Node scripts for store artwork, not app code
    '**/graphify-out/*',
    '**/*.generated.ts',
    '.claude/*',
  ]),
  {
    rules: {
      // The typecheck resolves the '@/' alias and every import; this rule cannot see the alias.
      'import/no-unresolved': 'off',
      // JSX text in React Native is not HTML. Entity handling is guarded by
      // __tests__/entity-in-js-string-guard.test.ts (AGENTS.md section 29).
      'react/no-unescaped-entities': 'off',

      // Real bug classes: the repo has none today, so they are errors and stay that way.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/static-components': 'error', // a component declared inside another remounts every render

      // Checks the repo already breaks in places: warnings, counted per rule in lint-baseline.json.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: false }], // a swallowed error hides failures (AGENTS.md section 18)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The TypeScript plugin is only loaded for TypeScript files by Expo's config.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
