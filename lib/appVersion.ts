import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { buildReleaseId } from '@/lib/releaseId';

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

/**
 * What every diagnostic, telemetry, analytics and consent record sends as its app
 * version: `1.0.0+47`, or `1.0.0+47.ota.1a2b3c4d` while an OTA update runs (see
 * lib/releaseId.ts). Use APP_VERSION only to compare against store versions.
 */
export const APP_RELEASE_ID = buildReleaseId({
  version: APP_VERSION,
  build: APP_BUILD_NUMBER,
  updateId: Updates.isEnabled ? Updates.updateId : null,
  isEmbeddedLaunch: Updates.isEmbeddedLaunch,
});
