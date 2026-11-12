// Component tests: they render real components and press real buttons, which the node:test suite (pure logic) cannot do.
// They live in __component_tests__/ and run with `npm run test:components`; `npm test` (node:test) does not see them.
module.exports = {
  // React Native's own preset, not jest-expo: jest-expo starts by loading Expo's native modules and finds their mocks by
  // parsing stack traces, which breaks for a checkout under a folder with parentheses in its name. The few Expo modules
  // the components touch are mocked by hand in jest.setup.ts instead.
  preset: '@react-native/jest-preset',
  testMatch: ['<rootDir>/__component_tests__/**/*.test.tsx'],
  // The repo keeps extra checkouts under .claude/worktrees; they carry their own package.json files.
  modulePathIgnorePatterns: ['<rootDir>/\\.claude/'],
  // React Native's default list, plus expo/virtual: the file babel-preset-expo imports to inline EXPO_PUBLIC_* variables.
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo/virtual)/)'],
  // Audio files are required by lib/japa-audio; React Native's preset stubs images and video but not audio.
  transform: { '^.+\\.(mp3|wav|m4a|aac|ogg)$': require.resolve('@react-native/jest-preset/jest/assetFileTransformer.js') },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
};
