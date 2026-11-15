module.exports = function (api) {
  // Jest sets NODE_ENV to "test". Component tests do not load NativeWind: its JSX transform pulls in
  // react-native-css-interop (untransformed JSX in node_modules) and no screen here uses a NativeWind className.
  // App builds (Metro, EAS) never run with NODE_ENV=test, so they keep NativeWind exactly as before.
  const isTest = api.cache.using(() => process.env.NODE_ENV === 'test');
  return {
    presets: isTest
      ? ['babel-preset-expo']
      : [
          ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
          'nativewind/babel',
        ],
    // react-native-reanimated/plugin is NOT needed with New Architecture (newArchEnabled=true)
    // and Reanimated 4 — including it causes 'Cannot find module react-native-worklets/plugin'
    plugins: [],
  };
};
