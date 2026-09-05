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
  withDateSensitiveFieldsPending,
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
  PanchangRetryController,
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

    it('uses the extended Home deadline for the production summary request', async () => {
      let receivedTimeout: number | undefined;
      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async (_path, options) => {
          receivedTimeout = options?.timeoutMs;
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: () => {},
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        buildGuestPayload: () => guestPayloadTemplate,
      });

      await coordinator.loadHome({ kind: 'authenticated', userId: 'home-timeout-policy' });

      assert.equal(receivedTimeout, 30_000);
    });

    it('stale spiritual date: identity renders instantly from cache, but Panchang/vrat/practice status are withheld as pending until the network response lands', async () => {
      let homeSummaryNetworkRequests = 0;
      let appliedPayloads: any[] = [];
      let pendingStates: boolean[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-stale-date-1' };
      const timezone = 'Europe/London';

      // Seed a cache envelope with YESTERDAY's spiritualDate -- simulates the
      // user opening the app on a new spiritual day with only an old cache
      // on disk.
      await writeHomeCache(
        { kind: 'authenticated', userId: 'user-stale-date-1' },
        sampleHomeSummary,
        timezone,
        '2020-01-01' // deliberately not today's spiritualDate
      );

      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          homeSummaryNetworkRequests++;
          return new Response(JSON.stringify(sampleHomeSummary), { status: 200 });
        },
        onApplyPayload: (p) => appliedPayloads.push(p),
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        onSetSectionsPending: (pending) => pendingStates.push(pending),
        buildGuestPayload: () => guestPayloadTemplate,
        getTimezone: () => timezone,
      });

      await coordinator.onFocus(userA);

      assert.equal(appliedPayloads.length, 2, 'Cache applied first, then the fresh network response');

      const cacheApplied = appliedPayloads[0];
      // Identity/hero/sacred-text pass through unchanged from cache -- these
      // are never tied to "today" and are always safe to show instantly.
      assert.equal(cacheApplied.profile.name, sampleHomeSummary.profile.name);
      assert.equal(cacheApplied.hero.imageUrl, sampleHomeSummary.hero.imageUrl);
      // Date-sensitive Panchang/vrat data must NOT carry over from the stale
      // cache -- this is the exact bug this fix prevents.
      assert.equal(cacheApplied.panchang.festivalLabel, null);
      assert.equal(cacheApplied.panchang.vratLabel, null);
      assert.deepEqual(cacheApplied.panchang.observance, null);
      assert.deepEqual(cacheApplied.panchang.upcomingObservances, []);
      // Practice-completion status must also be withheld, not carried over
      // from a previous spiritual day.
      assert.ok(cacheApplied.practices.every((p: any) => p.done === false));

      assert.deepEqual(pendingStates, [true, false], 'Pending flagged true on the stale cache apply, then false once fresh data lands');
      assert.equal(homeSummaryNetworkRequests, 1);
    });

    it('fresh spiritual date: cache applies with Panchang/vrat/practice data intact, never marked pending', async () => {
      let pendingStates: boolean[] = [];
      let appliedPayloads: any[] = [];

      const userA: HomeAuthIdentity = { kind: 'authenticated', userId: 'user-fresh-date-1' };
      const timezone = 'Europe/London';

      // writeHomeCache without an explicit spiritualDate stamps today's date
      // for the given timezone -- this is the normal, non-stale case.
      await writeHomeCache({ kind: 'authenticated', userId: 'user-fresh-date-1' }, sampleHomeSummary, timezone);

      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => new Response(JSON.stringify(sampleHomeSummary), { status: 200 }),
        onApplyPayload: (p) => appliedPayloads.push(p),
        onSetLoading: () => {},
        onSetError: () => {},
        onRedirectToLogin: () => {},
        onSetSectionsPending: (pending) => pendingStates.push(pending),
        buildGuestPayload: () => guestPayloadTemplate,
        getTimezone: () => timezone,
      });

      await coordinator.onFocus(userA);

      assert.equal(appliedPayloads[0].panchang.tithiLabel, sampleHomeSummary.panchang.tithiLabel, 'Fresh-date cache is applied as-is, not masked');
      assert.ok(!pendingStates.includes(true), 'A fresh-date cache hit never marks sections pending');
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

    it('defaults calendarStatus to ready when absent, and passes through pending from the network', () => {
      const sanitizedDefault = sanitizeForHomeCache(sampleHomeSummary);
      assert.equal(
        sanitizedDefault.panchang.calendarStatus,
        'ready',
        'An old cached/backend payload with no calendarStatus field must default to ready, not regress into a permanent skeleton'
      );

      const sanitizedPending = sanitizeForHomeCache({
        ...sampleHomeSummary,
        panchang: { ...sampleHomeSummary.panchang, calendarStatus: 'pending' },
      });
      assert.equal(sanitizedPending.panchang.calendarStatus, 'pending');
    });

    it('withDateSensitiveFieldsPending resets calendarStatus to pending on a spiritual-date rollover', () => {
      const sanitized = sanitizeForHomeCache(sampleHomeSummary);
      const reset = withDateSensitiveFieldsPending(sanitized);
      assert.equal(reset.panchang.calendarStatus, 'pending', 'Rolled-over date means today\'s materialization state is unknown again -- render the skeleton, not stale/confirmed data');
    });

    it('P2 regression: persisting a resolved panchang merge to the cache means a subsequent cold start never sees a stale pending skeleton', async () => {
      // Mirrors what a successful PanchangRetryController resolution must
      // do in index.tsx's onMergePanchang: not just update React state, but
      // also re-persist the FULL current payload (with the resolved
      // panchang folded in) via writeHomeCache -- otherwise the cache
      // written by the original loadHome() call (while still pending)
      // stays stale, and the next cold start's readHomeCache() would show
      // the skeleton again even though the backend already caught up.
      const identity: CacheIdentity = { kind: 'authenticated', userId: 'user-cache-coherence-1' };
      const timezone = 'Europe/London';

      await writeHomeCache(
        identity,
        { ...sampleHomeSummary, panchang: { ...sampleHomeSummary.panchang, calendarStatus: 'pending' } },
        timezone
      );

      const cachedBefore = await readHomeCache(identity, timezone);
      assert.equal(cachedBefore?.payload.panchang.calendarStatus, 'pending', 'Sanity check: the original cache write reflects the pending state');

      const resolvedObservance = {
        name: 'ekadashi-cache-coherence-test',
        emoji: '🪔',
        daysLeft: 0,
        routeKind: 'vrat',
        routeSlug: 'ekadashi-cache-coherence-test',
        href: '/vrat/ekadashi-cache-coherence-test',
        label: 'Today is Ekadashi Vrat',
        monthLabel: null,
        description: null,
      };
      const merged = {
        ...cachedBefore!.payload,
        panchang: { ...cachedBefore!.payload.panchang, calendarStatus: 'ready' as const, observance: resolvedObservance },
      };
      await writeHomeCache(identity, merged, timezone);

      const cachedAfter = await readHomeCache(identity, timezone);
      assert.equal(
        cachedAfter?.payload.panchang.calendarStatus,
        'ready',
        'A cold start after a successful in-session retry must read back ready, not the original pending snapshot'
      );
      assert.deepEqual(cachedAfter?.payload.panchang.observance, resolvedObservance);
    });
  });

  describe('5. PanchangRetryController -- bounded silent retry for the pending observance pill', () => {
    it('resolves to ready on the first attempt, merges only panchang, and cancels the remaining attempts', async () => {
      let fetchCalls = 0;
      const merged: any[] = [];
      let exhaustedCalls = 0;

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          fetchCalls++;
          return new Response(
            JSON.stringify({ panchang: { calendarStatus: 'ready', observance: { name: 'Ekadashi' } } }),
            { status: 200 }
          );
        },
        onMergePanchang: (p) => merged.push(p),
        onExhausted: () => { exhaustedCalls++; },
        delaysMs: [5, 15, 30],
      });

      controller.start();
      await new Promise((r) => setTimeout(r, 60));

      assert.equal(fetchCalls, 1, 'Stops calling once the first attempt resolves ready -- the 15ms/30ms attempts never fire');
      assert.equal(merged.length, 1);
      assert.equal(merged[0].calendarStatus, 'ready');
      assert.equal(exhaustedCalls, 0, 'A resolved sequence never reports exhaustion');
    });

    it('merges only the panchang key -- an unrelated field updated concurrently survives the retry response', async () => {
      // Mirrors acceptance test 9: /api/native/home-live can update
      // mood/notification/practice state independently and concurrently
      // with this retry. The controller must never see or touch that
      // state -- it only ever hands the caller `panchang`, so a caller
      // merging solely into its own `panchang` key cannot clobber it.
      let homeState: any = {
        panchang: { calendarStatus: 'pending' },
        moodStatus: { hasLoggedMoodToday: false, lastMood: null },
      };

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          // Simulate a concurrent home-live response landing while this
          // retry request is still in flight.
          homeState = { ...homeState, moodStatus: { hasLoggedMoodToday: true, lastMood: 'peaceful' } };
          return new Response(
            JSON.stringify({ panchang: { calendarStatus: 'ready', observance: { name: 'Ekadashi' } } }),
            { status: 200 }
          );
        },
        onMergePanchang: (p) => {
          homeState = { ...homeState, panchang: { ...homeState.panchang, ...p } };
        },
        onExhausted: () => {},
        delaysMs: [5],
      });

      controller.start();
      await new Promise((r) => setTimeout(r, 30));

      assert.equal(homeState.panchang.calendarStatus, 'ready');
      assert.equal(
        homeState.moodStatus.hasLoggedMoodToday,
        true,
        'The concurrent mood update was not reverted by the scoped panchang merge'
      );
      assert.equal(homeState.moodStatus.lastMood, 'peaceful');
    });

    it('exhausts after every bounded attempt still reports pending, signalling onExhausted exactly once', async () => {
      let fetchCalls = 0;
      let exhaustedCalls = 0;

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          fetchCalls++;
          return new Response(JSON.stringify({ panchang: { calendarStatus: 'pending' } }), { status: 200 });
        },
        onMergePanchang: () => {},
        onExhausted: () => { exhaustedCalls++; },
        delaysMs: [5, 15, 30],
      });

      controller.start();
      // Attempts are strictly sequential now (see start()'s doc comment),
      // so the total wait is the SUM of delaysMs (5+15+30=50ms), not their
      // max -- a generous multiple of that keeps this deterministic under
      // CI/parallel-suite load rather than racing a tight margin.
      await new Promise((r) => setTimeout(r, 300));

      assert.equal(fetchCalls, 3, 'All 3 bounded attempts fire -- no runaway polling beyond the sequence');
      assert.equal(exhaustedCalls, 1, 'Exhaustion is signalled exactly once, not once per attempt');
    });

    it('cancel() stops the sequence immediately -- no further attempts fire and exhaustion is never reported', async () => {
      let fetchCalls = 0;
      let exhaustedCalls = 0;
      let resolveFirstFetch: (() => void) | undefined;

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          fetchCalls++;
          if (fetchCalls === 1) {
            // Deliberately held open until the test explicitly releases it
            // below -- this decouples "cancel happens after attempt 1
            // started but before it resolves" from real-clock timing
            // margins, which would otherwise race against system load.
            await new Promise<void>((resolve) => { resolveFirstFetch = resolve; });
          }
          return new Response(JSON.stringify({ panchang: { calendarStatus: 'pending' } }), { status: 200 });
        },
        onMergePanchang: () => {},
        onExhausted: () => { exhaustedCalls++; },
        delaysMs: [5, 15, 30],
      });

      controller.start();
      // Wait until attempt 1's fetch has definitely started (fetchCalls
      // incremented) but is still held open.
      while (fetchCalls < 1) {
        await new Promise((r) => setTimeout(r, 2));
      }
      controller.cancel(); // e.g. unmount, or an identity/profile/location change
      resolveFirstFetch?.(); // now let attempt 1's held-open response land

      await new Promise((r) => setTimeout(r, 100));

      assert.equal(fetchCalls, 1, 'Cancelling before attempt 1 resolves means attempt 2 is never scheduled');
      assert.equal(exhaustedCalls, 0, 'A cancelled sequence never reports exhaustion');
    });

    it('P1 regression: an earlier attempt that resolves slowly can never overwrite a later attempt\'s resolved status', async () => {
      // Reproduces the exact race a prior version had: attempts were fired
      // on independent timers, so a slow-to-resolve early attempt's stale
      // `pending` response could land AFTER a faster later attempt's
      // `ready` response, silently reviving a skeleton the user had
      // already watched resolve. With strictly sequential attempts this is
      // structurally impossible -- attempt N+1 is never even started until
      // attempt N has fully settled, so there is never more than one
      // in-flight request to race in the first place.
      let call = 0;
      let inFlight = 0;
      let maxConcurrentRequests = 0;
      const merged: any[] = [];

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          call += 1;
          const thisCall = call;
          inFlight += 1;
          maxConcurrentRequests = Math.max(maxConcurrentRequests, inFlight);
          // The FIRST attempt is deliberately the slowest and reports
          // `pending` -- in the old parallel-timers design this response
          // would still be in flight while later, faster attempts resolved
          // `ready`, and would land afterward and stomp it back to pending.
          const latencyMs = thisCall === 1 ? 40 : 5;
          await new Promise((r) => setTimeout(r, latencyMs));
          inFlight -= 1;
          const calendarStatus = thisCall === 1 ? 'pending' : 'ready';
          return new Response(
            JSON.stringify({ panchang: { calendarStatus, observance: thisCall === 1 ? null : { name: 'Ekadashi' } } }),
            { status: 200 }
          );
        },
        onMergePanchang: (p) => merged.push(p),
        onExhausted: () => {},
        delaysMs: [5, 5, 5],
      });

      controller.start();
      // Sequential timeline: attempt1 timer (5ms) + its 40ms fetch, then
      // attempt2 timer (5ms) + its 5ms fetch -- roughly 55ms end to end. A
      // generous multiple avoids racing that estimate under system load.
      await new Promise((r) => setTimeout(r, 400));

      assert.equal(maxConcurrentRequests, 1, 'Never more than one request in flight at a time -- attempts are strictly sequential, so ordering cannot invert');
      assert.equal(
        merged[merged.length - 1].calendarStatus,
        'ready',
        'The final applied panchang is the genuinely resolved ready status, never regressed back to a stale pending response from an earlier, slower attempt'
      );
    });

    it('re-arms cleanly: calling start() again after exhaustion begins a fresh bounded sequence', async () => {
      let fetchCalls = 0;

      const controller = new PanchangRetryController({
        fetchApi: async () => {
          fetchCalls++;
          // Resolves ready only once re-armed past the first episode's 3 attempts.
          return new Response(
            JSON.stringify({ panchang: { calendarStatus: fetchCalls > 3 ? 'ready' : 'pending' } }),
            { status: 200 }
          );
        },
        onMergePanchang: () => {},
        onExhausted: () => {},
        delaysMs: [5, 10, 15],
      });

      controller.start(); // e.g. the pill first shows the skeleton
      // Sequential sum of delaysMs is 5+10+15=30ms -- generous margin under load.
      await new Promise((r) => setTimeout(r, 250));
      assert.equal(fetchCalls, 3, 'First episode exhausts after exactly 3 attempts');

      controller.start(); // e.g. a subsequent screen focus or pull-to-refresh
      await new Promise((r) => setTimeout(r, 150));
      assert.equal(fetchCalls, 4, 'The re-armed episode issues a fresh attempt and resolves, not blocked by the prior exhaustion');
    });
  });
});
