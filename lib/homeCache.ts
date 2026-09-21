import type { ObservanceSeries } from './observance-series-contract.generated';
import type { HomeObservanceStoryCard } from './observance-story-contract.generated';
import { createCacheStorageBarrier } from './cacheStorageBarrier';
import { safeTimezone, spiritualDate } from './spiritualDate';
import { clearAllHomeDiscoveryStates } from './homeDiscovery';

export const HOME_CACHE_SCHEMA_VERSION = 2;

export type CacheIdentity =
  | { kind: 'authenticated'; userId: string }
  | { kind: 'guest' };

/**
 * CachedHomeRenderModel — Explicit, privacy-safe subset of HomeSummary.
 *
 * Privacy & Security Invariants:
 * 1. Excludes free-text Sankalpa reflections to prevent storing sensitive personal
 *    notes unencrypted in cache.
 * 2. Excludes unrendered profile location text (city/country).
 * 3. Preserves coordinates (latitude/longitude) solely for client-side Panchang computation
 *    (calculatePanchang) on the immediate first frame. Coordinates are strictly user-scoped
 *    (stored under `shoonaya_home_cache_v1_user_<userId>`), never exposed across identities,
 *    and immediately purged on logout / account switch via clearAllHomeCaches().
 */
export type CachedObservanceEntry = {
  name: string;
  emoji: string | null;
  daysLeft: number;
  routeKind: string;
  routeSlug: string;
  href: string;
  label: string;
  monthLabel: string | null;
  description: string | null;
  // Absolute ISO date (YYYY-MM-DD, in the profile's spiritual-date terms --
  // see spiritualDate.ts) this entry is for. Optional so a cache entry
  // written before this field existed still parses -- entries without it are
  // simply never eligible for rollover promotion (findObservanceForDate
  // skips them), falling back to the pre-existing pending-until-fresh-fetch
  // behavior exactly as before this field existed.
  date?: string;
};

export type CachedHomeRenderModel = {
  profile: {
    name: string;
    firstName: string;
    tradition: string;
    appLanguage: 'en' | 'hi' | 'pa';
    karmaPoints: number;
    relicImageUrl: string | null;
    avatarUrl: string | null;
  };
  hero: {
    imageUrl: string;
    alt: string;
    objectPosition: string;
    label: string;
  };
  date: {
    iso: string;
    timezone: string;
    latitude: number;
    longitude: number;
  };
  sacredText: {
    label: string;
    icon: string;
    original: string;
    transliteration: string;
    meaning: string;
    source: string;
    accentColour: string;
    accentLight: string;
  };
  panchang: {
    href: string;
    tithiLabel: string;
    festivalLabel: string | null;
    vratLabel: string | null;
    viewedToday: boolean;
    observance: CachedObservanceEntry | null;
    upcomingObservances: CachedObservanceEntry[];
    series?: ObservanceSeries[];
    storyCards?: HomeObservanceStoryCard[];
    // See HomeSummary['panchang']['calendarStatus'] in app/(tabs)/index.tsx
    // for the full contract. Optional so a cache entry written before this
    // field existed still parses; readers default it to 'ready'.
    calendarStatus?: 'ready' | 'pending' | 'unavailable';
    // See HomeSummary['panchang']['calendarProfile']/['sampradaya'] --
    // carried through the cache so a cache-hit render still has these for
    // calendarIdentityKey until a fresh network response lands.
    calendarProfile?: string;
    sampradaya?: string | null;
  };
  nextPractice: {
    id: 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer';
    contextLabel: string;
    title: string;
    suggestion: string;
    nudge: string;
    actionLabel: string;
    actionHref: string;
    progress: number;
  };
  practices: Array<{
    id: 'japa' | 'nitya' | 'pathshala' | 'quiz' | 'dharmveer';
    icon: string;
    label: string;
    detail: string;
    href: string;
    done: boolean;
    progress: number;
    color: string;
    streak?: number;
  }>;
  dharmVeer: {
    id: string;
    name: string;
    tagline: string;
    href: string;
  };
  firstWeek: boolean;
};

export type HomeCacheEnvelope<T = CachedHomeRenderModel> = {
  schemaVersion: number;
  identity: CacheIdentity;
  spiritualDate: string;
  timezone: string;
  savedAt: number;
  // When this envelope's `panchang` was actually last fetched fresh from
  // the server -- distinct from `savedAt` (this whole envelope's write
  // time) because a write can happen without a fresh calendar fetch (the
  // 12h-TTL "skipCalendar" request -- see HomeSummaryCoordinator). Falls
  // back to `savedAt` for any envelope written before this field existed,
  // since that's the closest true value available.
  calendarSavedAt: number;
  payload: T;
};

