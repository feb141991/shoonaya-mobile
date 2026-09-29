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
  resolveContextualReminderPromptAction,
  resolveObservanceReminderPreference,
  isSankalpaReminderPromptEligible,
} from '../lib/contextualNotificationPrompt';

test('Japa prompt is gated by both the saved preference and OS permission state', () => {
  assert.equal(resolveContextualReminderPromptAction(null, 'denied'), null);
  assert.equal(resolveContextualReminderPromptAction(false, null), null);
  assert.equal(resolveContextualReminderPromptAction(false, 'granted'), 'configure');
  assert.equal(resolveContextualReminderPromptAction(true, 'undetermined'), 'allow');
  assert.equal(resolveContextualReminderPromptAction(true, 'denied'), 'open_settings');
  assert.equal(resolveContextualReminderPromptAction(true, 'granted'), null);
  assert.equal(resolveContextualReminderPromptAction(true, 'unavailable'), null);
});

test('observance prompts follow the exact visible occurrence category', () => {
  const preferences = { festival: false, vrat: true };
  assert.equal(resolveObservanceReminderPreference('festival', preferences), false);
  assert.equal(resolveObservanceReminderPreference('vrat', preferences), true);
  assert.equal(resolveObservanceReminderPreference('panchang', preferences), null);
});

test('Sankalpa midpoint nudge only appears before midpoint and before today is honoured', () => {
  assert.equal(isSankalpaReminderPromptEligible(1, 21, false), true);
  assert.equal(isSankalpaReminderPromptEligible(11, 21, false), false);
  assert.equal(isSankalpaReminderPromptEligible(2, 21, true), false);
  assert.equal(isSankalpaReminderPromptEligible(0, 21, false), false);
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
