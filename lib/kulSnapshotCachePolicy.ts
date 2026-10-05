import { isKulSnapshot } from './kulSnapshotContract';
import type { KulSnapshot } from './kul';

export const KUL_SNAPSHOT_CACHE_SCHEMA_VERSION = 1;
export const KUL_SNAPSHOT_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type KulSnapshotCacheEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  snapshot: KulSnapshot;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cache is useful only for its exact owner and within the bounded fallback window. */
export function isUsableKulSnapshotCacheEnvelope(
  value: unknown,
  userId: string,
  now = Date.now(),
): value is KulSnapshotCacheEnvelope {
  if (!isRecord(value)) return false;
  return value.schemaVersion === KUL_SNAPSHOT_CACHE_SCHEMA_VERSION
    && value.userId === userId
    && typeof value.savedAt === 'number'
    && Number.isFinite(value.savedAt)
    && value.savedAt >= 0
    && value.savedAt <= now
    && now - value.savedAt <= KUL_SNAPSHOT_CACHE_MAX_AGE_MS
    && isKulSnapshot(value.snapshot)
    && value.snapshot.userId === userId;
}

/** Invite codes grant access and must always be fetched live, never persisted. */
export function removeKulInviteCodeFromCachedSnapshot(snapshot: KulSnapshot): KulSnapshot {
  if (!snapshot.kul) return snapshot;
  return {
    ...snapshot,
    kul: { ...snapshot.kul, inviteCode: null },
  };
}