const GUEST_KEY = 'shoonaya_home_cache_v1_guest';
const USER_KEY_PREFIX = 'shoonaya_home_cache_v1_user_';

const cacheStorage = createCacheStorageBarrier((key) => key.startsWith('shoonaya_home_cache_'));

export function getHomeCacheKey(identity: CacheIdentity): string {
  if (identity.kind === 'guest') {
    return GUEST_KEY;
  }
  return `${USER_KEY_PREFIX}${identity.userId}`;
}

export function validateHomeSummaryPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  if (!p.profile || typeof p.profile !== 'object') return false;
  if (!p.hero || typeof p.hero !== 'object') return false;
  if (!p.date || typeof p.date !== 'object') return false;
  if (!p.sacredText || typeof p.sacredText !== 'object') return false;
  if (!Array.isArray(p.practices)) return false;
  return true;
}

/**
 * Recomputes daysLeft/label for a cached observance entry relative to a new
 * target date, using the exact same three-way label wording the backend's
 * buildObservanceEntry uses (home-summary/route.ts). Only the *arithmetic*
 * changes here -- the underlying observance identity (name/date/emoji/
 * routing/description) is untouched, since that's the part that actually
 * came from the canonical pipeline and this function has no authority to
 * alter it.
 */
function recomputeEntryForDate(entry: CachedObservanceEntry, targetIsoDate: string): CachedObservanceEntry {
  if (!entry.date) return entry;
  const daysLeft = Math.round(
    (new Date(`${entry.date}T00:00:00Z`).getTime() - new Date(`${targetIsoDate}T00:00:00Z`).getTime()) / 86_400_000
  );
  const label =
    daysLeft === 0
      ? `Today is ${entry.name}`
      : daysLeft === 1
        ? `Tomorrow is ${entry.name}`
        : `${entry.name} in ${daysLeft} days`;
  return { ...entry, daysLeft, label };
}

/**
 * Finds the cached observance (from a previous fetch's `observance` or
 * `upcomingObservances`) whose absolute date matches `targetIsoDate`. This is
 * genuine, previously-server-verified data -- it already passed through the
 * full canonical/withheld/tradition-profile pipeline at fetch time -- not a
 * client-side derivation, which is what makes promoting it safe (unlike
 * computing a new observance guess locally, which this project's calendar
 * governance rules prohibit). Returns null when no cached entry covers this
 * date (the cache predates this field, or is older than the server's ~16-day
 * lookahead window) -- callers must fall back to the existing pending state.
 */
function findObservanceForDate(
  payload: CachedHomeRenderModel,
  targetIsoDate: string
): CachedObservanceEntry | null {
  const candidates: CachedObservanceEntry[] = [
    ...(payload.panchang.observance ? [payload.panchang.observance] : []),
    ...(payload.panchang.upcomingObservances ?? []),
  ];
  return candidates.find((entry) => entry.date === targetIsoDate) ?? null;
}

/**
 * Keeps only entries still in the future relative to `targetIsoDate` and
 * refreshes their daysLeft/label via recomputeEntryForDate. Shared by both
 * branches of withDateSensitiveFieldsPending below -- an entry with no
 * `date` (pre-dates that field) is dropped, same as recomputeEntryForDate's
 * own passthrough guard would make pointless to keep here (its daysLeft
 * would never be refreshed for the new date).
 */
function keepFutureEntries(
  entries: CachedObservanceEntry[],
  targetIsoDate: string
): CachedObservanceEntry[] {
  return entries
    .filter((entry) => entry.date && entry.date > targetIsoDate)
    .map((entry) => recomputeEntryForDate(entry, targetIsoDate));
}

