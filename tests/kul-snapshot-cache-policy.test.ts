import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isUsableKulSnapshotCacheEnvelope,
  KUL_SNAPSHOT_CACHE_MAX_AGE_MS,
  KUL_SNAPSHOT_CACHE_SCHEMA_VERSION,
  removeKulInviteCodeFromCachedSnapshot,
} from '../lib/kulSnapshotCachePolicy';
import type { KulSnapshot } from '../lib/kul';

function snapshot(): KulSnapshot {
  return {
    userId: 'user-1',
    today: '2026-10-05',
    kul: {
      id: 'kul-1', name: 'Sharma Family', avatarEmoji: '🏡', createdAt: '2026-10-01T00:00:00.000Z',
      inviteCode: 'SECRETINVITE',
      lineage: { gotra: null, pravara: null, kuldeviName: null, kuldevtaName: null, kuldeviPlaceId: null,
        kuldevtaPlaceId: null, ancestralOrigin: null, kulacharaNotes: null },
      calendarReference: { label: 'Ujjain reference', timezone: 'Asia/Kolkata', monthSystem: 'amanta', latitude: 23.1765, longitude: 75.7885 },
    },
    role: 'guardian' as const,
    members: [{ id: 'membership-1', userId: 'user-1', role: 'guardian' as const, joinedAt: '2026-10-01T00:00:00.000Z', profile: null }],
    tasks: [], messages: [], familyMembers: [], events: [], tirthaWishes: [],
  };
}

function envelope(savedAt = 1_000) {
  return {
    schemaVersion: KUL_SNAPSHOT_CACHE_SCHEMA_VERSION,
    userId: 'user-1',
    savedAt,
    snapshot: snapshot(),
  };
}

test('KUL cache is accepted only for its owner, current schema and bounded age', () => {
  const now = KUL_SNAPSHOT_CACHE_MAX_AGE_MS + 10_000;
  const recent = envelope(now - KUL_SNAPSHOT_CACHE_MAX_AGE_MS);
  assert.equal(isUsableKulSnapshotCacheEnvelope(recent, 'user-1', now), true);
  assert.equal(isUsableKulSnapshotCacheEnvelope(recent, 'user-2', now), false);
  assert.equal(isUsableKulSnapshotCacheEnvelope({ ...recent, schemaVersion: 99 }, 'user-1', now), false);
  assert.equal(isUsableKulSnapshotCacheEnvelope({ ...recent, savedAt: now + 1 }, 'user-1', now), false);
  assert.equal(isUsableKulSnapshotCacheEnvelope({ ...recent, savedAt: now - KUL_SNAPSHOT_CACHE_MAX_AGE_MS - 1 }, 'user-1', now), false);
  assert.equal(isUsableKulSnapshotCacheEnvelope({ ...recent, snapshot: { ...recent.snapshot, userId: 'user-2' } }, 'user-1', now), false);
});

test('KUL persisted snapshot omits invitation code while preserving the validated family view', () => {
  const sanitized = removeKulInviteCodeFromCachedSnapshot(snapshot());
  assert.equal(sanitized.kul?.inviteCode, null);
  assert.equal(isUsableKulSnapshotCacheEnvelope({ ...envelope(), snapshot: sanitized }, 'user-1', 1_000), true);
});
