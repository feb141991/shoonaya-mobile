const { withAppBuildGradle } = require("@expo/config-plugins");

const LEGACY_RULES = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZED_RULES = 'getDefaultProguardFile("proguard-android-optimize.txt")';

/**
 * Expo SDK 57's generated React Native Gradle file still selects Android's
 * legacy default rules, which include -dontoptimize. Keep this in a config
 * plugin so local prebuild and EAS produce the same release configuration.
 * Dependency-specific reflection/JNI rules remain owned by each library's
 * consumer ProGuard file instead of broad app-level package keeps.
 */
module.exports = function withOptimizedR8(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
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
};
