import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

import { apiFetch } from '@/lib/api';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/appVersion';
import { createSingleFlight } from '@/lib/async-single-flight';
import { createUpdateAlertGate } from '@/lib/updateAlertGate';
import { getLanguageStorageKey } from '@/lib/i18n/language-storage';
import { getAppIdentity } from '@/lib/appIdentity';
import { isAppLanguage } from '@/lib/language-runtime';
import { getUpdateCopy } from '@/lib/updateCopy';
import {
  evaluateStoreVersionPolicy,
  parseAppVersionInfo,
  type StoreUpdateCheckResult,
} from '@/lib/updatePolicy';

export {
  compareSemVer,
  evaluateStoreVersionPolicy,
  parseAppVersionInfo,
  type AppVersionInfo,
  type StoreUpdateCheckResult,
} from '@/lib/updatePolicy';

const LAST_OPTIONAL_PROMPT_KEY = 'shoonaya_last_optional_update_prompt_ms';
const PROMPT_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

const easCheckFlight = createSingleFlight<{ isAvailable: boolean; isDownloaded: boolean }>();
const storeCheckFlight = createSingleFlight<StoreUpdateCheckResult>();
const automaticCheckFlight = createSingleFlight<void>();
const manualCheckFlight = createSingleFlight<void>();
let downloadedOtaPromptPending = false;

async function getPreferredUpdateLanguage() {
  const key = getLanguageStorageKey(getAppIdentity());
  if (!key) return null;
  const value = await AsyncStorage.getItem(key).catch(() => null);
  return isAppLanguage(value) ? value : null;
}

function getNativeStorePlatform(): 'android' | 'ios' | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return null;
}

const updateAlertGate = createUpdateAlertGate((title, message, buttons, options) => {
  Alert.alert(title, message, buttons, options);
});
const showExclusiveAlert = updateAlertGate.show;

async function openStoreUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    const language = await getPreferredUpdateLanguage();
    const copy = getUpdateCopy(language);
    showExclusiveAlert(copy.storeOpenFailedTitle, copy.storeOpenFailedMessage(url));
  }
}

async function getPreferredUpdateCopy() {
  const language = await getPreferredUpdateLanguage();
  return getUpdateCopy(language);
}

async function presentDownloadedOtaUpdate(canPresentPrompt: () => boolean): Promise<boolean> {
  if (!downloadedOtaPromptPending || !canPresentPrompt()) return false;
  const copy = await getPreferredUpdateCopy();
  if (!canPresentPrompt()) return false;

  const shown = showExclusiveAlert(
    copy.otaTitle,
    copy.otaMessage,
    [
      { text: copy.later, style: 'cancel' },
      {
        text: copy.restartNow,
        onPress: async () => {
          try {
            await Updates.reloadAsync();
          } catch (err) {
            console.warn('[updateManager] Reload failed:', err);
            const failureCopy = await getPreferredUpdateCopy();
            showExclusiveAlert(failureCopy.restartFailedTitle, failureCopy.restartFailedMessage);
          }
        },
      },
    ]
  );
  if (shown) downloadedOtaPromptPending = false;
  return shown;
}

async function checkAndApplyEASUpdateOnce(
  mode: 'silent' | 'prompt' | 'manual',
  canPresentPrompt: () => boolean = () => true
): Promise<{ isAvailable: boolean; isDownloaded: boolean }> {
  if (__DEV__ || !Updates.isEnabled) {
    return { isAvailable: false, isDownloaded: false };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { isAvailable: false, isDownloaded: false };

    const fetchResult = await Updates.fetchUpdateAsync();
    if (!fetchResult.isNew) return { isAvailable: true, isDownloaded: false };
    if (mode === 'silent') return { isAvailable: true, isDownloaded: true };
    downloadedOtaPromptPending = true;
    await presentDownloadedOtaUpdate(canPresentPrompt);
    return { isAvailable: true, isDownloaded: true };
  } catch (error) {
    console.warn('[updateManager] EAS update check failed:', error);
    return { isAvailable: false, isDownloaded: false };
  }
}

/** Checks EAS once even if startup, resume, and a manual tap overlap. */
export function checkAndApplyEASUpdate(
  mode: 'silent' | 'prompt' | 'manual' = 'prompt',
  canPresentPrompt: () => boolean = () => true
): Promise<{ isAvailable: boolean; isDownloaded: boolean }> {
  return easCheckFlight.run(() => checkAndApplyEASUpdateOnce(mode, canPresentPrompt));
}

async function checkStoreBinaryUpdateOnce(): Promise<StoreUpdateCheckResult> {
  const platform = getNativeStorePlatform();
  if (!platform) return { type: 'ERROR', message: 'Unsupported platform' };

  try {
    const response = await apiFetch(`/api/native/app-version?platform=${platform}`, {
      headers: { Accept: 'application/json' },
      timeoutMs: 7_000,
    });
    if (!response.ok) return { type: 'ERROR', message: `Update policy unavailable (${response.status})` };

    const policy = parseAppVersionInfo(await response.json(), platform);
    if (!policy) return { type: 'ERROR', message: 'Invalid update policy response' };

    return evaluateStoreVersionPolicy(APP_VERSION, policy, platform);
  } catch (err) {
    return {
      type: 'ERROR',
      message: err instanceof Error ? err.message : 'Update check failed',
    };
  }
}

