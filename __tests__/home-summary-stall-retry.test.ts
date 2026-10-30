import test, { describe, it, mock } from 'node:test';
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

import { parseRetryAfterMs, addJitter, classifyFailure } from '../lib/retryPolicy';
import { retryTransientReadOnce, get503RetryDelayMs, DEFAULT_503_RETRY_BASE_MS } from '../lib/api-503-retry';
import { PanchangRetryController, HomeSummaryCoordinator, type HomeAuthIdentity } from '../lib/homeCoordinator';
import { writeHomeCache, getOrReadHomeCache, clearHomeCache, type CacheIdentity } from '../lib/homeCache';

describe('Native Retry Behaviour During Backend Stalls (Prompt 10)', () => {
  describe('1. parseRetryAfterMs & addJitter Policy Contracts', () => {
    it('parses valid integer and decimal seconds into milliseconds', () => {
      assert.equal(parseRetryAfterMs('5'), 5_000);
      assert.equal(parseRetryAfterMs('10'), 10_000);
      assert.equal(parseRetryAfterMs('2.5'), 2_500);
    });

    it('clamps Retry-After between 500ms and 300,000ms (5 minutes)', () => {
      assert.equal(parseRetryAfterMs('0'), 500, 'must clamp to minimum 500ms to avoid zero-delay spam');
      assert.equal(parseRetryAfterMs('0.1'), 500);
      assert.equal(parseRetryAfterMs('999999'), 300_000, 'must clamp to maximum 5 minutes');
    });

    it('returns null for missing, empty, or unparseable headers', () => {
      assert.equal(parseRetryAfterMs(null), null);
      assert.equal(parseRetryAfterMs(undefined), null);
      assert.equal(parseRetryAfterMs(''), null);
      assert.equal(parseRetryAfterMs('invalid-header-value'), null);
    });

    it('addJitter applies proportional non-negative jitter (+0% to +maxJitterFraction)', () => {
      // 0% jitter
      assert.equal(addJitter(5_000, 0.25, () => 0), 5_000);
      // 25% jitter
      assert.equal(addJitter(5_000, 0.25, () => 1), 6_250);
      // 12.5% jitter
      assert.equal(addJitter(5_000, 0.25, () => 0.5), 5_625);
    });

    it('classifyFailure honors Retry-After on 5xx and 503, setting serverSpecifiedDelay', () => {
      const outcome503 = classifyFailure(503, '5', () => 0);
      assert.equal(outcome503.kind, 'retry');
      if (outcome503.kind === 'retry') {
        assert.equal(outcome503.afterMs, 5_000);
        assert.equal(outcome503.serverSpecifiedDelay, true);
      }

      const outcome500NoHeader = classifyFailure(500, null, () => 0);
      assert.equal(outcome500NoHeader.kind, 'retry');
      if (outcome500NoHeader.kind === 'retry') {
        assert.equal(outcome500NoHeader.afterMs, 2_000);
        assert.equal(outcome500NoHeader.serverSpecifiedDelay, false);
      }
    });
  });

  describe('2. retryTransientReadOnce 503 Guard Contracts', () => {
    it('honors Retry-After: 5 by waiting at least 5000ms before retrying a bodyless GET', async () => {
      let sends = 0;
      let waitedMs = 0;

      const mockResponse = {
        status: 503,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'retry-after' ? '5' : null),
        },
      };

      const result = await retryTransientReadOnce(
        mockResponse,
        async () => {
          sends++;
          return { status: 200, headers: { get: () => null } };
        },
        'GET',
        null,
        async (wait) => {
          waitedMs = wait;
        },
        () => 0 // deterministic 0% jitter
      );

      assert.equal(result.status, 200);
      assert.equal(sends, 1);
      assert.equal(waitedMs, 5_000, 'Must wait 5000ms matching backend Retry-After: 5');
    });

    it('never retries non-idempotent writes (POST, PUT, DELETE, PATCH) or requests with a body', async () => {
      const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      for (const method of writeMethods) {
        let sends = 0;
        const mockResponse = {
          status: 503,
          headers: { get: () => '5' as string | null },
        };

        const result = await retryTransientReadOnce(
          mockResponse,
          async () => { sends++; return { status: 200, headers: { get: () => null as string | null } }; },
          method,
          null,
          async () => assert.fail(`Must never wait or retry ${method}`),
          () => 0
        );

        assert.equal(result.status, 503);
        assert.equal(sends, 0, `Must never retry ${method}`);
      }

      // Also ensure GET with body is never retried
      let bodySends = 0;
      const getWithBody = await retryTransientReadOnce(
        { status: 503, headers: { get: () => '5' as string | null } },
        async () => { bodySends++; return { status: 200, headers: { get: () => null as string | null } }; },
        'GET',
        JSON.stringify({ query: 'search' }),
        async () => assert.fail('Must never retry GET with body'),
        () => 0
      );
      assert.equal(getWithBody.status, 503);
      assert.equal(bodySends, 0);
    });
  });

  describe('3. Request Count in 8s Stall Window (Fake Timers Measurement)', () => {
    it('measures that PanchangRetryController honors Retry-After: 5 and bounds requests in an 8-second window', async () => {
      mock.timers.enable({ apis: ['setTimeout', 'Date'] });
      try {
        let requestCount = 0;
        const requestTimestamps: number[] = [];

        const controller = new PanchangRetryController({
          fetchApi: async () => {
            requestCount++;
            requestTimestamps.push(Date.now());
            // Backend returning 503 Service Unavailable with Retry-After: 5
            return {
              ok: false,
              status: 503,
              headers: {
                get: (name: string) => (name.toLowerCase() === 'retry-after' ? '5' : null),
              },
              json: async () => ({}),
            } as unknown as Response;
          },
          onMergePanchang: () => {},
          onExhausted: () => {},
          delaysMs: [1000, 1000, 10000],
          randomFn: () => 0, // deterministic 0% jitter
        });

        controller.start();

        // At T = 0ms: no request yet (attempt 0 is scheduled for delaysMs[0] = 1000ms)
        await Promise.resolve();
        assert.equal(requestCount, 0);

        // Advance by 1000ms: attempt 0 fires
        mock.timers.tick(1000);
        await Promise.resolve();
        assert.equal(requestCount, 1, 'Attempt 0 fires at 1s');

        // Response was 503 with Retry-After: 5 (5000ms).
        // Next attempt must wait Math.max(delays[1], 5000) = 5000ms from T=1000ms (settles at T=6000ms).
        // Advance by 4999ms (total elapsed: 5999ms). If server delay were ignored, attempt 1 would have fired at 2000ms!
        mock.timers.tick(4999);
        await Promise.resolve();
        assert.equal(requestCount, 1, 'Must NOT retry before Retry-After: 5 has elapsed');

        // Advance 1ms more (total elapsed: 6000ms). Attempt 1 fires.
        mock.timers.tick(1);
        await Promise.resolve();
        assert.equal(requestCount, 2, 'Attempt 1 fires at T=6000ms');

        // Advance to T = 8000ms (2000ms more): total elapsed = 8000ms (the 8s window).
        mock.timers.tick(2000);
        await Promise.resolve();

        // In the entire 8-second window, exactly 2 requests fired (at T=2s and T=7s).
        // In the old unjittered / Retry-After ignoring code, 6 requests were hammered into 8s.
        assert.equal(
          requestCount,
          2,
          `In an 8s failure window with Retry-After: 5, request count is strictly bounded to 2 (was 6 before)`
        );

        controller.cancel();
      } finally {
        mock.timers.reset();
      }
    });
  });

  describe('4. Cache Isolation & Resilience During Stalls (§5)', () => {
    const testUser: HomeAuthIdentity = { kind: 'authenticated', userId: 'stall-test-user-1' };
    const cacheIdentity: CacheIdentity = { kind: 'authenticated', userId: 'stall-test-user-1' };
    const timezone = 'Asia/Kolkata';

    const sampleSummary = {
      profile: {
        name: 'Prince Sharma',
        firstName: 'Prince',
        tradition: 'hindu',
        city: 'London',
        country: 'UK',
        karmaPoints: 120,
        relicImageUrl: null,
        avatarUrl: null,
        wantsFestivalReminders: false,
        wantsVratReminders: true,
        wantsTithiReminders: false,
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
        series: [],
        storyCards: [],
        calendarStatus: 'ready' as const,
        calendarProfile: 'legacy-ujjain',
        sampradaya: null,
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
        nameLocal: 'श्री कृष्ण',
        namePa: 'ਸ੍ਰੀ ਕ੍ਰਿਸ਼ਨ',
        tagline: 'Ancient wisdom.',
        taglineLocal: 'प्राचीन ज्ञान।',
        taglinePa: 'ਪ੍ਰਾਚੀਨ ਗਿਆਨ।',
        href: '/dharm-veer',
      },
      firstWeek: false,
    };

    it('manual pull-to-refresh during a 503 backend stall does NOT erase usable cached Home content', async () => {
      // 1. Seed on-disk cache
      await writeHomeCache(cacheIdentity, sampleSummary as any, timezone);
      const preCheck = await getOrReadHomeCache(cacheIdentity, timezone);
      assert.ok(preCheck, 'On-disk cache must exist before refresh');

      let appliedPayload: any = null;
      let errorReported = false;

      const coordinator = new HomeSummaryCoordinator({
        fetchApi: async () => {
          // Backend stalls and returns 503
          return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
            status: 503,
            headers: { 'Retry-After': '5' },
          });
        },
        onApplyPayload: (p) => { appliedPayload = p; },
        onSetLoading: () => {},
        onSetError: (err) => { errorReported = err; },
        onRedirectToLogin: () => {},
        buildGuestPayload: () => sampleSummary as any,
        getTimezone: () => timezone,
      });

      // User performs manual pull-to-refresh
      await coordinator.loadHome(testUser, /* isManualRefresh */ true);

      // Verify on-disk cache was NOT erased!
      const postCheck = await getOrReadHomeCache(cacheIdentity, timezone);
      assert.ok(postCheck, 'On-disk cache MUST NOT be erased when a manual refresh fails during a stall (§5)');
      assert.equal(postCheck.payload.panchang.tithiLabel, 'Shukla Navami');
      assert.equal(postCheck.payload.profile.name, 'Prince Sharma');

      // Verify that usable cached content was recovered and applied, rather than flipping to an error screen
      assert.ok(appliedPayload, 'Cached payload should be recovered and applied');
      assert.equal(appliedPayload.panchang.tithiLabel, 'Shukla Navami');
      assert.equal(errorReported, false, 'Screen must remain usable with cached content, not error');

      // Clean up test cache
      await clearHomeCache(cacheIdentity);
    });
  });
});
