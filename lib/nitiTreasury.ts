import { createCacheStorageBarrier } from './cacheStorageBarrier';
import { getAppIdentity, isSameAppIdentity, type AppIdentity } from './appIdentity';
import { resolveIdentityKey } from './homeDiscovery';

/**
 * Niti Treasury: the wisdom takeaways a person has saved from the Panchatantra storybook.
 *
 * It holds only a reference (kind + story id) and when it was saved, never a copy of the text: the
 * moral is read from the story's own content when it is shown, so a content update is never stale here.
 *
 * Cache rules (AGENTS.md section 5): the key carries the identity (user or guest) and a schema version;
 * a stored envelope for any other identity or version is discarded, never shown; everything is cleared at
 * sign-out and account switch (app/_layout.tsx); the list is bounded; reads are validated; writes for an
 * identity that is no longer the current one are refused; and nothing here authorises anything on a server.
 */

export const NITI_TREASURY_SCHEMA_VERSION = 1;
export const NITI_TREASURY_MAX_ITEMS = 500;
const MAX_ID_LENGTH = 200;
const STORAGE_PREFIX = 'shoonaya_niti_treasury_v1_';

export type NitiKind = 'panchatantra';
const KINDS: readonly NitiKind[] = ['panchatantra'];

export interface NitiRef {
  kind: NitiKind;
  id: string;
}

export interface NitiTreasuryItem extends NitiRef {
  savedAt: number;
}

interface NitiTreasuryEnvelope {
  schemaVersion: number;
  identityKey: string;
  items: NitiTreasuryItem[];
}

// ── Pure helpers (unit-tested without storage) ───────────────────────────────

export function nitiItemKey(ref: NitiRef): string {
  return `${ref.kind}:${ref.id}`;
}

function isValidRef(value: unknown): value is NitiRef {
  if (!value || typeof value !== 'object') return false;
  const { kind, id } = value as Record<string, unknown>;
  return typeof kind === 'string' && (KINDS as readonly string[]).includes(kind)
    && typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH;
}

function newestFirstCapped(items: NitiTreasuryItem[]): NitiTreasuryItem[] {
  return [...items].sort((a, b) => b.savedAt - a.savedAt).slice(0, NITI_TREASURY_MAX_ITEMS);
}

/**
 * Parses what is on disk. Returns null when the envelope is unusable (corrupt, another schema version,
 * or written for a different identity) so the caller can discard it; malformed items inside a good
 * envelope are dropped, duplicates keep the earliest save.
 */
export function parseNitiTreasury(raw: string | null, identityKey: string): NitiTreasuryItem[] | null {
  if (!raw) return null;
  let parsed: Partial<NitiTreasuryEnvelope>;
  try {
    parsed = JSON.parse(raw) as Partial<NitiTreasuryEnvelope>;
  } catch {
    return null;
  }
  if (!parsed || parsed.schemaVersion !== NITI_TREASURY_SCHEMA_VERSION || parsed.identityKey !== identityKey || !Array.isArray(parsed.items)) {
    return null;
  }
  const byKey = new Map<string, NitiTreasuryItem>();
  for (const candidate of parsed.items) {
    if (!isValidRef(candidate)) continue;
    const savedAt = (candidate as { savedAt?: unknown }).savedAt;
    if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || savedAt <= 0) continue;
    const item: NitiTreasuryItem = { kind: candidate.kind, id: candidate.id, savedAt };
    const existing = byKey.get(nitiItemKey(item));
    if (!existing || item.savedAt < existing.savedAt) byKey.set(nitiItemKey(item), item);
  }
  return newestFirstCapped([...byKey.values()]);
}

export function serializeNitiTreasury(identityKey: string, items: NitiTreasuryItem[]): string {
  const envelope: NitiTreasuryEnvelope = { schemaVersion: NITI_TREASURY_SCHEMA_VERSION, identityKey, items };
  return JSON.stringify(envelope);
}

export function isNitiSaved(items: readonly NitiTreasuryItem[], ref: NitiRef): boolean {
  const key = nitiItemKey(ref);
  return items.some((item) => nitiItemKey(item) === key);
}

/** Idempotent: saving something already saved changes nothing, including its original save time. */
export function withNitiItem(items: NitiTreasuryItem[], ref: NitiRef, now: number): NitiTreasuryItem[] {
  if (!isValidRef(ref) || isNitiSaved(items, ref)) return items;
  return newestFirstCapped([...items, { kind: ref.kind, id: ref.id, savedAt: now }]);
}

