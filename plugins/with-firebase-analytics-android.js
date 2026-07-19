const { WarningAggregator, withAppBuildGradle, withDangerousMod, withPlugins, withProjectBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GOOGLE_SERVICES_CLASSPATH = 'com.google.gms:google-services';
const GOOGLE_SERVICES_PLUGIN = 'com.google.gms.google-services';
const GOOGLE_SERVICES_VERSION = '4.4.4';

function addBuildscriptDependency(contents) {
  if (contents.includes(GOOGLE_SERVICES_CLASSPATH)) return contents;

  return contents.replace(
    /dependencies\s?{/,
    `dependencies {\n        classpath '${GOOGLE_SERVICES_CLASSPATH}:${GOOGLE_SERVICES_VERSION}'`
  );
}

function applyGoogleServicesPlugin(contents) {
  const pattern = new RegExp(`apply\\s+plugin:\\s+['"]${GOOGLE_SERVICES_PLUGIN}['"]`);
  if (pattern.test(contents)) return contents;
  return `${contents}\napply plugin: '${GOOGLE_SERVICES_PLUGIN}'\n`;
}

function withBuildscriptDependency(config) {
  return withProjectBuildGradle(config, (nextConfig) => {
    if (nextConfig.modResults.language === 'groovy') {
      nextConfig.modResults.contents = addBuildscriptDependency(nextConfig.modResults.contents);
    } else {
      WarningAggregator.addWarningAndroid('firebase-analytics-android', 'Cannot configure project build.gradle because it is not Groovy.');
    }
    return nextConfig;
  });
}

function withApplyGoogleServicesPlugin(config) {
  return withAppBuildGradle(config, (nextConfig) => {
    if (nextConfig.modResults.language === 'groovy') {
      nextConfig.modResults.contents = applyGoogleServicesPlugin(nextConfig.modResults.contents);
    } else {
      WarningAggregator.addWarningAndroid('firebase-analytics-android', 'Cannot configure app build.gradle because it is not Groovy.');
    }
    return nextConfig;
  });
}

function withCopyAndroidGoogleServices(config) {
  return withDangerousMod(config, [
    'android',
    async (nextConfig) => {
      const googleServicesFile = nextConfig.android?.googleServicesFile;
      if (!googleServicesFile) {
        throw new Error('Path to google-services.json is not defined. Please specify expo.android.googleServicesFile in app.json.');
      }

      const sourcePath = path.resolve(nextConfig.modRequest.projectRoot, googleServicesFile);
      const targetPath = path.resolve(nextConfig.modRequest.platformProjectRoot, 'app/google-services.json');

      await fs.promises.copyFile(sourcePath, targetPath);
      return nextConfig;
    },
  ]);
}

module.exports = function withFirebaseAnalyticsAndroid(config) {
  return withPlugins(config, [
    withBuildscriptDependency,
    withApplyGoogleServicesPlugin,
    withCopyAndroidGoogleServices,
  ]);
};
