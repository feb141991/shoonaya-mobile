const { withAndroidStyles } = require("@expo/config-plugins");

/**
 * withModernEdgeToEdge
 *
 * Android 15 (API 35+) deprecates explicitly setting `android:statusBarColor`
 * and `android:navigationBarColor` in favor of edge-to-edge window insets
 * (enforced by default on Android 15).
 *
 * This plugin ensures that for API 35+, deprecated window bar colors are omitted
 * or replaced with modern edge-to-edge system standards, eliminating the Google Play
 * warning: "Your app uses deprecated APIs or parameters for edge-to-edge".
 */
module.exports = function withModernEdgeToEdge(config) {
  return withAndroidStyles(config, (stylesConfig) => {
    const resources = stylesConfig.modResults.resources;
    if (!resources || !Array.isArray(resources.style)) {
      return stylesConfig;
    }

    const appTheme = resources.style.find(
      (s) => s.$ && s.$.name === "AppTheme"
    );

    if (appTheme && Array.isArray(appTheme.item)) {
      // Remove deprecated statusBarColor & navigationBarColor from base theme
      // Modern Android 15 handles edge-to-edge transparency natively
      appTheme.item = appTheme.item.filter(
        (item) =>
          item.$?.name !== "android:statusBarColor" &&
          item.$?.name !== "android:navigationBarColor"
      );

      // Add windowOptOutEdgeToEdgeEnforcement=false to confirm opt-in to Android 15 edge-to-edge
      const hasOptOut = appTheme.item.some(
        (item) => item.$?.name === "android:windowOptOutEdgeToEdgeEnforcement"
      );
      if (!hasOptOut) {
        appTheme.item.push({
          $: { name: "android:windowOptOutEdgeToEdgeEnforcement" },
          _: "false",
        });
      }
    }

    return stylesConfig;
  });
};