/**
 * Given a cached payload whose spiritualDate no longer matches today, returns
 * a copy with the date-sensitive sections re-evaluated for `targetIsoDate` --
 * identity, hero and sacred-text content pass through unchanged since those
 * aren't tied to "today".
 *
 * If the cached fetch's own upcoming-observances window (populated by a
 * previous day's network response, which already covers ~16 days ahead)
 * happens to include an entry for `targetIsoDate`, that entry is promoted to
 * `observance` and rendered immediately as 'ready' -- it is real,
 * server-verified data, just fetched a little earlier, not a guess. This is
 * intentionally different from computing anything client-side: the value is
 * whatever the canonical pipeline already produced, only its daysLeft/label
 * arithmetic is refreshed for the new date. The caller (HomeSummaryCoordinator)
 * always issues its normal background fetch right after this regardless of
 * which branch runs, so if anything changed server-side since the cached
 * fetch (a council correction, a materialization update), the promoted value
 * is corrected within one network round-trip -- it is never the last word.
 *
 * When no entry matches `targetIsoDate` exactly (the common case -- most
 * days aren't a festival), still-future cached entries are kept (filtered
 * and recomputed the same way) and rendered as 'ready' with `observance:
 * null` -- there is no reason to discard 14 days of already-cached, still
 * valid festivals just because none of them happens to be *today*. Only
 * falls back to the neutral 'pending' skeleton when the cache genuinely has
 * nothing left for the future (a fully expired window, or entries that
 * predate the `date` field), or when `targetIsoDate` is omitted entirely.
 */
export function withDateSensitiveFieldsPending(
  payload: CachedHomeRenderModel,
  targetIsoDate?: string
): CachedHomeRenderModel {
  const promoted = targetIsoDate ? findObservanceForDate(payload, targetIsoDate) : null;

  if (promoted && targetIsoDate) {
    const remainingUpcoming = keepFutureEntries(payload.panchang.upcomingObservances ?? [], targetIsoDate);

    return {
      ...payload,
      panchang: {
        ...payload.panchang,
        // Not reused for the pill itself (which reads observance/
        // upcomingObservances directly), but these are still
        // date-attributed labels from the OLD "today" -- null them out
        // rather than carry over a value we haven't actually verified is
        // still accurate for targetIsoDate.
        festivalLabel: null,
        vratLabel: null,
        viewedToday: false,
        observance: recomputeEntryForDate(promoted, targetIsoDate),
        upcomingObservances: remainingUpcoming,
        // A multi-day series/story-card set is tied to the OLD observance's
        // specific identity -- carrying it over could attach the wrong
        // series to the promoted entry, so treat as unknown until the fresh
        // fetch (always issued right after this) confirms it.
        series: [],
        storyCards: [],
        calendarStatus: 'ready',
      },
      practices: payload.practices.map((p) => ({ ...p, done: false, progress: 0 })),
      nextPractice: {
        ...payload.nextPractice,
        progress: 0,
      },
    };
  }

  // No exact match for targetIsoDate -- most days aren't a festival. Keep
  // whatever's still genuinely in the future rather than treating "nothing
  // for *today*" as "nothing usable at all".
  const remainingFuture = targetIsoDate
    ? keepFutureEntries(payload.panchang.upcomingObservances ?? [], targetIsoDate)
    : [];

  return {
    ...payload,
    panchang: {
      ...payload.panchang,
      festivalLabel: null,
      vratLabel: null,
      viewedToday: false,
      observance: null,
      upcomingObservances: remainingFuture,
      series: [],
      storyCards: [],
      // Only a genuinely empty cache (fully expired window, entries
      // predating the `date` field, or no targetIsoDate at all) is truly
      // unknown and needs the pill's neutral loading skeleton -- surviving
      // future entries are real, already-verified data and render as
      // 'ready' same as the promoted branch above.
      calendarStatus: remainingFuture.length > 0 ? 'ready' : 'pending',
    },
    practices: payload.practices.map((p) => ({ ...p, done: false, progress: 0 })),
    nextPractice: {
      ...payload.nextPractice,
      progress: 0,
    },
  };
}

/**
 * Sanitizes a full HomeSummary into an explicit CachedHomeRenderModel
 * before writing to AsyncStorage.
 */
