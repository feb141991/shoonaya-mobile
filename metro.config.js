const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Required for react-native-worklets (Reanimated 4) and package exports
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native', 'default'];

module.exports = withNativeWind(config, { input: './global.css' });
