import assert from 'node:assert/strict';
import test from 'node:test';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() { return memoryStore.size; },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  claimNotificationPermissionPrompt,
  clearNotificationPromptClaimsForTests,
  dismissNotificationPermissionPrompt,
  notificationPromptStorageKey,
} from '../lib/notificationPermissionPrompt';
import { normalizeNotificationPermissionState } from '../lib/notificationPermissionState';

test('notification prompt dismissal storage is scoped to the signed-in user', () => {
  clearNotificationPromptClaimsForTests();
  assert.notEqual(notificationPromptStorageKey('user-a'), notificationPromptStorageKey('user-b'));
  assert.equal(
    notificationPromptStorageKey('user-a'),
    'shoonaya:notification_prompt_dismissed:user-a',
  );
});

test('normalizes iOS authorization states without treating denial as undetermined', () => {
  const permission = (iosStatus: number) => ({
    granted: false,
    status: iosStatus === 1 ? 'denied' : 'undetermined',
    canAskAgain: iosStatus === 0,
    expires: 'never',
    ios: { status: iosStatus },
  });

  assert.equal(normalizeNotificationPermissionState(permission(0) as never), 'undetermined');
  assert.equal(normalizeNotificationPermissionState(permission(1) as never), 'denied');
  assert.equal(normalizeNotificationPermissionState(permission(2) as never), 'granted');
  assert.equal(normalizeNotificationPermissionState(permission(3) as never), 'granted');
});

test('global permission prompt is persisted when shown and cooled down for 30 days', async () => {
  const userId = `permission-prompt-${Date.now()}`;
  const key = notificationPromptStorageKey(userId);
  await AsyncStorage.removeItem(key);
  clearNotificationPromptClaimsForTests();

  assert.equal(await claimNotificationPermissionPrompt(userId, 1_000_000), true);
  clearNotificationPromptClaimsForTests();
  assert.equal(await claimNotificationPermissionPrompt(userId, 1_000_000 + 29 * 24 * 60 * 60 * 1000), false);
  clearNotificationPromptClaimsForTests();
  assert.equal(await claimNotificationPermissionPrompt(userId, 1_000_000 + 31 * 24 * 60 * 60 * 1000), true);

  await dismissNotificationPermissionPrompt(userId, 1_000_000 + 31 * 24 * 60 * 60 * 1000);
  await AsyncStorage.removeItem(key);
});

test('concurrent auth events cannot claim duplicate global permission prompts', async () => {
  const userId = `permission-race-${Date.now()}`;
  const key = notificationPromptStorageKey(userId);
  await AsyncStorage.removeItem(key);
  clearNotificationPromptClaimsForTests();

  const claims = await Promise.all([
    claimNotificationPermissionPrompt(userId),
    claimNotificationPermissionPrompt(userId),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  await AsyncStorage.removeItem(key);
});