export function withoutNitiItem(items: NitiTreasuryItem[], ref: NitiRef): NitiTreasuryItem[] {
  if (!isNitiSaved(items, ref)) return items;
  const key = nitiItemKey(ref);
  return items.filter((item) => nitiItemKey(item) !== key);
}

// ── Storage ───────────────────────────────────────────────────────────────────

const storage = createCacheStorageBarrier((key) => key.startsWith(STORAGE_PREFIX));
const snapshots = new Map<string, NitiTreasuryItem[]>();
const hydrations = new Map<string, Promise<NitiTreasuryItem[]>>();
const listeners = new Set<() => void>();
let epoch = 0;

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeNitiTreasury(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Guests and signed-in people keep a Treasury; a loading or signed-out identity has nowhere to put one. */
function persistableIdentityKey(identity: AppIdentity): string | null {
  const identityKey = resolveIdentityKey(identity);
  return identityKey === 'unauthenticated' || identity.kind === 'loading' ? null : identityKey;
}

function storageKey(identityKey: string): string {
  return `${STORAGE_PREFIX}${identityKey}`;
}

/** Single-flight read into memory; later reads and writes work on that snapshot. */
async function hydrate(identityKey: string): Promise<NitiTreasuryItem[]> {
  const key = storageKey(identityKey);
  const cached = snapshots.get(key);
  if (cached) return cached;
  const inflight = hydrations.get(key);
  if (inflight) return inflight;

  const startedEpoch = epoch;
  const read = (async () => {
    let items: NitiTreasuryItem[] = [];
    try {
      const stored = await storage.read(key);
      if (stored) {
        const parsed = parseNitiTreasury(stored.value, identityKey);
        if (parsed) items = parsed;
        else void stored.discard().catch(() => {});
      }
    } catch {
      // unreadable storage behaves like an empty Treasury; the next save writes a fresh envelope
    }
    // A sign-out or switch while this read was in flight must not bring the old data back.
    if (epoch !== startedEpoch) return [];
    if (!snapshots.has(key)) snapshots.set(key, items);
    return snapshots.get(key) ?? items;
  })().finally(() => {
    hydrations.delete(key);
  });
  hydrations.set(key, read);
  return read;
}

export async function readNitiTreasury(identity: AppIdentity): Promise<NitiTreasuryItem[]> {
  const identityKey = persistableIdentityKey(identity);
  if (!identityKey) return [];
  return [...(await hydrate(identityKey))];
}

export interface NitiSaveResult {
  ok: boolean;
  items: NitiTreasuryItem[];
}

/**
 * Saves or removes one item for `identity`. Refuses (ok: false) when that identity is no longer the
 * current one, so a slow write can never land in another person's Treasury; rolls the in-memory change
 * back when the disk write fails, so the screen never claims a save that did not happen.
 */
export async function setNitiTreasurySaved(
  identity: AppIdentity,
  ref: NitiRef,
  saved: boolean,
  now: number = Date.now(),
): Promise<NitiSaveResult> {
  const identityKey = persistableIdentityKey(identity);
  if (!identityKey || !isValidRef(ref)) return { ok: false, items: [] };

  await hydrate(identityKey);
  if (!isSameAppIdentity(identity, getAppIdentity())) return { ok: false, items: [] };

  const key = storageKey(identityKey);
  const previous = snapshots.get(key) ?? [];
  const next = saved ? withNitiItem(previous, ref, now) : withoutNitiItem(previous, ref);
  if (next === previous) return { ok: true, items: [...previous] };

  snapshots.set(key, next);
  notify();
  try {
    await storage.setItem(key, serializeNitiTreasury(identityKey, next));
    return { ok: true, items: [...next] };
  } catch {
    if (snapshots.get(key) === next) {
      snapshots.set(key, previous);
      notify();
    }
    return { ok: false, items: [...(snapshots.get(key) ?? previous)] };
  }
}

/** Drops the in-memory copy only, as a cold start would; storage is untouched. For tests. */
export function resetNitiTreasuryMemoryForTests(): void {
  epoch += 1;
  snapshots.clear();
  hydrations.clear();
}

/** Sign-out and account switch (app/_layout.tsx). */
export async function clearAllNitiTreasury(): Promise<void> {
  epoch += 1;
  snapshots.clear();
  hydrations.clear();
  notify();
  try {
    await storage.clearAll();
  } catch (error) {
    console.warn('[NitiTreasury] clearAll failed', error);
  }
}
