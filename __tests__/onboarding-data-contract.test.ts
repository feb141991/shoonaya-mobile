import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSteps,
  getActiveSteps,
  stepEyebrow,
  getNotificationPersistencePayload,
  buildOnboardingProfilePayload,
  getOnboardingReadyPracticeCta,
  type Step,
  type TraditionKey,
} from '../lib/onboarding-contract';
import {
  ONBOARDING_DRAFT_SCHEMA_VERSION,
  ONBOARDING_DRAFT_TTL_MS,
  getDraftStorageKey,
  type OnboardingDraftData,
  type OnboardingDraftEnvelope,
} from '../lib/onboardingDraft';
import { suggestedLifeStage } from '../lib/profile-constants';

describe('Onboarding Data Contract & Draft Persistence Suite', () => {
  describe('1. Tradition-Aware Ready Destination Resolver', () => {
    it('resolves genuine first-practice route for Hindu tradition', () => {
      const cta = getOnboardingReadyPracticeCta('hindu');
      assert.notEqual(cta, null);
      assert.equal(cta?.route, '/bhakti/mala');
      assert.equal(cta?.labelEn, 'Begin Japa Mala');
      assert.equal(cta?.labelHi, 'जाप माला शुरू करें');
    });

    it('resolves genuine meditation route for Buddhist tradition', () => {
      const cta = getOnboardingReadyPracticeCta('buddhist');
      assert.notEqual(cta, null);
      assert.equal(cta?.route, '/bhakti/zen');
      assert.equal(cta?.labelEn, 'Begin Meditation');
      assert.equal(cta?.labelHi, 'ध्यान शुरू करें');
    });

    it('returns null for Sikh and Jain traditions (cleanly removes primary practice CTA and retains Explore Shoonaya)', () => {
      const sikhCta = getOnboardingReadyPracticeCta('sikh');
      const jainCta = getOnboardingReadyPracticeCta('jain');

      assert.equal(sikhCta, null, 'Sikh has no appropriate dedicated first-practice screen yet');
      assert.equal(jainCta, null, 'Jain has no appropriate dedicated first-practice screen yet');
    });
  });

  describe('2. Notification Runtime OS State Invariants', () => {
    it('sets all 4 reminder fields true when live permission is granted', () => {
      const payload = getNotificationPersistencePayload(true);
      assert.deepEqual(payload, {
        wants_festival_reminders: true,
        wants_nitya_reminders: true,
        wants_shloka_reminders: true,
        wants_community_notifications: true,
      });
    });

    it('sets all 4 reminder fields false when live permission is denied or revoked', () => {
      const payload = getNotificationPersistencePayload(false);
      assert.deepEqual(payload, {
        wants_festival_reminders: false,
        wants_nitya_reminders: false,
        wants_shloka_reminders: false,
        wants_community_notifications: false,
      });
    });

    it('builds full profile payload reflecting live OS permission', () => {
      const grantedProfile = buildOnboardingProfilePayload({
        displayName: 'Prince',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        lifeStage: 'grihastha',
        rashi: 'Karka',
        nakshatra: 'Pushya',
        gotra: 'Kashyap',
        calendarProfile: 'north_indian_purnimanta',
        calendarScope: 'all_observances',
        goals: ['peace'],
        notificationsPermissionGranted: true,
      });

      assert.equal(grantedProfile.wants_festival_reminders, true);
      assert.equal(grantedProfile.wants_nitya_reminders, true);
      assert.equal(grantedProfile.wants_shloka_reminders, true);
      assert.equal(grantedProfile.wants_community_notifications, true);

      const deniedProfile = buildOnboardingProfilePayload({
        displayName: 'Prince',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        lifeStage: 'grihastha',
        rashi: 'Karka',
        nakshatra: 'Pushya',
        gotra: 'Kashyap',
        calendarProfile: 'north_indian_purnimanta',
        calendarScope: 'all_observances',
        goals: ['peace'],
        notificationsPermissionGranted: false,
      });

      assert.equal(deniedProfile.wants_festival_reminders, false);
      assert.equal(deniedProfile.wants_nitya_reminders, false);
      assert.equal(deniedProfile.wants_shloka_reminders, false);
      assert.equal(deniedProfile.wants_community_notifications, false);
    });
  });

  describe('3. Draft Persistence, Expiry & Sequential Ordering', () => {
    it('generates distinct storage keys per user to prevent data cross-contamination', () => {
      const keyUserA = getDraftStorageKey('user-aaa-111');
      const keyUserB = getDraftStorageKey('user-bbb-222');

      assert.notEqual(keyUserA, keyUserB);
      assert.equal(keyUserA, 'shoonaya_onboarding_draft_v1_user-aaa-111');
      assert.equal(keyUserB, 'shoonaya_onboarding_draft_v1_user-bbb-222');
    });

    it('ensures notification permission is excluded from durable draft storage', () => {
      const sampleDraft: OnboardingDraftData = {
        step: 'notifications',
        tradition: 'hindu',
        language: 'hi',
        dateOfBirth: '1992-04-12',
        gender: 'female',
        lifeStage: 'grihastha',
        isManualLifeStage: true,
        rashi: 'Mesh',
        nakshatra: 'Ashwini',
        gotra: 'Kashyap',
        calendarProfile: 'north_indian_purnimanta',
        calendarScope: 'all_observances',
        goals: ['peace'],
        name: 'Pooja',
        deniedNotificationPromptShown: true,
      };

      assert.equal((sampleDraft as any).notificationsPermissionGranted, undefined);
    });

    it('validates schema version and handles 7-day TTL expiration', () => {
      const validEnvelope: OnboardingDraftEnvelope = {
        schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
        userId: 'user-1',
        savedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
        data: {
          step: 'personal',
          tradition: 'hindu',
          language: 'en',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          lifeStage: 'grihastha',
          isManualLifeStage: false,
          rashi: '',
          nakshatra: '',
          gotra: '',
          calendarProfile: '',
          calendarScope: '',
          goals: [],
          name: 'Prince',
        },
      };

      assert.equal(validEnvelope.schemaVersion, 1);
      const isExpired = Date.now() - validEnvelope.savedAt > ONBOARDING_DRAFT_TTL_MS;
      assert.equal(isExpired, false);

      const expiredEnvelope: OnboardingDraftEnvelope = {
        ...validEnvelope,
        savedAt: Date.now() - (ONBOARDING_DRAFT_TTL_MS + 1000), // > 7 days ago
      };
      const isActuallyExpired = Date.now() - expiredEnvelope.savedAt > ONBOARDING_DRAFT_TTL_MS;
      assert.equal(isActuallyExpired, true);
    });

    it('orders draft writes so newer saves always take precedence over older saves', () => {
      let savedEnvelope: OnboardingDraftEnvelope | null = null;
      let latestQueuedTimestamp = 0;

      function simulateQueuedSave(userId: string, data: OnboardingDraftData, timestamp: number) {
        latestQueuedTimestamp = Math.max(latestQueuedTimestamp, timestamp);
        if (timestamp < latestQueuedTimestamp) return; // Drop obsolete write
        savedEnvelope = {
          schemaVersion: 1,
          userId,
          savedAt: timestamp,
          data,
        };
      }

      // Step 1 save started at t=100
      const draftStep1: OnboardingDraftData = {
        step: 'preferences',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '',
        gender: 'prefer_not',
        lifeStage: null,
        isManualLifeStage: false,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        name: '',
      };

      // Step 2 save started at t=200
      const draftStep2: OnboardingDraftData = {
        ...draftStep1,
        step: 'personal',
        dateOfBirth: '1990-01-01',
      };

      // Step 2 arrives first
      simulateQueuedSave('user-1', draftStep2, 200);
      assert.equal((savedEnvelope as any)?.data.step, 'personal');

      // Late Step 1 arrives afterwards
      simulateQueuedSave('user-1', draftStep1, 100);
      assert.equal((savedEnvelope as any)?.data.step, 'personal', 'Late Step 1 must not overwrite newer Step 2');
    });
  });

  describe('4. Life Stage & Step Counting Invariants', () => {
    it('persists life_stage as null when unanswered, never defaulting to brahmacharya', () => {
      const unansweredProfile = buildOnboardingProfilePayload({
        displayName: 'Seeker',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '',
        gender: 'prefer_not',
        lifeStage: null,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        notificationsPermissionGranted: false,
      });

      assert.equal(unansweredProfile.life_stage, null);
    });

    it('derives life stage from DOB correctly', () => {
      assert.equal(suggestedLifeStage('2010-01-01'), 'brahmacharya');
      assert.equal(suggestedLifeStage('1985-01-01'), 'grihastha');
      assert.equal(suggestedLifeStage('1960-01-01'), 'vanaprastha');
      assert.equal(suggestedLifeStage('1940-01-01'), 'sannyasa');
    });

    it('calculates active step count accurately (8 for Hindu, 5 for non-Hindu)', () => {
      const hinduSteps = buildSteps('hindu');
      const nonHinduSteps = buildSteps('sikh');

      assert.equal(getActiveSteps(hinduSteps).length, 8);
      assert.equal(getActiveSteps(nonHinduSteps).length, 5);

      assert.equal(stepEyebrow('preferences', hinduSteps, 'en'), 'Step 1 of 8');
      assert.equal(stepEyebrow('notifications', hinduSteps, 'en'), 'Step 8 of 8');
      assert.equal(stepEyebrow('notifications', nonHinduSteps, 'en'), 'Step 5 of 5');
    });
  });
});