export function sanitizeForHomeCache(full: any): CachedHomeRenderModel {
  return {
    profile: {
      name: full.profile?.name ?? 'Seeker',
      firstName: full.profile?.firstName ?? 'Seeker',
      tradition: full.profile?.tradition ?? 'hindu',
      appLanguage: full.profile?.appLanguage === 'hi' || full.profile?.appLanguage === 'pa'
        ? full.profile.appLanguage
        : 'en',
      karmaPoints: full.profile?.karmaPoints ?? 0,
      relicImageUrl: full.profile?.relicImageUrl ?? null,
      avatarUrl: full.profile?.avatarUrl ?? null,
    },
    hero: {
      imageUrl: full.hero?.imageUrl ?? '',
      alt: full.hero?.alt ?? '',
      objectPosition: full.hero?.objectPosition ?? '50% 50%',
      label: full.hero?.label ?? '',
    },
    date: {
      iso: full.date?.iso ?? '',
      timezone: full.date?.timezone ?? 'UTC',
      latitude: full.date?.latitude ?? 23.1765,
      longitude: full.date?.longitude ?? 75.7885,
    },
    sacredText: {
      label: full.sacredText?.label ?? '',
      icon: full.sacredText?.icon ?? '',
      original: full.sacredText?.original ?? '',
      transliteration: full.sacredText?.transliteration ?? '',
      meaning: full.sacredText?.meaning ?? '',
      source: full.sacredText?.source ?? '',
      accentColour: full.sacredText?.accentColour ?? '',
      accentLight: full.sacredText?.accentLight ?? '',
    },
    panchang: {
      href: full.panchang?.href ?? '/panchang',
      tithiLabel: full.panchang?.tithiLabel ?? '',
      festivalLabel: full.panchang?.festivalLabel ?? null,
      vratLabel: full.panchang?.vratLabel ?? null,
      viewedToday: Boolean(full.panchang?.viewedToday),
      observance: full.panchang?.observance
        ? { ...full.panchang.observance, date: typeof full.panchang.observance.date === 'string' ? full.panchang.observance.date : undefined }
        : null,
      upcomingObservances: (full.panchang?.upcomingObservances ?? []).map((entry: any) => ({
        ...entry,
        date: typeof entry?.date === 'string' ? entry.date : undefined,
      })),
      series: Array.isArray(full.panchang?.series) ? full.panchang.series : [],
      storyCards: Array.isArray(full.panchang?.storyCards) ? full.panchang.storyCards : [],
      calendarStatus: full.panchang?.calendarStatus === 'pending' || full.panchang?.calendarStatus === 'unavailable'
        ? full.panchang.calendarStatus
        : 'ready',
      calendarProfile: typeof full.panchang?.calendarProfile === 'string' ? full.panchang.calendarProfile : undefined,
      sampradaya: typeof full.panchang?.sampradaya === 'string' ? full.panchang.sampradaya : null,
    },
    nextPractice: {
      id: full.nextPractice?.id ?? 'pathshala',
      contextLabel: full.nextPractice?.contextLabel ?? '',
      title: full.nextPractice?.title ?? '',
      suggestion: full.nextPractice?.suggestion ?? '',
      nudge: full.nextPractice?.nudge ?? '',
      actionLabel: full.nextPractice?.actionLabel ?? '',
      actionHref: full.nextPractice?.actionHref ?? '',
      progress: full.nextPractice?.progress ?? 0,
    },
    practices: (full.practices ?? []).map((p: any) => ({
      id: p.id,
      icon: p.icon,
      label: p.label,
      detail: p.detail,
      href: p.href,
      done: Boolean(p.done),
      progress: p.progress ?? 0,
      color: p.color,
      streak: p.streak,
    })),
    dharmVeer: {
      id: full.dharmVeer?.id ?? '',
      name: full.dharmVeer?.name ?? '',
      tagline: full.dharmVeer?.tagline ?? '',
      href: full.dharmVeer?.href ?? '',
    },
    firstWeek: Boolean(full.firstWeek),
  };
}

/**
 * Read cached home summary for the given identity and timezone.
 *
 * A spiritual-date mismatch (cache was saved on a previous spiritual day)
 * no longer rejects the whole cache. Identity, hero and navigation content
 * are safe to show instantly regardless of date -- only Panchang/vrat/
 * observance data and practice-completion status are actually tied to
 * "today". Callers get `dateSensitiveStale: true` in that case and are
 * responsible for withholding just those fields until a fresh network
 * response lands, per this project's calendar-governance rule against
 * presenting a stale spiritual date as current.
 *
 * Still returns null if the cache is absent, corrupt, or belongs to a
 * different identity -- those aren't safe to partially show.
 */
export type HomeCacheSnapshot = {
  payload: CachedHomeRenderModel;
  savedAt: number;
  calendarSavedAt: number;
  timezone: string;
  spiritualDate: string;
  dateSensitiveStale: boolean;
  expectedSpiritualDate: string;
};

export type ReadHomeCacheResult = HomeCacheSnapshot | null;

const inFlightDiskReadMap = new Map<string, Promise<ReadHomeCacheResult>>();
const memorySnapshotMap = new Map<string, HomeCacheSnapshot>();
const keyInvalidationGeneration = new Map<string, number>();
let globalInvalidationGeneration = 0;
let clearAllInFlight: Promise<void> | null = null;

