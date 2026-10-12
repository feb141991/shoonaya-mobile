import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiFetch } from '@/lib/api';
import { configureNativeAnalytics, deleteNativeAnalyticsHistory, setNativeAnalyticsEnabled, setNativePracticeAnalyticsEnabled, type AnalyticsEventName } from '@/lib/analytics';
import { APP_VERSION } from '@/lib/appVersion';
import { Platform } from 'react-native';

const consentKey = (userId: string) => `shoonaya:product_analytics_consent:${userId}`;
const practiceConsentKey = (userId: string) => `shoonaya:practice_analytics_consent:${userId}`;
let configured = false;
let activeUserId: string | null = null;
let initializationGeneration = 0;

function configureTransport(): void {
  if (configured) return;
  configured = true;
  configureNativeAnalytics({
    send: async (event: AnalyticsEventName) => {
      const userId = activeUserId;
      if (!userId) return;
      const response = await apiFetch('/api/native/product-analytics', {
        method: 'POST',
        expectedUserId: userId,
        body: JSON.stringify({
          events: [event],
          appVersion: APP_VERSION,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : undefined,
        }),
      });
      const result = await response.json().catch(() => null) as {
        consentRequired?: boolean;
        religiousConsentRequired?: boolean;
      } | null;
      if (activeUserId !== userId) return;
      if (result?.consentRequired) {
        await AsyncStorage.setItem(consentKey(userId), 'false').catch(() => {});
        await AsyncStorage.setItem(practiceConsentKey(userId), 'false').catch(() => {});
        await setNativeAnalyticsEnabled(false);
      } else if (result?.religiousConsentRequired) {
        await AsyncStorage.setItem(practiceConsentKey(userId), 'false').catch(() => {});
        await setNativePracticeAnalyticsEnabled(false);
      }
    },
    withdraw: async (userId) => {
      await AsyncStorage.setItem(consentKey(userId), 'false').catch(() => {});
      await AsyncStorage.setItem(practiceConsentKey(userId), 'false').catch(() => {});
      await apiFetch('/api/native/product-analytics', {
        method: 'DELETE',
        expectedUserId: userId,
      }).catch(() => {});
    },
  });
}

/** Fail-closed identity switch: only a previously stored affirmative consent enables collection. */
export async function initializeProductAnalytics(userId: string | null): Promise<void> {
  configureTransport();
  const generation = ++initializationGeneration;
  // Close both gates synchronously before reading another account's cache.
  await setNativeAnalyticsEnabled(false);
  await setNativePracticeAnalyticsEnabled(false);
  activeUserId = userId;
  if (!userId) {
    return;
  }
  const [stored, practiceStored] = await Promise.all([
    AsyncStorage.getItem(consentKey(userId)).catch(() => null),
    AsyncStorage.getItem(practiceConsentKey(userId)).catch(() => null),
  ]);
  if (generation !== initializationGeneration || activeUserId !== userId) return;
  await setNativeAnalyticsEnabled(stored === 'true');
  await setNativePracticeAnalyticsEnabled(practiceStored === 'true');
}

/** Called only after the product-analytics setting is read or acknowledged. */
export async function applyProductAnalyticsConsent(userId: string, enabled: boolean): Promise<void> {
  configureTransport();
  const generation = ++initializationGeneration;
  await AsyncStorage.setItem(consentKey(userId), String(enabled)).catch(() => {});
  if (generation === initializationGeneration && activeUserId === userId) {
    await setNativeAnalyticsEnabled(enabled);
    if (!enabled) {
      await AsyncStorage.setItem(practiceConsentKey(userId), 'false').catch(() => {});
      await setNativePracticeAnalyticsEnabled(false);
    }
  }
}

/** Called only after the separate religious-data setting is read or acknowledged. */
export async function applyPracticeAnalyticsConsent(userId: string, enabled: boolean): Promise<void> {
  configureTransport();
  const generation = initializationGeneration;
  await AsyncStorage.setItem(practiceConsentKey(userId), String(enabled)).catch(() => {});
  if (generation === initializationGeneration && activeUserId === userId) {
    await setNativePracticeAnalyticsEnabled(enabled);
  }
}

/** Close the practice-only gate immediately while its profile write is pending. */
export async function revokePracticeAnalyticsConsent(userId: string): Promise<void> {
  configureTransport();
  if (activeUserId === userId) await setNativePracticeAnalyticsEnabled(false);
  await AsyncStorage.setItem(practiceConsentKey(userId), 'false').catch(() => {});
}

/** Immediately stop local collection when the user turns consent off, even if sync must retry. */
export async function revokeProductAnalyticsConsent(userId: string): Promise<void> {
  configureTransport();
  ++initializationGeneration;
  if (activeUserId === userId) void setNativeAnalyticsEnabled(false);
  await AsyncStorage.setItem(consentKey(userId), 'false').catch(() => {});
  // The deletion is explicitly bound to userId and remains safe if the active
  // account changes while local storage is being updated.
  await deleteNativeAnalyticsHistory(userId);
}