/** Reads the public store policy once when multiple startup/resume callers overlap. */
export function checkStoreBinaryUpdate(): Promise<StoreUpdateCheckResult> {
  return storeCheckFlight.run(checkStoreBinaryUpdateOnce);
}

async function wasOptionalPromptRecentlyShown(): Promise<boolean> {
  try {
    const lastPrompt = await AsyncStorage.getItem(LAST_OPTIONAL_PROMPT_KEY);
    const lastPromptMs = lastPrompt ? Number(lastPrompt) : 0;
    return Number.isFinite(lastPromptMs) && Date.now() - lastPromptMs < PROMPT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

async function recordOptionalPromptShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_OPTIONAL_PROMPT_KEY, String(Date.now()));
  } catch {
    // Prompt remains usable if local cooldown persistence is unavailable.
  }
}

async function presentStoreUpdateResult(
  result: StoreUpdateCheckResult,
  isManualCheck: boolean,
  showTerminalResult = true,
  canPresentOptionalPrompt: () => boolean = () => true
): Promise<boolean> {
  if (result.type === 'MANDATORY') {
    const copy = await getPreferredUpdateCopy();
    const notes = result.releaseNotes ? `\n\n${result.releaseNotes}` : '';
    return showExclusiveAlert(
      copy.requiredTitle,
      copy.requiredMessage(result.latestVersion, notes),
      [{ text: copy.updateOnStore, onPress: () => openStoreUrl(result.storeUrl) }],
      { cancelable: false }
    );
  }

  if (result.type === 'OPTIONAL') {
    if (!isManualCheck && !canPresentOptionalPrompt()) return false;
    if (!isManualCheck && await wasOptionalPromptRecentlyShown()) return false;
    if (!isManualCheck && !canPresentOptionalPrompt()) return false;

    // Persist on presentation so Android back/outside dismissal also observes
    // the five-day cooldown; relying on button callbacks misses those cases.
    const copy = await getPreferredUpdateCopy();
    const notes = result.releaseNotes ? `\n\n${result.releaseNotes}` : '';
    const shown = showExclusiveAlert(
      copy.optionalVersionTitle,
      copy.optionalVersionMessage(result.latestVersion, notes),
      [
        { text: copy.remindLater, style: 'cancel' },
        { text: copy.updateNow, onPress: () => openStoreUrl(result.storeUrl) },
      ]
    );
    if (shown) void recordOptionalPromptShown();
    return shown;
  }

  if (isManualCheck && showTerminalResult && result.type === 'UP_TO_DATE') {
    const copy = await getPreferredUpdateCopy();
    return showExclusiveAlert(copy.upToDateTitle, copy.upToDateMessage(APP_VERSION_LABEL));
  }

  if (isManualCheck && showTerminalResult && result.type === 'ERROR') {
    const copy = await getPreferredUpdateCopy();
    return showExclusiveAlert(copy.unavailableTitle, copy.unavailableMessage);
  }

  return false;
}

/** Checks the native store policy and presents at most one store prompt. */
export async function promptStoreUpdateIfNeeded(isManualCheck = false): Promise<boolean> {
  const result = await checkStoreBinaryUpdate();
  return presentStoreUpdateResult(result, isManualCheck);
}

/** One non-blocking automatic pass; store and OTA prompts never compete. */
export function runAutomaticUpdateCheck(
  canPresentOptionalPrompt: () => boolean = () => true
): Promise<void> {
  return automaticCheckFlight.run(async () => {
    const storeResult = await checkStoreBinaryUpdate();
    const storePromptShown = await presentStoreUpdateResult(
      storeResult,
      false,
      true,
      canPresentOptionalPrompt
    );
    if (storePromptShown || storeResult.type === 'MANDATORY') return;
    if (!canPresentOptionalPrompt()) return;
    if (downloadedOtaPromptPending) {
      await presentDownloadedOtaUpdate(canPresentOptionalPrompt);
      return;
    }
    await checkAndApplyEASUpdate('prompt', canPresentOptionalPrompt);
  });
}

/** Manual entry point shared by Profile and Settings. */
export function performManualUpdateCheck(): Promise<void> {
  return manualCheckFlight.run(async () => {
    const storeResult = await checkStoreBinaryUpdate();
    const storePromptShown = await presentStoreUpdateResult(storeResult, true, false);
    if (storePromptShown) return;

    if (downloadedOtaPromptPending) {
      if (await presentDownloadedOtaUpdate(() => true)) return;
    }

    const otaResult = await checkAndApplyEASUpdate('manual');
    if (otaResult.isDownloaded) return;

    if (storeResult.type === 'UP_TO_DATE') {
      const copy = await getPreferredUpdateCopy();
      showExclusiveAlert(copy.upToDateTitle, copy.upToDateMessage(APP_VERSION_LABEL));
    } else if (storeResult.type === 'ERROR') {
      const copy = await getPreferredUpdateCopy();
      showExclusiveAlert(copy.unavailableTitle, copy.unavailableMessage);
    }
  });
}
