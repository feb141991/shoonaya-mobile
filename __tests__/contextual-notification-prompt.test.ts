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
  claimContextualReminderPrompt,
  clearContextualReminderPromptClaimsForTests,
  contextualReminderPromptStorageKey,
  resolveJapaReminderPromptAction,
} from '../lib/contextualNotificationPrompt';

test('Japa prompt is gated by both the saved preference and OS permission state', () => {
  assert.equal(resolveJapaReminderPromptAction(null, 'denied'), null);
  assert.equal(resolveJapaReminderPromptAction(false, null), null);
  assert.equal(resolveJapaReminderPromptAction(false, 'granted'), 'configure');
  assert.equal(resolveJapaReminderPromptAction(true, 'undetermined'), 'allow');
  assert.equal(resolveJapaReminderPromptAction(true, 'denied'), 'open_settings');
  assert.equal(resolveJapaReminderPromptAction(true, 'granted'), null);
  assert.equal(resolveJapaReminderPromptAction(true, 'unavailable'), null);
});

test('contextual reminder prompt keys isolate both user and feature', () => {
  assert.notEqual(contextualReminderPromptStorageKey('user-a', 'japa'), contextualReminderPromptStorageKey('user-b', 'japa'));
  assert.notEqual(contextualReminderPromptStorageKey('user-a', 'japa'), contextualReminderPromptStorageKey('user-a', 'observance'));
  assert.match(contextualReminderPromptStorageKey('user-a', 'japa'), /user-a:japa$/);
});

test('a shown Japa reminder invitation is claimed once and cooled down for 30 days', async () => {
  const userId = `prompt-test-${Date.now()}`;
  const key = contextualReminderPromptStorageKey(userId, 'japa');
  const globalKey = `shoonaya:contextual-reminder-prompt:last-shown:${userId}`;
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(globalKey);
  clearContextualReminderPromptClaimsForTests();

  assert.equal(await claimContextualReminderPrompt(userId, 'japa', 1_000_000), true);
  assert.equal(await claimContextualReminderPrompt(userId, 'japa', 1_000_001), false);

  clearContextualReminderPromptClaimsForTests();
  assert.equal(await claimContextualReminderPrompt(userId, 'japa', 1_000_000 + 29 * 24 * 60 * 60 * 1000), false);
  clearContextualReminderPromptClaimsForTests();
  assert.equal(await claimContextualReminderPrompt(userId, 'japa', 1_000_000 + 31 * 24 * 60 * 60 * 1000), true);
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(globalKey);
});

test('blank user IDs never claim a prompt', async () => {
  clearContextualReminderPromptClaimsForTests();
  assert.equal(await claimContextualReminderPrompt('', 'japa'), false);
});

test('concurrent mounts cannot both claim the same contextual prompt', async () => {
  const userId = `prompt-race-${Date.now()}`;
  const key = contextualReminderPromptStorageKey(userId, 'japa');
  const globalKey = `shoonaya:contextual-reminder-prompt:last-shown:${userId}`;
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(globalKey);
  clearContextualReminderPromptClaimsForTests();

  const claims = await Promise.all([
    claimContextualReminderPrompt(userId, 'japa'),
    claimContextualReminderPrompt(userId, 'japa'),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  await AsyncStorage.removeItem(key);
  await AsyncStorage.removeItem(globalKey);
});

test('a prompt on one feature rate-limits another feature for seven days', async () => {
  const userId = `prompt-global-${Date.now()}`;
  const japaKey = contextualReminderPromptStorageKey(userId, 'japa');
  const observanceKey = contextualReminderPromptStorageKey(userId, 'observance');
  const globalKey = `shoonaya:contextual-reminder-prompt:last-shown:${userId}`;
  await Promise.all([japaKey, observanceKey, globalKey].map((key) => AsyncStorage.removeItem(key)));
  clearContextualReminderPromptClaimsForTests();

  assert.equal(await claimContextualReminderPrompt(userId, 'japa', 2_000_000), true);
  clearContextualReminderPromptClaimsForTests();
  assert.equal(await claimContextualReminderPrompt(userId, 'observance', 2_000_000 + 6 * 24 * 60 * 60 * 1000), false);
  clearContextualReminderPromptClaimsForTests();
  assert.equal(await claimContextualReminderPrompt(userId, 'observance', 2_000_000 + 8 * 24 * 60 * 60 * 1000), true);

  await Promise.all([japaKey, observanceKey, globalKey].map((key) => AsyncStorage.removeItem(key)));
});
