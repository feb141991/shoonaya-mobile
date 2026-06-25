module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // NativeWind must be processed before Reanimated
      'nativewind/babel',
      // Reanimated MUST be the last plugin in the list
      'react-native-reanimated/plugin',
    ],
  };
};
