import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Single source of truth for the installed app version and native build identifier.
 */
const rawVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0';
const rawBuild =
  Constants.nativeBuildVersion ??
  (Platform.OS === 'ios'
    ? Constants.expoConfig?.ios?.buildNumber
    : Constants.expoConfig?.android?.versionCode) ??
  '';

export const APP_VERSION = rawVersion;
export const APP_BUILD_NUMBER = rawBuild ? String(rawBuild) : '';
export const APP_VERSION_LABEL = APP_BUILD_NUMBER ? `v${APP_VERSION} (${APP_BUILD_NUMBER})` : `v${APP_VERSION}`;
