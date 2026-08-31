/**
 * Identity-scoped disk cache for the Mandali feed's first page --
 * mirrors lib/homeCache.ts's pattern (same key-isolation and
 * account-switch-clearing invariants apply here) so Mandali gets the same
 * "instant render from disk, revalidate in background" behavior Home
 * already has, instead of a blocking network request on every mount.
 *
 * Only the first page is cached (posts/blendedPosts/members/rsvps +
 * nextCursor) -- paginated "load more" results are never persisted, so a
 * cold start always resumes from page 1, never mid-pagination.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CommentRow, MemberRow, PostRow, RsvpRow } from './mandali';

export const MANDALI_CACHE_SCHEMA_VERSION = 1;

export type MandaliCacheIdentity =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'guest' };

export type CachedMandaliRenderModel = {
  mandaliId: string | null;
  mandaliName: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  posts: PostRow[];
  blendedPosts: PostRow[];
  comments: CommentRow[];
  rsvps: RsvpRow[];
  members: MemberRow[];
  nextCursor: string | null;
};

type MandaliCacheEnvelope = {
  schemaVersion: number;
  identity: MandaliCacheIdentity;
  savedAt: number;
  payload: CachedMandaliRenderModel;
};

const GUEST_KEY = 'shoonaya_mandali_cache_v1_guest';
const USER_KEY_PREFIX = 'shoonaya_mandali_cache_v1_user_';

function getMandaliCacheKey(identity: MandaliCacheIdentity): string {
  return identity.kind === 'guest' ? GUEST_KEY : `${USER_KEY_PREFIX}${identity.userId}`;
}

function isValidPayload(payload: unknown): payload is CachedMandaliRenderModel {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return Array.isArray(p.posts) && Array.isArray(p.blendedPosts) && Array.isArray(p.members);
}

export async function readMandaliCache(
  identity: MandaliCacheIdentity
): Promise<{ payload: CachedMandaliRenderModel; savedAt: number } | null> {
  const key = getMandaliCacheKey(identity);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    let envelope: MandaliCacheEnvelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (!envelope || envelope.schemaVersion !== MANDALI_CACHE_SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (identity.kind === 'guest') {
      if (envelope.identity?.kind !== 'guest') {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    } else if (envelope.identity?.kind !== 'authenticated' || envelope.identity.userId !== identity.userId) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (!isValidPayload(envelope.payload)) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    return { payload: envelope.payload, savedAt: envelope.savedAt ?? 0 };
  } catch (error) {
    console.warn('[MandaliCache] read failed', error);
    return null;
  }
}

export async function writeMandaliCache(
  identity: MandaliCacheIdentity,
  payload: CachedMandaliRenderModel
): Promise<void> {
  const key = getMandaliCacheKey(identity);
  const envelope: MandaliCacheEnvelope = {
    schemaVersion: MANDALI_CACHE_SCHEMA_VERSION,
    identity,
    savedAt: Date.now(),
    payload,
  };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[MandaliCache] write failed', error);
  }
}

export async function clearMandaliCache(identity?: MandaliCacheIdentity): Promise<void> {
  try {
    if (identity) {
      await AsyncStorage.removeItem(getMandaliCacheKey(identity));
    } else {
      await clearAllMandaliCaches();
    }
  } catch (error) {
    console.warn('[MandaliCache] clear failed', error);
  }
}

export async function clearAllMandaliCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mandaliCacheKeys = keys.filter((k) => k === GUEST_KEY || k.startsWith(USER_KEY_PREFIX));
    if (mandaliCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(mandaliCacheKeys);
    }
  } catch (error) {
    console.warn('[MandaliCache] clearAll failed', error);
  }
}