function getKeyInvalidationGeneration(key: string): number {
  return keyInvalidationGeneration.get(key) ?? 0;
}

function invalidateKey(key: string): void {
  keyInvalidationGeneration.set(key, getKeyInvalidationGeneration(key) + 1);
}

function prepareSnapshotForNow(snapshot: HomeCacheSnapshot, now: Date): HomeCacheSnapshot {
  const expectedSpiritualDate = spiritualDate(snapshot.timezone, now);
  const dateSensitiveStale =
    !snapshot.spiritualDate || snapshot.spiritualDate !== expectedSpiritualDate;

  return {
    ...snapshot,
    expectedSpiritualDate,
    dateSensitiveStale,
    payload: dateSensitiveStale
      ? withDateSensitiveFieldsPending(snapshot.payload, expectedSpiritualDate)
      : snapshot.payload,
  };
}

/**
 * Synchronously retrieves the in-memory cache snapshot for this exact identity,
 * or null if none has been read into memory yet.
 * Never returns data from another identity.
 */
export function getHomeCacheSnapshot(
  identity: CacheIdentity,
  now: Date = new Date()
): HomeCacheSnapshot | null {
  const key = getHomeCacheKey(identity);
  const snapshot = memorySnapshotMap.get(key);
  return snapshot ? prepareSnapshotForNow(snapshot, now) : null;
}

/**
 * Returns an existing in-flight read promise if one was already initiated
 * (e.g. by root layout during session resolution), or initiates a fresh read.
 * Upon resolution, updates the keyed in-memory snapshot for synchronous access.
 */
export function getOrReadHomeCache(
  identity: CacheIdentity,
  fallbackTimezone?: string,
  now: Date = new Date()
): Promise<ReadHomeCacheResult> {
  const key = getHomeCacheKey(identity);
  const existing = inFlightDiskReadMap.get(key);
  if (existing) {
    return existing;
  }

  const globalGenerationAtStart = globalInvalidationGeneration;
  const keyGenerationAtStart = getKeyInvalidationGeneration(key);
  const pendingClearAll = clearAllInFlight;

  let readPromise!: Promise<ReadHomeCacheResult>;
  readPromise = (async () => {
    try {
      // A logout/account-switch purge may still be removing persisted keys.
      // Reads started after that purge begins must wait until it finishes so
      // they cannot resurrect a value that was about to be deleted.
      if (pendingClearAll) {
        await pendingClearAll;
      }
      const result = await readHomeCache(identity, fallbackTimezone, now);
      const isStillCurrent =
        globalGenerationAtStart === globalInvalidationGeneration &&
        keyGenerationAtStart === getKeyInvalidationGeneration(key);

      if (isStillCurrent) {
        if (result?.payload) {
          // Keep the raw validated payload plus its real freshness metadata.
          // getHomeCacheSnapshot re-evaluates spiritual-date freshness every
          // time it is read, including after an in-process midnight rollover.
          memorySnapshotMap.set(key, result);
        } else {
          memorySnapshotMap.delete(key);
        }
      }
      return isStillCurrent ? result : null;
    } catch (err) {
      if (
        globalGenerationAtStart === globalInvalidationGeneration &&
        keyGenerationAtStart === getKeyInvalidationGeneration(key)
      ) {
        memorySnapshotMap.delete(key);
      }
      throw err;
    } finally {
      // An invalidation can allow a newer read for the same key to start
      // before this one settles. Never let the older promise unregister it.
      if (inFlightDiskReadMap.get(key) === readPromise) {
        inFlightDiskReadMap.delete(key);
      }
    }
  })();

  inFlightDiskReadMap.set(key, readPromise);
  return readPromise;
}

/**
 * Reads and validates cached home summary for the given identity.
 * Recomputes spiritual date freshness.
 */
