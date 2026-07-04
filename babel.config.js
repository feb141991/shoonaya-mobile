module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // react-native-reanimated/plugin is NOT needed with New Architecture (newArchEnabled=true)
    // and Reanimated 4 — including it causes 'Cannot find module react-native-worklets/plugin'
    plugins: [],
  };
};
