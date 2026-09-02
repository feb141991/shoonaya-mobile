import type { ObservanceSeries } from './observance-series-contract.generated';
import type { HomeObservanceStoryCard } from './observance-story-contract.generated';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  payload: T;
};

const GUEST_KEY = 'shoonaya_home_cache_v1_guest';
const USER_KEY_PREFIX = 'shoonaya_home_cache_v1_user_';

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
 * Given a cached payload whose spiritualDate no longer matches today,
 * returns a copy with the date-sensitive sections (Panchang/vrat/
 * observance data and practice-completion status) reset to a neutral,
 * unconfirmed state -- identity, hero and sacred-text content pass through
 * unchanged since those aren't tied to "today". Callers should render this
 * immediately while a fresh network response is in flight, with the caller
 * responsible for showing a pending/loading treatment on the reset
 * sections rather than presenting them as if they were confirmed.
 */
export function withDateSensitiveFieldsPending(payload: CachedHomeRenderModel): CachedHomeRenderModel {
  return {
    ...payload,
    panchang: {
      ...payload.panchang,
      festivalLabel: null,
      vratLabel: null,
      viewedToday: false,
      observance: null,
      upcomingObservances: [],
      series: [],
      storyCards: [],
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
      observance: full.panchang?.observance ?? null,
      upcomingObservances: full.panchang?.upcomingObservances ?? [],
      series: Array.isArray(full.panchang?.series) ? full.panchang.series : [],
      storyCards: Array.isArray(full.panchang?.storyCards) ? full.panchang.storyCards : [],
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
export async function readHomeCache(
  identity: CacheIdentity,
  fallbackTimezone?: string,
  now: Date = new Date()
): Promise<{
  payload: CachedHomeRenderModel;
  savedAt: number;
  timezone: string;
  spiritualDate: string;
  dateSensitiveStale: boolean;
} | null> {
  const key = getHomeCacheKey(identity);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    let envelope: HomeCacheEnvelope<CachedHomeRenderModel>;
    try {
      envelope = JSON.parse(raw);
    } catch {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (!envelope || envelope.schemaVersion !== HOME_CACHE_SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    if (identity.kind === 'guest') {
      if (envelope.identity?.kind !== 'guest') {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    } else {
      if (
        envelope.identity?.kind !== 'authenticated' ||
        envelope.identity.userId !== identity.userId
      ) {
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    }

    // Determine canonical timezone from envelope, falling back safely
    const canonicalTimezone = safeTimezone(envelope.timezone || fallbackTimezone);
    const expectedSpiritualDate = spiritualDate(canonicalTimezone, now);
    const dateSensitiveStale = !envelope.spiritualDate || envelope.spiritualDate !== expectedSpiritualDate;

    if (!validateHomeSummaryPayload(envelope.payload)) {
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }

    return {
      payload: envelope.payload,
      savedAt: envelope.savedAt ?? 0,
      timezone: canonicalTimezone,
      spiritualDate: envelope.spiritualDate,
      dateSensitiveStale,
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
  currentSpiritualDate?: string
): Promise<void> {
  if (!validateHomeSummaryPayload(payload)) return;
  const sanitized = sanitizeForHomeCache(payload);
  const key = getHomeCacheKey(identity);
  const canonicalTimezone = safeTimezone(timezone);
  const date = currentSpiritualDate || spiritualDate(canonicalTimezone);

  const envelope: HomeCacheEnvelope<CachedHomeRenderModel> = {
    schemaVersion: HOME_CACHE_SCHEMA_VERSION,
    identity,
    spiritualDate: date,
    timezone: canonicalTimezone,
    savedAt: Date.now(),
    payload: sanitized,
  };

  try {
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
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
      await AsyncStorage.removeItem(key);
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
export async function clearAllHomeCaches(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const homeCacheKeys = keys.filter(
      (k) => k === GUEST_KEY || k.startsWith(USER_KEY_PREFIX) || k.startsWith('shoonaya_home_cache_')
    );
    if (homeCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(homeCacheKeys);
    }
    await clearAllHomeDiscoveryStates();
  } catch (error) {
    console.warn('[HomeCache] clearAll failed', error);
  }
}
