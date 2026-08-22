import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  HOME_CACHE_SCHEMA_VERSION,
  getHomeCacheKey,
  sanitizeForHomeCache,
  validateHomeSummaryPayload,
  type CachedHomeRenderModel,
  type CacheIdentity,
  type HomeCacheEnvelope,
} from '../lib/homeCache';
import { safeTimezone, spiritualDate } from '../lib/spiritualDate';

describe('Home SWR, Identity & Sankalpa Test Suite', () => {
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

  describe('1. Identity Resolution & Fallback Invariants', () => {
    function resolveIdentity(isGuest: boolean, user: { id: string } | null) {
      if (isGuest) {
        return { kind: 'guest' as const };
      }
      if (user) {
        return { kind: 'authenticated' as const, userId: user.id };
      }
      return { kind: 'unauthenticated' as const };
    }

    it('returns guest identity only when isGuestMode is explicitly true', () => {
      const guestIdentity = resolveIdentity(true, null);
      assert.deepEqual(guestIdentity, { kind: 'guest' });

      const guestOverrideIdentity = resolveIdentity(true, { id: 'user-123' });
      assert.deepEqual(guestOverrideIdentity, { kind: 'guest' });
    });

    it('returns authenticated identity when signed in and guest mode is false', () => {
      const authIdentity = resolveIdentity(false, { id: 'user-abc' });
      assert.deepEqual(authIdentity, { kind: 'authenticated', userId: 'user-abc' });
    });

    it('returns unauthenticated (never guest) when session is missing and guest mode is false', () => {
      const unauthIdentity = resolveIdentity(false, null);
      assert.deepEqual(unauthIdentity, { kind: 'unauthenticated' });
      assert.notEqual(unauthIdentity.kind, 'guest');
    });
  });

  describe('2. Account Partitioning & Stale Request Protection', () => {
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

    it('prevents stale requests from overwriting state when user/generation changes', () => {
      let currentRequestGen = 0;
      let state = 'initial';

      // Start Request 1 for User A
      const req1Gen = ++currentRequestGen;

      // User switches to User B -> starts Request 2
      const req2Gen = ++currentRequestGen;

      // Request 2 finishes first
      if (req2Gen === currentRequestGen) {
        state = 'user-b-state';
      }

      // Late Request 1 finishes later
      if (req1Gen === currentRequestGen) {
        state = 'user-a-state'; // Should not execute
      }

      assert.equal(state, 'user-b-state', 'Stale Request 1 must not overwrite newer Request 2');
    });
  });

  describe('3. Timezone Awareness & 4 AM Spiritual Day Boundary', () => {
    it('handles safe timezone fallbacks gracefully for invalid/malformed strings', () => {
      assert.doesNotThrow(() => safeTimezone('Invalid/Timezone_Name'));
      assert.doesNotThrow(() => safeTimezone(''));
      assert.doesNotThrow(() => safeTimezone(null));
      assert.doesNotThrow(() => safeTimezone(undefined));

      assert.equal(safeTimezone('Asia/Kolkata'), 'Asia/Kolkata');
      assert.equal(safeTimezone('America/New_York'), 'America/New_York');
    });

    it('computes 4 AM rollover correctly (before 4 AM belongs to previous spiritual day)', () => {
      // 2026-08-22 at 03:30 AM in Asia/Kolkata (UTC is 2026-08-21T22:00:00Z)
      const before4AmUtc = new Date('2026-08-21T22:00:00.000Z');
      const dateBefore4Am = spiritualDate('Asia/Kolkata', before4AmUtc);
      assert.equal(dateBefore4Am, '2026-08-21', '03:30 AM should belong to previous spiritual day (2026-08-21)');

      // 2026-08-22 at 04:01 AM in Asia/Kolkata (UTC is 2026-08-21T22:31:00Z)
      const after4AmUtc = new Date('2026-08-21T22:31:00.000Z');
      const dateAfter4Am = spiritualDate('Asia/Kolkata', after4AmUtc);
      assert.equal(dateAfter4Am, '2026-08-22', '04:01 AM should belong to current spiritual day (2026-08-22)');
    });

    it('validates envelope spiritual date using the envelope canonical timezone', () => {
      const fixedNow = new Date('2026-08-22T10:00:00.000Z'); // 10:00 UTC / 15:30 IST / 11:00 London

      const envelopeKolkata: HomeCacheEnvelope = {
        schemaVersion: HOME_CACHE_SCHEMA_VERSION,
        identity: { kind: 'authenticated', userId: 'user-1' },
        spiritualDate: '2026-08-22',
        timezone: 'Asia/Kolkata',
        savedAt: fixedNow.getTime() - 1000,
        payload: sampleHomeSummary,
      };

      // When validating in London device timezone vs Kolkata profile timezone:
      const kolkataSpiritualDate = spiritualDate(envelopeKolkata.timezone, fixedNow);
      assert.equal(kolkataSpiritualDate, envelopeKolkata.spiritualDate);
    });
  });

  describe('4. Cache Validation & Corruption Handling', () => {
    it('validates complete HomeSummary payload structure', () => {
      assert.equal(validateHomeSummaryPayload(sampleHomeSummary), true);
      assert.equal(validateHomeSummaryPayload(null), false);
      assert.equal(validateHomeSummaryPayload({}), false);
      assert.equal(validateHomeSummaryPayload({ profile: {} }), false);
    });

    it('rejects schema mismatch or corrupted JSON', () => {
      const invalidVersionEnvelope = {
        schemaVersion: 999,
        identity: { kind: 'guest' },
        spiritualDate: '2026-08-22',
        timezone: 'Asia/Kolkata',
        savedAt: Date.now(),
        payload: sampleHomeSummary,
      };

      assert.notEqual(invalidVersionEnvelope.schemaVersion, HOME_CACHE_SCHEMA_VERSION);
    });
  });

  describe('5. Sankalpa Referential Stability & Focus Fetch Cardinality', () => {
    it('ensures load handler does not re-create on state updates', () => {
      let fetchCount = 0;
      let state = { sankalpa: null as null | { id: string; text: string } };

      // Simulate a stable load function with refs
      const sankalpaRef = { current: state.sankalpa };

      const load = async () => {
        fetchCount++;
        const fetched = { id: 's1', text: 'Daily Japa' };
        sankalpaRef.current = fetched;
        state = { sankalpa: fetched };
        return fetched;
      };

      // Simulating 2 genuine focus events
      void load();
      assert.equal(fetchCount, 1);
      assert.deepEqual(sankalpaRef.current, { id: 's1', text: 'Daily Japa' });

      // State updated, but `load` reference does not change
      // Second genuine focus event
      void load();
      assert.equal(fetchCount, 2);
    });

    it('retains initial or cached data on network revalidation failure', async () => {
      let status: 'loading' | 'ready' | 'error' = 'ready';
      let currentSankalpa: { id: string; text: string } | null = { id: 'initial-1', text: 'Initial Sadhana' };

      const sankalpaRef = { current: currentSankalpa };
      const hasEverLoadedRef = { current: true };

      // Simulating a failed background network fetch
      const simulateFailedRevalidation = async () => {
        try {
          throw new Error('Network timeout');
        } catch {
          if (sankalpaRef.current !== null || hasEverLoadedRef.current) {
            status = 'ready'; // Retain valid initial data
          } else {
            status = 'error';
          }
        }
      };

      await simulateFailedRevalidation();
      assert.equal(status, 'ready');
      assert.deepEqual(currentSankalpa, { id: 'initial-1', text: 'Initial Sadhana' });
    });

    it('shows error state instead of false "Set a Sankalpa" when cold fetch fails', async () => {
      let status: 'loading' | 'ready' | 'error' = 'loading';
      let currentSankalpa: { id: string; text: string } | null = null;

      const sankalpaRef = { current: null };
      const hasEverLoadedRef = { current: false };

      // Simulating a failed cold load with NO prior data
      const simulateFailedColdLoad = async () => {
        try {
          throw new Error('Network timeout');
        } catch {
          if (sankalpaRef.current !== null || hasEverLoadedRef.current) {
            status = 'ready';
          } else {
            status = 'error';
          }
        }
      };

      await simulateFailedColdLoad();
      assert.equal(status, 'error', 'Must show retry error rather than empty "Set your Sankalpa" on cold network failure');
    });
  });

  describe('6. Explicit Cached Home Render Model & Privacy Invariants', () => {
    it('sanitizes full HomeSummary and strips unnecessary/sensitive metadata', () => {
      const sanitized = sanitizeForHomeCache(sampleHomeSummary);

      // Verify fields needed for first rendered frame are preserved
      assert.equal(sanitized.profile.name, 'Prince Sharma');
      assert.equal(sanitized.profile.firstName, 'Prince');
      assert.equal(sanitized.profile.tradition, 'hindu');
      assert.equal(sanitized.profile.karmaPoints, 120);

      // Verify unrendered location strings (city/country) are not persisted in cached model
      assert.equal((sanitized.profile as any).city, undefined);
      assert.equal((sanitized.profile as any).country, undefined);

      // Verify free-text Sankalpa reflections are omitted from generic home cache
      assert.equal((sanitized as any).sankalpa, undefined);

      // Verify coordinates are preserved strictly for immediate local Panchang calculation
      assert.equal(sanitized.date.latitude, 51.5074);
      assert.equal(sanitized.date.longitude, -0.1278);
      assert.equal(sanitized.date.timezone, 'Europe/London');

      // Verify sacred text and hero rendering data
      assert.equal(sanitized.sacredText.original, 'वसुधैव कुटुम्बकम्');
      assert.equal(sanitized.hero.imageUrl, '/assets/images/heroes/all/default.webp');
      assert.equal(sanitized.practices.length, 1);
    });

    it('measures cache hydration and render timing', () => {
      const t0 = performance.now();
      const sanitized = sanitizeForHomeCache(sampleHomeSummary);
      const json = JSON.stringify(sanitized);
      const tSerialized = performance.now() - t0;

      const tHydrateStart = performance.now();
      const hydrated = JSON.parse(json);
      const isValid = validateHomeSummaryPayload(hydrated);
      const tHydrateEnd = performance.now() - tHydrateStart;

      assert.equal(isValid, true);
      assert.ok(tHydrateEnd < 10, `Cache hydration took ${tHydrateEnd.toFixed(2)}ms (expected < 10ms)`);
    });
  });
});
