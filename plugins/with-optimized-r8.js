const { withAppBuildGradle, withGradleProperties, AndroidConfig } = require("@expo/config-plugins");

const LEGACY_RULES = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED_RULES = 'getDefaultProguardFile("proguard-android-optimize.txt")';

/**
 * Expo SDK 57's generated React Native Gradle file still selects Android's
 * legacy default rules, which include -dontoptimize. Keep this in a config
 * plugin so local prebuild and EAS produce the same release configuration.
 * Also configures Google Play App Bundle recommendations:
 * 1. R8 Full Mode (android.enableR8.fullMode=true)
 * 2. Optimized Resource Shrinker (android.experimental.enableNewResourceShrinker=true)
 */
module.exports = function withOptimizedR8(config) {
  config = withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") {
      throw new Error("with-optimized-r8 requires the generated Groovy app build.gradle");
    }

    const contents = gradleConfig.modResults.contents;
    if (contents.includes(OPTIMIZED_RULES)) return gradleConfig;
    if (!contents.includes(LEGACY_RULES)) {
      throw new Error("with-optimized-r8 could not find Expo's default ProGuard configuration");
    }

    gradleConfig.modResults.contents = contents.replace(LEGACY_RULES, OPTIMIZED_RULES);
    return gradleConfig;
  });

  config = withGradleProperties(config, (gradlePropsConfig) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      gradlePropsConfig.modResults,
      "android.enableR8.fullMode",
      "true"
    );
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      gradlePropsConfig.modResults,
      "android.experimental.enableNewResourceShrinker",
      "true"
    );
    return gradlePropsConfig;
  });

  return config;
};
