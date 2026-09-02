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
  readSettingsCache,
  writeSettingsCache,
  clearSettingsCache,
  clearAllSettingsCaches,
  mergeServerWithPending,
  classifyWriteFailure,
  nextBackoffMs,
  RETRY_BACKOFF_MS,
  type SettingsCacheEnvelope,
  type SettingsFields,
  type PendingSettingsWrite,
} from '../lib/settingsCache';

const sampleSettings: SettingsFields = {
  wants_festival_reminders: true,
  wants_shloka_reminders: true,
  wants_nitya_reminders: true,
  wants_community_notifications: true,
  wants_family_notifications: true,
  app_language: 'en',
  transliteration_language: 'en',
  meaning_language: 'en',
  consent_religious_data: false,
};

function envelope(overrides: Partial<SettingsCacheEnvelope> = {}): SettingsCacheEnvelope {
  return {
    schemaVersion: 2,
    identity: { kind: 'authenticated', userId: 'user-A' },
    savedAt: Date.now(),
    settings: sampleSettings,
    serverUpdatedAt: null,
    pendingOperations: [],
    ...overrides,
  };
}

describe('Settings cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearAllSettingsCaches();
    await AsyncStorage.removeItem('shoonaya_mobile_settings');
  });

  it('one user cannot read another user\'s cached settings', async () => {
    await writeSettingsCache(envelope({
      identity: { kind: 'authenticated', userId: 'user-A' },
      settings: { ...sampleSettings, app_language: 'hi' },
    }));

    const userB = await readSettingsCache({ kind: 'authenticated', userId: 'user-B' });
    assert.equal(userB, null, 'User B must never see User A\'s cached settings');

    const userA = await readSettingsCache({ kind: 'authenticated', userId: 'user-A' });
    assert.equal(userA?.settings.app_language, 'hi');
  });

  it('guest and authenticated caches are fully isolated', async () => {
    await writeSettingsCache(envelope({ identity: { kind: 'guest' }, settings: { ...sampleSettings, app_language: 'pa' } }));
    await writeSettingsCache(envelope({ identity: { kind: 'authenticated', userId: 'user-C' }, settings: { ...sampleSettings, app_language: 'hi' } }));

    const guest = await readSettingsCache({ kind: 'guest' });
    const user = await readSettingsCache({ kind: 'authenticated', userId: 'user-C' });
    assert.equal(guest?.settings.app_language, 'pa');
    assert.equal(user?.settings.app_language, 'hi');
  });

  it('the legacy unscoped global key is purged, never read as a cache hit', async () => {
    // Simulates the pre-fix global blob that could belong to anyone.
    await AsyncStorage.setItem('shoonaya_mobile_settings', JSON.stringify(sampleSettings));

    const result = await readSettingsCache({ kind: 'authenticated', userId: 'user-D' });
    assert.equal(result, null, 'The legacy key must never be attributed to a signed-in user');

    const legacyStillThere = await AsyncStorage.getItem('shoonaya_mobile_settings');
    assert.equal(legacyStillThere, null, 'The legacy key must be deleted, not left behind or migrated');
  });

  it('logout/account-switch purge removes cache AND queued mutations together', async () => {
    const pendingOp: PendingSettingsWrite = {
      id: 'op-1',
      fields: { app_language: 'hi' },
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      status: 'pending',
    };
    await writeSettingsCache(envelope({ identity: { kind: 'authenticated', userId: 'user-E' }, pendingOperations: [pendingOp] }));

    await clearSettingsCache({ kind: 'authenticated', userId: 'user-E' });

    const result = await readSettingsCache({ kind: 'authenticated', userId: 'user-E' });
    assert.equal(result, null, 'Both settings and its pending mutation must be gone after purge');
  });

  it('clearAllSettingsCaches wipes every identity', async () => {
    await writeSettingsCache(envelope({ identity: { kind: 'guest' } }));
    await writeSettingsCache(envelope({ identity: { kind: 'authenticated', userId: 'user-F' } }));

    await clearAllSettingsCaches();

    assert.equal(await readSettingsCache({ kind: 'guest' }), null);
    assert.equal(await readSettingsCache({ kind: 'authenticated', userId: 'user-F' }), null);
  });

  it('fails safe on a corrupt cache entry instead of throwing or returning malformed data', async () => {
    await AsyncStorage.setItem('shoonaya_settings_cache_v2_user_user-G', 'not valid json{{{');
    const result = await readSettingsCache({ kind: 'authenticated', userId: 'user-G' });
    assert.equal(result, null);
  });

  it('fails safe on a stale schema version instead of returning outdated-shaped data', async () => {
    await AsyncStorage.setItem(
      'shoonaya_settings_cache_v2_user_user-H',
      JSON.stringify({ ...envelope({ identity: { kind: 'authenticated', userId: 'user-H' } }), schemaVersion: 1 })
    );
    const result = await readSettingsCache({ kind: 'authenticated', userId: 'user-H' });
    assert.equal(result, null);
  });
});

