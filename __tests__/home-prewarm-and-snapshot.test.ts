import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

import {
  writeHomeCache,
  readHomeCache,
  getOrReadHomeCache,
  getHomeCacheSnapshot,
  clearHomeCache,
  clearAllHomeCaches,
  type CacheIdentity,
  type CachedHomeRenderModel,
} from '../lib/homeCache';
import {
  HomeSummaryCoordinator,
  type HomeAuthIdentity,
} from '../lib/homeCoordinator';

describe('Home Prewarming, Snapshot Hydration & Identity Isolation', () => {
  const samplePayload = {
    profile: {
      name: 'Prince Sharma',
      firstName: 'Prince',
      tradition: 'hindu',
      appLanguage: 'en' as const,
      karmaPoints: 108,
      relicImageUrl: null,
      avatarUrl: null,
    },
    hero: {
      imageUrl: '/assets/images/heroes/all/default.webp',
      alt: 'Devotional art',
      objectPosition: '50% 50%',
      label: 'Default',
    },
    date: {
      iso: '2026-09-20',
      timezone: 'Europe/London',
      latitude: 51.5074,
      longitude: -0.1278,
    },
    sacredText: {
      label: 'Gita 2.47',
      icon: 'book',
      original: 'कर्मण्येवाधिकारस्ते',
      transliteration: 'Karmanyevadhikaraste',
      meaning: 'You have a right to perform your prescribed duty',
      source: 'Bhagavad Gita',
      accentColour: '#D97706',
      accentLight: '#FEF3C7',
    },
    panchang: {
      href: '/panchang',
      tithiLabel: 'Shukla Navami',
      festivalLabel: 'Navaratri',
      vratLabel: null,
      viewedToday: false,
      observance: {
        name: 'Navaratri',
        emoji: '🪔',
        daysLeft: 0,
        routeKind: 'festival',
        routeSlug: 'navaratri',
        href: '/festival/navaratri',
        label: 'Today is Navaratri',
        monthLabel: 'Ashwin',
        description: 'Nine divine nights',
        date: '2026-09-20',
      },
      upcomingObservances: [],
      calendarStatus: 'ready' as const,
    },
    nextPractice: {
      id: 'japa' as const,
      contextLabel: 'Japa Mala',
      title: 'Morning Japa',
      suggestion: '108 beads',
      nudge: 'Continue streak',
      actionLabel: 'Begin',
      actionHref: '/bhakti/mala',
      progress: 0,
    },
    practices: [],
    dharmVeer: {
      id: '1',
      name: 'Rani Lakshmibai',
      tagline: 'Courage',
      href: '/dharm-veer/rani-lakshmibai',
    },
    firstWeek: false,
  };

  beforeEach(async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-20T12:00:00.000Z') });
    await clearAllHomeCaches();
  });

  afterEach(() => mock.timers.reset());

  it('deduplicates concurrent in-flight disk reads into a single promise per identity', async () => {
    const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-dedupe-1' };
    await writeHomeCache(identity, samplePayload, 'Europe/London', '2026-09-20');

    const promise1 = getOrReadHomeCache(identity, 'Europe/London');
    const promise2 = getOrReadHomeCache(identity, 'Europe/London');

    assert.strictEqual(promise1, promise2, 'Concurrent callers must receive the exact same Promise instance');

    const [result1, result2] = await Promise.all([promise1, promise2]);
    assert.ok(result1);
    assert.deepEqual(result1, result2);
    assert.strictEqual(result1?.payload.profile.firstName, 'Prince');
  });

  it('populates synchronous memory snapshot once disk read resolves', async () => {
    const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-snap-1' };
    const key = 'shoonaya_home_cache_v1_user_user-snap-1';
    await writeHomeCache(identity, samplePayload, 'Europe/London', '2026-09-20');

    // Preserve the serialized envelope while clearing both storage and the
    // in-process snapshot, then restore only the disk value. This models a
    // new JS process accurately: AsyncStorage survives, module memory does not.
    const diskEnvelope = (globalThis as any).window.localStorage.getItem(key);
    assert.ok(diskEnvelope);

    await clearHomeCache(identity);
    assert.strictEqual(getHomeCacheSnapshot(identity), null, 'Snapshot must be empty after clearHomeCache');
    (globalThis as any).window.localStorage.setItem(key, diskEnvelope);

    const readResult = await getOrReadHomeCache(identity, 'Europe/London');
    assert.ok(readResult);

    const snapshot = getHomeCacheSnapshot(identity);
    assert.ok(snapshot, 'getHomeCacheSnapshot must return non-null after getOrReadHomeCache resolves');
    assert.strictEqual(snapshot?.payload.profile.name, 'Prince Sharma');
    assert.strictEqual(snapshot?.payload.panchang.observance?.name, 'Navaratri');
    assert.strictEqual(snapshot?.savedAt, readResult?.savedAt);
    assert.strictEqual(snapshot?.calendarSavedAt, readResult?.calendarSavedAt);
  });

  it('enforces strict identity isolation between User A, User B, and Guest', async () => {
    const userA: CacheIdentity = { kind: 'authenticated', userId: 'user-alpha' };
    const userB: CacheIdentity = { kind: 'authenticated', userId: 'user-beta' };
    const guest: CacheIdentity = { kind: 'guest' };

    const payloadA = {
      ...samplePayload,
      profile: { ...samplePayload.profile, firstName: 'Alpha' },
    };
    const payloadB = {
      ...samplePayload,
      profile: { ...samplePayload.profile, firstName: 'Beta' },
    };

    await writeHomeCache(userA, payloadA, 'Europe/London', '2026-09-20');
    await writeHomeCache(userB, payloadB, 'Europe/London', '2026-09-20');

    const snapA = getHomeCacheSnapshot(userA);
    const snapB = getHomeCacheSnapshot(userB);
    const snapGuest = getHomeCacheSnapshot(guest);

    assert.strictEqual(snapA?.payload.profile.firstName, 'Alpha');
    assert.strictEqual(snapB?.payload.profile.firstName, 'Beta');
    assert.strictEqual(snapGuest, null, 'Guest snapshot must be null when only authenticated users have cached');

    // Clearing User A leaves User B snapshot intact
    await clearHomeCache(userA);
    assert.strictEqual(getHomeCacheSnapshot(userA), null);
    assert.strictEqual(getHomeCacheSnapshot(userB)?.payload.profile.firstName, 'Beta');
  });

  it('re-evaluates spiritual-date freshness and preserves the original calendar timestamp', async () => {
    const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-rollover-snapshot' };
    const oldCalendarSavedAt = Date.now() - 60_000;
    await writeHomeCache(
      identity,
      samplePayload,
      'Europe/London',
      '2020-01-01',
      oldCalendarSavedAt
    );

    const snapshot = getHomeCacheSnapshot(identity, new Date('2026-09-21T12:00:00.000Z'));
    assert.ok(snapshot);
    assert.strictEqual(snapshot?.dateSensitiveStale, true);
    assert.strictEqual(snapshot?.calendarSavedAt, oldCalendarSavedAt);
    assert.strictEqual(snapshot?.payload.panchang.festivalLabel, null);
    assert.strictEqual(snapshot?.payload.panchang.observance, null);
    assert.strictEqual(snapshot?.payload.panchang.calendarStatus, 'pending');
  });

  it('does not let a read finishing after clearHomeCache repopulate memory', async () => {
    const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-clear-race' };
    const key = 'shoonaya_home_cache_v1_user_user-clear-race';
    await writeHomeCache(identity, samplePayload, 'Europe/London');
    const staleEnvelope = (globalThis as any).window.localStorage.getItem(key);
    assert.ok(staleEnvelope);

    await clearHomeCache(identity);
    (globalThis as any).window.localStorage.setItem(key, staleEnvelope);

    const originalGetItem = AsyncStorage.getItem.bind(AsyncStorage);
    let releaseRead!: () => void;
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; });
    (AsyncStorage as any).getItem = async (requestedKey: string) => {
      if (requestedKey === key) {
        await readGate;
        return staleEnvelope;
      }
      return originalGetItem(requestedKey);
    };

    try {
      const staleRead = getOrReadHomeCache(identity, 'Europe/London');
      await Promise.resolve();
      await clearHomeCache(identity);
      releaseRead();
      await staleRead;

      assert.strictEqual(
        getHomeCacheSnapshot(identity),
        null,
        'A superseded disk read must not restore the cleared memory snapshot'
      );
    } finally {
      (AsyncStorage as any).getItem = originalGetItem;
    }
  });

  it('coordinator.setHydratedFromSnapshot marks state valid and suppresses redundant loading shimmer', async () => {
    let loadingState: boolean = true;
    let appliedPayload: any = null;

    const coordinator = new HomeSummaryCoordinator({
      fetchApi: async () => new Response(JSON.stringify(samplePayload), { status: 200 }),
      onApplyPayload: (p) => { appliedPayload = p; },
      onSetLoading: (l) => { loadingState = l; },
      onSetError: () => {},
      onRedirectToLogin: () => {},
      buildGuestPayload: () => samplePayload,
    });

    assert.strictEqual(coordinator.state.hasValidState, false);

    // Hydrate from snapshot
    coordinator.setHydratedFromSnapshot('authenticated:user-alpha', Date.now(), Date.now());

    assert.strictEqual(coordinator.state.hasValidState, true);
    assert.strictEqual(coordinator.state.lastIdentityKey, 'authenticated:user-alpha');
    assert.strictEqual(loadingState, false, 'Loading shimmer must be suppressed when hydrated from snapshot');
  });

  it('handles corrupted AsyncStorage gracefully without throwing and recovers', async () => {
    const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-corrupt' };
    const key = `shoonaya_home_cache_v1_user_user-corrupt`;

    // Inject corrupt JSON into storage
    (globalThis as any).window.localStorage.setItem(key, '{ invalid json');

    const result = await getOrReadHomeCache(identity, 'Europe/London');
    assert.strictEqual(result, null, 'Corrupt storage must return null safely');
    assert.strictEqual(getHomeCacheSnapshot(identity), null, 'Memory snapshot must be null for corrupt entry');
  });
});
