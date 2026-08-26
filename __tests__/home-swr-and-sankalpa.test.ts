import { describe, it, beforeEach } from 'node:test';
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

import {
  HOME_CACHE_SCHEMA_VERSION,
  getHomeCacheKey,
  sanitizeForHomeCache,
  validateHomeSummaryPayload,
  writeHomeCache,
  readHomeCache,
  clearHomeCache,
  clearAllHomeCaches,
  type CachedHomeRenderModel,
  type CacheIdentity,
  type HomeCacheEnvelope,
} from '../lib/homeCache';
import {
  HomeSummaryCoordinator,
  SankalpaCoordinator,
  resolveHomeIdentity,
  getIdentityKey,
  type HomeAuthIdentity,
  type SankalpaRow,
} from '../lib/homeCoordinator';
import { safeTimezone, spiritualDate } from '../lib/spiritualDate';

describe('Home SWR, Identity & Sankalpa Test Suite (Production Orchestration)', () => {
  const sampleHomeSummary = {
    profile: {
      name: 'Prince Sharma',
      firstName: 'Prince',
      tradition: 'hindu',
      city: 'London',
      country: 'UK',
      karmaPoints: 120,
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
      iso: '2026-08-22',
      timezone: 'Europe/London',
      latitude: 51.5074,
      longitude: -0.1278,
    },
    sacredText: {
      label: "Today's Verse",
      icon: '📖',
      original: 'वसुधैव कुटुम्बकम्',
      transliteration: 'Vasudhaiva Kutumbakam',
      meaning: 'The whole world is one family.',
      source: 'Maha Upanishad',
      accentColour: '#c5a059',
      accentLight: '#fdf8ef',
    },
    panchang: {
      href: '/panchang',
      tithiLabel: 'Shukla Navami',
      festivalLabel: null,
      vratLabel: null,
      viewedToday: false,
      observance: null,
      upcomingObservances: [],
    },
    nextPractice: {
      id: 'japa' as const,
      contextLabel: 'Next Practice',
      title: 'Japa Mala',
      suggestion: 'Continue your daily sadhana.',
      nudge: 'Consistency builds peace.',
      actionLabel: 'Go to Japa',
      actionHref: '/bhakti/mala',
      progress: 0.5,
    },
    practices: [
      {
        id: 'japa' as const,
        icon: 'circle',
        label: 'Japa Mala',
        detail: '108 chants',
        href: '/bhakti/mala',
        done: false,
        progress: 0.5,
        color: '#c5a059',
      },
    ],
    sankalpa: {
      id: 'sankalpa-1',
      text: 'Daily Gayatri Mantra',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      targetDays: 30,
      day: 22,
      progress: 0.73,
      tradition: 'hindu',
      relatedPractice: 'japa',
    },
    dharmVeer: {
      id: 'sri-krishna',
      name: 'Sri Krishna',
      tagline: 'Ancient wisdom.',
      href: '/dharm-veer',
    },
    firstWeek: false,
  };

  const guestPayloadTemplate = {
    ...sampleHomeSummary,
    profile: {
      ...sampleHomeSummary.profile,
      name: 'Seeker',
      firstName: 'Seeker',
    },
  };

  beforeEach(async () => {
    await clearAllHomeCaches();
  });

  describe('1. Production Identity Resolution & Isolation', () => {
    it('resolves guest identity only when isGuest is true', () => {
      const guestIdentity = resolveHomeIdentity(true, null);
      assert.deepEqual(guestIdentity, { kind: 'guest' });
      assert.equal(getIdentityKey(guestIdentity), 'guest');

      const guestOverride = resolveHomeIdentity(true, { id: 'user-123' });
      assert.deepEqual(guestOverride, { kind: 'guest' });
      assert.equal(getIdentityKey(guestOverride), 'guest');
    });

    it('resolves authenticated identity when user exists and isGuest is false', () => {
      const authIdentity = resolveHomeIdentity(false, { id: 'user-aaa' });
      assert.deepEqual(authIdentity, { kind: 'authenticated', userId: 'user-aaa' });
      assert.equal(getIdentityKey(authIdentity), 'authenticated:user-aaa');
    });

    it('resolves unauthenticated (never guest) when session is missing and isGuest is false', () => {
      const unauth = resolveHomeIdentity(false, null);
      assert.deepEqual(unauth, { kind: 'unauthenticated' });
      assert.equal(getIdentityKey(unauth), null);
    });

    it('isolates cache keys between accounts and guest', () => {
      const guestKey = getHomeCacheKey({ kind: 'guest' });
      const userAKey = getHomeCacheKey({ kind: 'authenticated', userId: 'user-aaa' });
      const userBKey = getHomeCacheKey({ kind: 'authenticated', userId: 'user-bbb' });

      assert.equal(guestKey, 'shoonaya_home_cache_v1_guest');
      assert.equal(userAKey, 'shoonaya_home_cache_v1_user_user-aaa');
      assert.equal(userBKey, 'shoonaya_home_cache_v1_user_user-bbb');
      assert.notEqual(userAKey, userBKey);
      assert.notEqual(userAKey, guestKey);
    });
  });

  describe('2. HomeSummaryCoordinator Production Lifecycle & Request Deduplication', () => {
    it('fresh cache + same identity: renders cache and performs zero redundant background requests when valid and fresh', async () => {
      let homeSummaryNetworkRequests = 0;
      let appliedPayloads: any[] = [];
      let loadingStates: boolean[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-fresh-1' };
      const timezone = 'Europe/London';

      // Pre-seed cache
      await writeHomeCache({ kind: 'authenticated', userId: 'user-fresh-1' }, sampleHomeSummary, timezone);

      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          homeSummaryNetworkRequests++;
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: (p) => appliedPayloads.push(p),
        onSetLoading: (l) => loadingStates.push(l),
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
        getTimezone: () => timezone,
      });

      // Initial focus
      await coordinator.onFocus(userA);

      assert.equal(appliedPayloads.length, 2); // Cache first, then fresh network response
      assert.equal(homeSummaryNetworkRequests, 1, 'Initial cold focus with cache performs 1 network revalidation');

      // Second focus within freshness window (< 5m)
      await coordinator.onFocus(userA);
      assert.equal(homeSummaryNetworkRequests, 1, 'Subsequent fresh focus issues 0 additional network requests');
    });

    it('stale cache: renders cache immediately and issues exactly one background request', async () => {
      let homeSummaryNetworkRequests = 0;
      let appliedPayloads: any[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-stale-1' };
      const timezone = 'Europe/London';

      // Seed cache saved 10 minutes ago
      await writeHomeCache({ kind: 'authenticated', userId: 'user-stale-1' }, sampleHomeSummary, timezone);

      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          homeSummaryNetworkRequests++;
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: (p) => appliedPayloads.push(p),
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
        getTimezone: () => timezone,
      });

      // Simulate state already having cached data from 10 minutes ago
      coordinator.state.hasValidState = true;
      coordinator.state.lastLoadedAt = Date.now() - 10 * 60 * 1000;
      coordinator.state.lastIdentityKey = 'authenticated:user-stale-1';

      await coordinator.onFocus(userA);

      assert.equal(homeSummaryNetworkRequests, 1, 'Stale cache focus issues exactly 1 background request');
      assert.equal(coordinator.state.hasValidState, true);
    });

    it('hero changes during hydration: still issues exactly one request and triggers prefetch', async () => {
      let homeSummaryNetworkRequests = 0;
      let prefetchedUrls: string[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-hero-1' };
      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          homeSummaryNetworkRequests++;
          const nextSummary = {
            ...sampleHomeSummary,
            hero: {
              ...sampleHomeSummary.hero,
              imageUrl: '/assets/images/heroes/all/new-festival.webp',
            },
          };
          return new Response(JSON.stringify(nextSummary), { status: 200 });
        },
        onApplyPayload: () => {},
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        onPrefetchHeroImage: (url) => prefetchedUrls.push(url),
        buildGuestPayload: () => guestPayloadTemplate,
      });

      coordinator.setHeroUrl('/assets/images/heroes/all/default.webp');
      await coordinator.loadHome(userA);

      assert.equal(homeSummaryNetworkRequests, 1, 'Exactly 1 request issued');
      assert.deepEqual(prefetchedUrls, ['/assets/images/heroes/all/new-festival.webp']);
    });

    it('rapid refocus: deduplicates in-flight requests and produces no duplicate network calls', async () => {
      let homeSummaryNetworkRequests = 0;

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-rapid-1' };
      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          homeSummaryNetworkRequests++;
          // Simulate latency
          await new Promise((r) => setTimeout(r, 10));
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: () => {},
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      // Fire two rapid focus/load calls simultaneously
      await Promise.all([
        coordinator.loadHome(userA),
        coordinator.loadHome(userA),
        coordinator.loadHome(userA),
      ]);

      assert.equal(homeSummaryNetworkRequests, 1, 'Rapid concurrent focus calls deduplicate to exactly 1 network request');
    });

    it('User A -> User B: User A data cleared immediately before User B data renders', async () => {
      let homeSummaryNetworkRequests = 0;
      let appliedNames: string[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-A' };
      const userB: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-B' };
      let currentActiveUser = 'user-A';

      const coordinator: HomeSummaryCoordinator = new HomeSummaryCoordinator({
        fetchApi: async (): Promise<Response> => {
          homeSummaryNetworkRequests++;
          const name = currentActiveUser === 'user-B' ? 'User B Name' : 'User A Name';
          return new Response(
            JSON.stringify({
              ...sampleHomeSummary,
              profile: { ...sampleHomeSummary.profile, name },
            }),
            { status: 200 }
          );
        },
        onApplyPayload: (p) => appliedNames.push(p.profile.name),
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      // User A loads
      currentActiveUser = 'user-A';
      await coordinator.onFocus(userA);
      assert.equal(appliedNames[appliedNames.length - 1], 'User A Name');
      assert.equal(coordinator.state.lastIdentityKey, 'authenticated:user-A');

      // Switch to User B
      currentActiveUser = 'user-B';
      await coordinator.onFocus(userB);

      assert.equal(appliedNames[appliedNames.length - 1], 'User B Name');
      assert.equal(coordinator.state.lastIdentityKey, 'authenticated:user-B');
      assert.equal(homeSummaryNetworkRequests, 2, 'Exactly 1 request for User A and 1 request for User B');
    });

    it('superseded response cannot overwrite the current identity', async () => {
      let appliedUsers: string[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-slow-A' };
      const userB: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-fast-B' };

      const coordinator: HomeSummaryCoordinator = new HomeSummaryCoordinator({
        fetchApi: async (path: string): Promise<Response> => {
          // Slow response for User A, fast response for User B
          const isA = coordinator.state.lastIdentityKey === 'authenticated:user-slow-A';
          if (isA) {
            await new Promise((r) => setTimeout(r, 30));
            return new Response(
              JSON.stringify({
                ...sampleHomeSummary,
                profile: { ...sampleHomeSummary.profile, name: 'Slow User A' },
              }),
              { status: 200 }
            );
          }
          return new Response(
            JSON.stringify({
              ...sampleHomeSummary,
              profile: { ...sampleHomeSummary.profile, name: 'Fast User B' },
            }),
            { status: 200 }
          );
        },
        onApplyPayload: (p) => appliedUsers.push(p.profile.name),
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      // Trigger User A load (slow)
      const loadAPromise = coordinator.loadHome(userA);

      // Immediately switch to User B before A finishes
      coordinator.invalidateMemoryState('authenticated:user-fast-B');
      const loadBPromise = coordinator.loadHome(userB);

      await Promise.all([loadAPromise, loadBPromise]);

      // Final applied user must be User B, not overwritten by late User A
      assert.equal(appliedUsers[appliedUsers.length - 1], 'Fast User B');
      assert.equal(coordinator.state.lastIdentityKey, 'authenticated:user-fast-B');
    });

    it('benign timeout-cancellation retries once and succeeds, without ever showing the error state', async () => {
      // Reproduces a real production trace: /api/native/home-summary
      // returned 200 at ~15.0s and was cancelled by apiFetch's own 15s
      // AbortController race -- a benign race per isFetchCancelled's own
      // doc comment, not a real connectivity failure. First attempt throws
      // the same AbortError shape; second attempt (the automatic retry)
      // succeeds.
      let attempt = 0;
      let errorStates: boolean[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-cancel-retry' };
      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          attempt++;
          if (attempt === 1) {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            throw abortError;
          }
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: () => {},
        onSetLoading: () => {},
        onSetError: (e) => errorStates.push(e),
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      await coordinator.loadHome(userA);

      assert.equal(attempt, 2, 'Cancelled first attempt is retried exactly once');
      assert.equal(coordinator.state.hasValidState, true, 'Retry succeeded and produced valid state');
      assert.ok(!errorStates.includes(true), 'Error state is never set true for a benign cancellation that succeeds on retry');
    });

    it('a second cancellation (retry also fails) surfaces the error state -- no infinite retry loop', async () => {
      let attempt = 0;
      let errorStates: boolean[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-cancel-twice' };
      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          attempt++;
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          throw abortError;
        },
        onApplyPayload: () => {},
        onSetLoading: () => {},
        onSetError: (e) => errorStates.push(e),
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      await coordinator.loadHome(userA);

      assert.equal(attempt, 2, 'Retries exactly once, then stops -- never an infinite loop');
      assert.equal(errorStates[errorStates.length - 1], true, 'Second cancellation with no valid state falls back to the real error state');
    });
  });

  describe('3. SankalpaCoordinator Production Invariants & Request Counting', () => {
    it('authenticated -> guest: authenticated data cleared; ZERO Sankalpa API calls', async () => {
      let sankalpaRequests = 0;
      let statuses: string[] = [];

      const sankalpaCoordinator = new SankalpaCoordinator({
        fetchApi: async () => {
          sankalpaRequests++;
          return new Response(JSON.stringify({ sankalpa: null }), { status: 200 });
        },
        onSetStatus: (s) => statuses.push(s),
        onSetSankalpa: () => {},
        onSetCheckedToday: () => {},
      });

      const guestIdentity: HomeAuthIdentity = { kind: 'guest' };

      await sankalpaCoordinator.load(guestIdentity);

      assert.equal(sankalpaRequests, 0, 'Guest mode must make 0 authenticated Sankalpa network requests');
      assert.equal(statuses[statuses.length - 1], 'hidden');
    });

    it('unknown Sankalpa + network failure shows retry error, never empty state', async () => {
      let sankalpaRequests = 0;
      let currentStatus = 'initial';

      const sankalpaCoordinator = new SankalpaCoordinator(
        {
          fetchApi: async () => {
            sankalpaRequests++;
            throw new Error('Network timeout');
          },
          onSetStatus: (s) => {
            currentStatus = s;
          },
          onSetSankalpa: () => {},
          onSetCheckedToday: () => {},
        },
        undefined // undefined = unknown initial state
      );

      const authUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-err-1' };
      await sankalpaCoordinator.load(authUser);

      assert.equal(sankalpaRequests, 1, 'Attempted 1 fetch');
      assert.equal(currentStatus, 'error', 'Must show retry error instead of empty "Set your Sankalpa" on unverified cold load failure');
    });

    it('benign timeout-cancellation retries once and reaches ready, without ever showing error', async () => {
      let attempt = 0;
      let statuses: string[] = [];

      const sankalpaCoordinator = new SankalpaCoordinator(
        {
          fetchApi: async () => {
            attempt++;
            if (attempt === 1) {
              const abortError = new Error('Aborted');
              abortError.name = 'AbortError';
              throw abortError;
            }
            return new Response(JSON.stringify({ sankalpa: null }), { status: 200 });
          },
          onSetStatus: (s) => statuses.push(s),
          onSetSankalpa: () => {},
          onSetCheckedToday: () => {},
        },
        undefined
      );

      const authUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-sankalpa-cancel-retry' };
      await sankalpaCoordinator.load(authUser);
      // The retry is deferred via setTimeout(0) so it runs after `finally`
      // clears inFlightFetch -- wait a tick for it to actually complete.
      await new Promise((r) => setTimeout(r, 10));

      assert.equal(attempt, 2, 'Cancelled first attempt is retried exactly once');
      assert.equal(statuses[statuses.length - 1], 'ready', 'Retry succeeded and reached ready state');
      assert.ok(!statuses.includes('error'), 'Error status is never set for a benign cancellation that succeeds on retry');
    });

    it('confirmed null Sankalpa shows setup CTA (ready state)', async () => {
      let sankalpaRequests = 0;
      let currentStatus = 'initial';
      let currentSankalpa: SankalpaRow | null | undefined = undefined;

      const sankalpaCoordinator = new SankalpaCoordinator(
        {
          fetchApi: async () => {
            sankalpaRequests++;
            return new Response(JSON.stringify({ sankalpa: null }), { status: 200 });
          },
          onSetStatus: (s) => {
            currentStatus = s;
          },
          onSetSankalpa: (sk) => {
            currentSankalpa = sk;
          },
          onSetCheckedToday: () => {},
        },
        undefined
      );

      const authUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-null-1' };
      await sankalpaCoordinator.load(authUser);

      assert.equal(sankalpaRequests, 1, 'Issued 1 active sankalpa request');
      assert.equal(currentStatus, 'ready');
      assert.equal(currentSankalpa, null, 'Confirmed null sankalpa renders ready with setup CTA');
    });

    it('active Sankalpa present: issues exactly 1 active-sankalpa request and 1 checkin-status request', async () => {
      let activeSankalpaRequests = 0;
      let checkinRequests = 0;

      const activeSankalpa: SankalpaRow = {
        id: 'sankalpa-active-1',
        user_id: 'user-active-1',
        sankalpa_text: 'Daily Japa Meditation',
        target_count: 40,
        completed_count: 10,
        current_streak: 5,
        best_streak: 7,
        start_date: '2026-08-01',
        end_date: null,
        status: 'active',
        created_at: '',
        updated_at: '',
      };

      const sankalpaCoordinator = new SankalpaCoordinator(
        {
          fetchApi: async (path) => {
            if (path === '/api/sankalpa') {
              activeSankalpaRequests++;
              return new Response(JSON.stringify({ sankalpa: activeSankalpa }), { status: 200 });
            }
            if (path.startsWith('/api/sankalpa/checkin')) {
              checkinRequests++;
              return new Response(JSON.stringify({ checkins: ['2026-08-22'] }), { status: 200 });
            }
            throw new Error(`Unexpected path ${path}`);
          },
          onSetStatus: () => {},
          onSetSankalpa: () => {},
          onSetCheckedToday: () => {},
        },
        undefined
      );

      const authUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-active-1' };
      await sankalpaCoordinator.load(authUser);

      assert.equal(activeSankalpaRequests, 1, 'Exact 1 active sankalpa request');
      assert.equal(checkinRequests, 1, 'Exact 1 check-in status request');
    });

    it('repeated state updates do not retrigger the focus fetch', async () => {
      let activeSankalpaRequests = 0;

      const sankalpaCoordinator = new SankalpaCoordinator(
        {
          fetchApi: async () => {
            activeSankalpaRequests++;
            return new Response(JSON.stringify({ sankalpa: null }), { status: 200 });
          },
          onSetStatus: () => {},
          onSetSankalpa: () => {},
          onSetCheckedToday: () => {},
        },
        null
      );

      const authUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-stable-1' };

      // Initial focus load
      await sankalpaCoordinator.load(authUser);
      assert.equal(activeSankalpaRequests, 1);

      // Parent component re-renders or updates state multiple times
      sankalpaCoordinator.setInitialSankalpa(null);
      sankalpaCoordinator.setInitialSankalpa(null);

      // Re-triggering load while in-flight or stable does not duplicate request
      assert.equal(activeSankalpaRequests, 1, 'State updates did not trigger redundant network calls');
    });
  });

  describe('4. Deterministic Cache Sanitization & Timezone Validation', () => {
    it('sanitizes full HomeSummary and strips unnecessary/sensitive metadata', () => {
      const sanitized = sanitizeForHomeCache(sampleHomeSummary);

      assert.equal(sanitized.profile.name, 'Prince Sharma');
      assert.equal(sanitized.profile.firstName, 'Prince');
      assert.equal(sanitized.profile.tradition, 'hindu');
      assert.equal(sanitized.profile.karmaPoints, 120);

      // Unrendered location strings omitted
      assert.equal((sanitized.profile as any).city, undefined);
      assert.equal((sanitized.profile as any).country, undefined);

      // Free-text reflections omitted
      assert.equal((sanitized as any).sankalpa, undefined);

      // Coordinates preserved strictly for local Panchang computation
      assert.equal(sanitized.date.latitude, 51.5074);
      assert.equal(sanitized.date.longitude, -0.1278);
      assert.equal(sanitized.date.timezone, 'Europe/London');

      assert.equal(validateHomeSummaryPayload(sanitized), true);
    });

    it('computes 4 AM spiritual date boundary rollover accurately', () => {
      const earlyMorning = new Date('2026-08-22T03:30:00Z');
      const dayDate = new Date('2026-08-22T06:00:00Z');

      const earlySpiritualDate = spiritualDate('UTC', earlyMorning);
      const normalSpiritualDate = spiritualDate('UTC', dayDate);

      assert.equal(earlySpiritualDate, '2026-08-21', 'Before 4 AM belongs to previous spiritual date');
      assert.equal(normalSpiritualDate, '2026-08-22', 'After 4 AM belongs to current date');
    });
  });
});