export async function readHomeCache(
  identity: CacheIdentity,
  fallbackTimezone?: string,
  now: Date = new Date()
): Promise<ReadHomeCacheResult> {
  const key = getHomeCacheKey(identity);
  try {
    const stored = await cacheStorage.read(key);
    if (!stored) return null;
    const raw = stored.value;

    let envelope: HomeCacheEnvelope<CachedHomeRenderModel>;
    try {
      envelope = JSON.parse(raw);
    } catch {
      await stored.discard().catch(() => {});
      return null;
    }

    if (!envelope || envelope.schemaVersion !== HOME_CACHE_SCHEMA_VERSION) {
      await stored.discard().catch(() => {});
      return null;
    }

    if (identity.kind === 'guest') {
      if (envelope.identity?.kind !== 'guest') {
        await stored.discard().catch(() => {});
        return null;
      }
    } else {
      if (
        envelope.identity?.kind !== 'authenticated' ||
        envelope.identity.userId !== identity.userId
      ) {
        await stored.discard().catch(() => {});
        return null;
      }
    }

    // Determine canonical timezone from envelope, falling back safely
    const canonicalTimezone = safeTimezone(envelope.timezone || fallbackTimezone);
    const expectedSpiritualDate = spiritualDate(canonicalTimezone, now);
    const dateSensitiveStale = !envelope.spiritualDate || envelope.spiritualDate !== expectedSpiritualDate;

    if (!validateHomeSummaryPayload(envelope.payload)) {
      await stored.discard().catch(() => {});
      return null;
    }

    return {
      payload: envelope.payload,
      savedAt: envelope.savedAt ?? 0,
      // Envelopes written before this field existed fall back to savedAt --
      // the closest true value available, and errs toward "treat as not
      // fresh yet" is impossible here since savedAt is always <= now, so
      // this can only make the calendar TTL look *more* stale, never less.
      calendarSavedAt: envelope.calendarSavedAt ?? envelope.savedAt ?? 0,
      timezone: canonicalTimezone,
      spiritualDate: envelope.spiritualDate,
      dateSensitiveStale,
      expectedSpiritualDate,
    };
  } catch (error) {
    console.warn('[HomeCache] read failed', error);
    return null;
  }
}

/**
 * Atomically write a sanitized, validated home summary to storage.
 */
export async function writeHomeCache(
  identity: CacheIdentity,
  payload: unknown,
  timezone?: string,
  currentSpiritualDate?: string,
  // Pass the carried-forward prior value here when this write's panchang
  // wasn't actually freshly fetched (a skipCalendar round) -- the caller
  // (HomeSummaryCoordinator) already has it in hand from its own
  // readHomeCache merge earlier in the same request, so this just takes it
  // rather than re-reading disk. Omitted (defaults to now) for callers that
  // always represent a fully-fresh write, like the guest payload.
  calendarSavedAt?: number
): Promise<void> {
  if (!validateHomeSummaryPayload(payload)) return;
  const sanitized = sanitizeForHomeCache(payload);
  const key = getHomeCacheKey(identity);
  invalidateKey(key);
  inFlightDiskReadMap.delete(key);
  const canonicalTimezone = safeTimezone(timezone);
  const date = currentSpiritualDate || spiritualDate(canonicalTimezone);

  const envelope: HomeCacheEnvelope<CachedHomeRenderModel> = {
    schemaVersion: HOME_CACHE_SCHEMA_VERSION,
    identity,
    spiritualDate: date,
    timezone: canonicalTimezone,
    savedAt: Date.now(),
    calendarSavedAt: calendarSavedAt ?? Date.now(),
    payload: sanitized,
  };

  try {
    memorySnapshotMap.set(key, {
      payload: sanitized,
      savedAt: envelope.savedAt,
      calendarSavedAt: envelope.calendarSavedAt,
      timezone: canonicalTimezone,
      spiritualDate: date,
      dateSensitiveStale: false,
      expectedSpiritualDate: date,
    });
    await cacheStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('[HomeCache] write failed', error);
  }
}

/**
 * Clear home cache for a specific identity or all home caches if identity is omitted.
 */
export async function clearHomeCache(identity?: CacheIdentity): Promise<void> {
  try {
    if (identity) {
      const key = getHomeCacheKey(identity);
      invalidateKey(key);
      inFlightDiskReadMap.delete(key);
      memorySnapshotMap.delete(key);
      await cacheStorage.removeItem(key);
    } else {
      await clearAllHomeCaches();
    }
  } catch (error) {
    console.warn('[HomeCache] clear failed', error);
  }
}

/**
 * Purge all home cache entries across all accounts and guest sessions.
 */
export function clearAllHomeCaches(): Promise<void> {
  globalInvalidationGeneration += 1;
  inFlightDiskReadMap.clear();
  memorySnapshotMap.clear();
  keyInvalidationGeneration.clear();

  const clearPromise = (async () => {
    try {
      await cacheStorage.clearAll();
      await clearAllHomeDiscoveryStates();
    } catch (error) {
      console.warn('[HomeCache] clearAll failed', error);
    }
  })();

  clearAllInFlight = clearPromise;
  return clearPromise.finally(() => {
    if (clearAllInFlight === clearPromise) {
      clearAllInFlight = null;
    }
  });
}
