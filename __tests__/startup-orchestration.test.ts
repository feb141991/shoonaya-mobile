import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Node.js test environment polyfill for AsyncStorage web driver
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
  getStartupPreferences,
  getDefaultStartupPreferences,
  saveDeviceStartupPreferences,
  syncStartupPreferencesFromProfile,
  clearDeviceStartupPreferences,
  getStartupDeviceTimezone,
  setStartupPreferenceIdentity,
  STARTUP_DEVICE_PREFS_KEY,
  HOME_CACHE_USER_PREFIX,
} from '../lib/startup-scenes/preferences';
import { selectStartupScene } from '../lib/startup-scenes/selector';
import { StartupLifecycleController } from '../lib/startup-scenes/lifecycle';

describe('Startup Orchestration & Identity Safety Suite (Behavioral)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('1. Identity Safety: Isolated user cache lookup prevents cross-account tradition leakage', async () => {
    const userA_Id = 'user_abc_123';
    const userB_Id = 'user_xyz_789';

    // Seed User A's cache (Sikh)
    await AsyncStorage.setItem(
      `${HOME_CACHE_USER_PREFIX}${userA_Id}`,
      JSON.stringify({
        schema_version: 1,
        profile: { tradition: 'sikh', appLanguage: 'pa' },
        date: { timezone: 'Asia/Amritsar' },
      })
    );

    // Seed User B's cache (Jain)
    await AsyncStorage.setItem(
      `${HOME_CACHE_USER_PREFIX}${userB_Id}`,
      JSON.stringify({
        schema_version: 1,
        profile: { tradition: 'jain', appLanguage: 'hi' },
        date: { timezone: 'Asia/Kolkata' },
      })
    );

    // Unauthenticated cold start must read device prefs (or default to neutral), NEVER User A or User B
    const unauthPrefs = await getStartupPreferences(null);
    assert.equal(unauthPrefs.tradition, 'neutral');

    // Authenticated User A lookup
    const userAPrefs = await getStartupPreferences(userA_Id);
    assert.equal(userAPrefs.tradition, 'sikh');
    assert.equal(userAPrefs.language, 'pa');

    // Authenticated User B lookup
    const userBPrefs = await getStartupPreferences(userB_Id);
    assert.equal(userBPrefs.tradition, 'jain');
    assert.equal(userBPrefs.language, 'hi');
  });

  test('2. Preference Sync & Logout Safety: syncStartupPreferencesFromProfile and clearDeviceStartupPreferences', async () => {
    // User updates profile to Buddhist
    setStartupPreferenceIdentity('current-user');
    await syncStartupPreferencesFromProfile(
      { tradition: 'buddhist', appLanguage: 'en' },
      'Asia/Tokyo',
      'current-user'
    );

    // Device prefs now contain Buddhist
    const devicePrefs = await getStartupPreferences(null);
    assert.equal(devicePrefs.tradition, 'buddhist');
    assert.equal(devicePrefs.language, 'en');

    // Sign out cleans device state
    await clearDeviceStartupPreferences();
    const afterLogoutPrefs = await getStartupPreferences(null);
    assert.equal(afterLogoutPrefs.tradition, 'neutral');
  });

  test('3. Logout invalidates an in-flight preference sync before it can restore old identity data', async () => {
    setStartupPreferenceIdentity('old-user');
    const pendingWrite = syncStartupPreferencesFromProfile(
      { tradition: 'sikh', appLanguage: 'pa' },
      'Europe/London',
      'old-user'
    );

    await clearDeviceStartupPreferences();
    await pendingWrite;

    const afterRace = await getStartupPreferences(null);
    assert.equal(afterRace.tradition, 'neutral');
    assert.equal(afterRace.language, 'en');
  });

  test('4. Resilient Fail-Closed: Corrupt or malformed storage payloads never throw', async () => {
    await AsyncStorage.setItem(STARTUP_DEVICE_PREFS_KEY, '{ invalid_json ::::');
    const malformedPrefs = await getStartupPreferences(null);
    assert.equal(malformedPrefs.tradition, 'neutral');
    assert.equal(malformedPrefs.language, 'en');

    await AsyncStorage.setItem(STARTUP_DEVICE_PREFS_KEY, JSON.stringify({}));
    const emptyPrefs = await getStartupPreferences(null);
    assert.equal(emptyPrefs.tradition, 'neutral');
    assert.equal(emptyPrefs.language, 'en');
  });

  test('5. Timezone Safety: Startup device timezone resolver falls back safely', () => {
    assert.equal(getStartupDeviceTimezone('Europe/London'), 'Europe/London');
    assert.equal(getStartupDeviceTimezone('America/New_York'), 'America/New_York');

    const detected = getStartupDeviceTimezone(null);
    assert.ok(typeof detected === 'string' && detected.length > 0);
  });

  test('6. Fast launch still presents one continuous artwork scene', async () => {
    const events: string[] = [];
    const controller = new StartupLifecycleController({
      showScene: () => events.push('show-scene'),
      hideNativeSplash: () => events.push('hide-splash'),
      crossfadeScene: (done) => {
        events.push('crossfade');
        done();
      },
      hideScene: () => events.push('hide-scene'),
    });
    controller.start(false);
    assert.deepEqual(events, ['show-scene']);

    controller.notifySceneReady();
    controller.updateReady(true);
    assert.deepEqual(events, ['show-scene', 'hide-splash', 'crossfade', 'hide-scene']);
    controller.dispose();
  });

  test('7. Native splash stays until artwork is decoded, then artwork crossfades on readiness', async () => {
    const events: string[] = [];
    const controller = new StartupLifecycleController({
      showScene: () => events.push('show-scene'),
      hideNativeSplash: () => events.push('hide-splash'),
      crossfadeScene: (done) => {
        events.push('crossfade');
        setTimeout(done, 350);
      },
      hideScene: () => events.push('hide-scene'),
    });
    controller.start(false);
    assert.deepEqual(events, ['show-scene']);

    controller.notifySceneReady();
    assert.deepEqual(events, ['show-scene', 'hide-splash']);

    controller.updateReady(true);
    assert.deepEqual(events, ['show-scene', 'hide-splash', 'crossfade']);

    // At 1000ms (after 350ms crossfade), scene is unmounted
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.deepEqual(events, ['show-scene', 'hide-splash', 'crossfade', 'hide-scene']);
    controller.dispose();
  });

  test('8. Artwork fallback prevents a failed decode from trapping the native splash', async () => {
    const events: string[] = [];
    const controller = new StartupLifecycleController({
      showScene: () => events.push('show-scene'),
      hideNativeSplash: () => events.push('hide-splash'),
      crossfadeScene: (done) => {
        events.push('crossfade');
        done();
      },
      hideScene: () => events.push('hide-scene'),
    }, { artworkFallbackMs: 10 });

    controller.start(false);
    controller.updateReady(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.deepEqual(events, ['show-scene', 'hide-splash', 'crossfade', 'hide-scene']);
    controller.dispose();
  });
});
