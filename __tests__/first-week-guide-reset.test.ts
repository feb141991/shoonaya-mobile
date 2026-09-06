import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resetFirstWeekGuideCue,
  FIRST_WEEK_STORAGE_KEY as STORAGE_KEY,
  FIRST_WEEK_DISMISS_KEY as DISMISS_KEY,
} from '@/lib/firstWeekGuideStorage';

describe('resetFirstWeekGuideCue — Settings "replay first-use tips" support', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('clears both completed-acts progress and the dismiss flag', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(['sacred_text', 'japa']));
    await AsyncStorage.setItem(DISMISS_KEY, 'true');

    await resetFirstWeekGuideCue();

    assert.equal(await AsyncStorage.getItem(STORAGE_KEY), null);
    assert.equal(await AsyncStorage.getItem(DISMISS_KEY), null);
  });

  it('is a no-op, not a throw, when nothing was ever stored', async () => {
    await assert.doesNotReject(resetFirstWeekGuideCue());
    assert.equal(await AsyncStorage.getItem(STORAGE_KEY), null);
    assert.equal(await AsyncStorage.getItem(DISMISS_KEY), null);
  });
});
