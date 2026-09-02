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
  readNotificationsCache,
  writeNotificationsCache,
  patchNotificationsCache,
  writePendingNotificationOperations,
  clearNotificationsCache,
  clearAllNotificationsCaches,
  deriveUnreadCount,
  type PendingNotificationOperation,
} from '../lib/notificationsCache';
import type { NotificationRow } from '../lib/notificationsData';

function row(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'notif-1',
    user_id: 'user-A',
    title: 'Test',
    body: 'Body',
    emoji: null,
    type: 'festival',
    read: false,
    action_url: null,
    notification_key: null,
    local_date: null,
    sent_timezone: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Notifications cache -- identity isolation', () => {
  beforeEach(async () => {
    await clearAllNotificationsCaches();
  });

  it('one user cannot read another user\'s cached inbox', async () => {
    await writeNotificationsCache('user-A', [row({ id: 'a-1', user_id: 'user-A' })]);

    const userB = await readNotificationsCache('user-B');
    assert.equal(userB, null, 'User B must never see User A\'s cached notifications');

    const userA = await readNotificationsCache('user-A');
    assert.equal(userA?.notifications[0]?.id, 'a-1');
  });

  it('logout purge (clearAllNotificationsCaches) removes every identity', async () => {
    await writeNotificationsCache('user-C', [row({ user_id: 'user-C' })]);
    await writeNotificationsCache('user-D', [row({ user_id: 'user-D' })]);

    await clearAllNotificationsCaches();

    assert.equal(await readNotificationsCache('user-C'), null);
    assert.equal(await readNotificationsCache('user-D'), null);
  });

  it('clearing one identity does not remove another\'s', async () => {
    await writeNotificationsCache('user-E', [row({ user_id: 'user-E' })]);
    await writeNotificationsCache('user-F', [row({ user_id: 'user-F' })]);

    await clearNotificationsCache('user-E');

    assert.equal(await readNotificationsCache('user-E'), null);
    assert.notEqual(await readNotificationsCache('user-F'), null);
  });

  it('fails safe on a corrupt cache entry', async () => {
    await AsyncStorage.setItem('shoonaya_notifications_cache_v2_user_user-G', '{{{not json');
    const result = await readNotificationsCache('user-G');
    assert.equal(result, null);
  });

  it('fails safe on a stale schema version', async () => {
    await AsyncStorage.setItem(
      'shoonaya_notifications_cache_v2_user_user-H',
      JSON.stringify({ schemaVersion: 99, userId: 'user-H', savedAt: Date.now(), notifications: [], pendingOperations: [] })
    );
    const result = await readNotificationsCache('user-H');
    assert.equal(result, null);
  });
});

describe('Notifications cache -- reconciliation (badge reuse)', () => {
  beforeEach(async () => {
    await clearAllNotificationsCaches();
  });

  it('mark-read reconciliation is visible to a fresh read (Home badge scenario)', async () => {
    await writeNotificationsCache('user-I', [row({ id: 'n1', read: false }), row({ id: 'n2', read: false })]);

    await patchNotificationsCache('user-I', (current) =>
      current.map((n) => (n.id === 'n1' ? { ...n, read: true } : n))
    );

    const after = await readNotificationsCache('user-I');
    assert.equal(deriveUnreadCount(after?.notifications ?? []), 1, 'Badge-derived count reflects the mark-read without a second fetch');
  });

  it('clear reconciliation empties the cache the badge reads from', async () => {
    await writeNotificationsCache('user-J', [row({ id: 'n1' }), row({ id: 'n2' })]);
    await writeNotificationsCache('user-J', []);

    const after = await readNotificationsCache('user-J');
    assert.equal(deriveUnreadCount(after?.notifications ?? []), 0);
  });

  it('patchNotificationsCache on an empty/missing cache starts from an empty list, not a crash', async () => {
    await patchNotificationsCache('user-K', (current) => [...current, row({ id: 'new', user_id: 'user-K' })]);
    const after = await readNotificationsCache('user-K');
    assert.equal(after?.notifications.length, 1);
  });
});

describe('deriveUnreadCount', () => {
  it('counts only unread rows', () => {
    const rows = [row({ read: true }), row({ read: false }), row({ read: false })];
    assert.equal(deriveUnreadCount(rows), 2);
  });

  it('returns 0 for an empty list', () => {
    assert.equal(deriveUnreadCount([]), 0);
  });
});

function pendingOp(overrides: Partial<PendingNotificationOperation> = {}): PendingNotificationOperation {
  return {
    id: 'op-1',
    action: { kind: 'mark_read', notificationId: 'n1' },
    attempts: 0,
    nextAttemptAt: Date.now(),
    createdAt: Date.now(),
    status: 'pending',
    ...overrides,
  };
}

describe('Notifications outbox -- durability', () => {
  beforeEach(async () => {
    await clearAllNotificationsCaches();
  });

  it('a queued operation survives a write that only touches the notification list', async () => {
    await writeNotificationsCache('user-L', [row({ id: 'n1' })]);
    await writePendingNotificationOperations('user-L', [pendingOp()]);

    // Simulates a plain list refresh (e.g. getMyUnreadNotificationCount's
    // reconciling write) that doesn't know about the outbox -- it must not
    // silently wipe a queued mutation.
    await writeNotificationsCache('user-L', [row({ id: 'n1' }), row({ id: 'n2' })]);

    const after = await readNotificationsCache('user-L');
    assert.equal(after?.pendingOperations.length, 1, 'A list-only write must preserve the existing outbox');
  });

  it('patchNotificationsCache (mark-read reconciliation) also preserves the outbox', async () => {
    await writeNotificationsCache('user-M', [row({ id: 'n1', read: false })]);
    await writePendingNotificationOperations('user-M', [pendingOp({ id: 'op-x' })]);

    await patchNotificationsCache('user-M', (current) => current.map((n) => ({ ...n, read: true })));

    const after = await readNotificationsCache('user-M');
    assert.equal(after?.pendingOperations[0]?.id, 'op-x');
  });

  it('writePendingNotificationOperations replaces the queue without touching the cached list', async () => {
    await writeNotificationsCache('user-N', [row({ id: 'n1' })]);
    await writePendingNotificationOperations('user-N', [pendingOp()]);
    await writePendingNotificationOperations('user-N', []);

    const after = await readNotificationsCache('user-N');
    assert.equal(after?.pendingOperations.length, 0);
    assert.equal(after?.notifications.length, 1, 'The notification list itself is untouched by an outbox-only write');
  });

  it('clearAllNotificationsCaches also sweeps the pre-outbox v1 key shape', async () => {
    await AsyncStorage.setItem('shoonaya_notifications_cache_v1_user_user-O', JSON.stringify({ userId: 'user-O', notifications: [] }));
    await clearAllNotificationsCaches();
    assert.equal(await AsyncStorage.getItem('shoonaya_notifications_cache_v1_user_user-O'), null);
  });

  it('a "pending" operation is distinguishable from a "failed" one for auto-resume purposes', () => {
    const pending = pendingOp({ status: 'pending' });
    const failed = pendingOp({ id: 'op-2', status: 'failed', attempts: 4 });
    const resumable = [pending, failed].filter((op) => op.status === 'pending');
    assert.deepEqual(resumable.map((op) => op.id), ['op-1'], 'Only pending entries auto-resume; failed waits for explicit Retry');
  });
});