describe('Settings merge policy -- server wins except pending writes', () => {
  it('server value wins for any field with no pending write', () => {
    const merged = mergeServerWithPending(sampleSettings, []);
    assert.deepEqual(merged, sampleSettings);
  });

  it('a pending write overrides the server value only for its own fields', () => {
    const pending: PendingSettingsWrite = {
      id: 'op-1',
      fields: { app_language: 'hi' },
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      status: 'pending',
    };
    const server = { ...sampleSettings, app_language: 'en' as const, consent_religious_data: true };
    const merged = mergeServerWithPending(server, [pending]);
    assert.equal(merged.app_language, 'hi', 'Pending write still wins for its own field');
    assert.equal(merged.consent_religious_data, true, 'Server value passes through untouched for fields with no pending write');
  });

  it('a failed (non-pending) write does not override server precedence', () => {
    const failed: PendingSettingsWrite = {
      id: 'op-1',
      fields: { app_language: 'hi' },
      attempts: 4,
      nextAttemptAt: 0,
      createdAt: Date.now(),
      status: 'failed',
    };
    const merged = mergeServerWithPending(sampleSettings, [failed]);
    assert.equal(merged.app_language, sampleSettings.app_language, 'A failed write must not silently win over server truth');
  });
});

describe('Settings retry policy', () => {
  it('classifies a 5xx as retryable at the first backoff stage', () => {
    const outcome = classifyWriteFailure(500, null);
    assert.equal(outcome.kind, 'retry');
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, RETRY_BACKOFF_MS[0]);
  });

  it('classifies a network failure (status 0) as retryable', () => {
    const outcome = classifyWriteFailure(0, null);
    assert.equal(outcome.kind, 'retry');
  });

  it('honors Retry-After on 429', () => {
    const outcome = classifyWriteFailure(429, '30');
    assert.equal(outcome.kind, 'retry');
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, 30_000);
  });

  it('falls back to standard backoff on 429 with no Retry-After header', () => {
    const outcome = classifyWriteFailure(429, null);
    assert.equal(outcome.kind, 'retry');
    if (outcome.kind === 'retry') assert.equal(outcome.afterMs, RETRY_BACKOFF_MS[0]);
  });

  it('classifies most 4xx as a permanent failure -- no automatic retry', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      const outcome = classifyWriteFailure(status, null);
      assert.equal(outcome.kind, 'permanent_failure', `status ${status} should be permanent`);
    }
  });

  it('exhausts the exact backoff table before giving up', () => {
    assert.equal(nextBackoffMs(0), 2_000);
    assert.equal(nextBackoffMs(1), 10_000);
    assert.equal(nextBackoffMs(2), 60_000);
    assert.equal(nextBackoffMs(3), 300_000);
    assert.equal(nextBackoffMs(4), null, 'Must stop retrying after the table is exhausted, never retry forever');
  });
});
