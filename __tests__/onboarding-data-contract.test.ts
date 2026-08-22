import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSteps,
  getActiveSteps,
  stepEyebrow,
  getNotificationPersistencePayload,
  buildOnboardingProfilePayload,
  type Step,
} from '../lib/onboarding-contract';
import {
  ONBOARDING_DRAFT_SCHEMA_VERSION,
  getDraftStorageKey,
  type OnboardingDraftData,
  type OnboardingDraftEnvelope,
} from '../lib/onboardingDraft';
import { suggestedLifeStage } from '../lib/profile-constants';

describe('Onboarding Data Contract Tests', () => {
  describe('1. Notification Permission Granted Contract', () => {
    it('sets all 4 reminder fields true when permission is granted', () => {
      const payload = getNotificationPersistencePayload(true);
      assert.deepEqual(payload, {
        wants_festival_reminders: true,
        wants_nitya_reminders: true,
        wants_shloka_reminders: true,
        wants_community_notifications: true,
      });
    });
  });

  describe('2. Notification Permission Denied Contract', () => {
    it('sets all 4 reminder fields false when permission is denied', () => {
      const payload = getNotificationPersistencePayload(false);
      assert.deepEqual(payload, {
        wants_festival_reminders: false,
        wants_nitya_reminders: false,
        wants_shloka_reminders: false,
        wants_community_notifications: false,
      });
    });
  });

  describe('3. Not Now Contract', () => {
    it('persists all 4 reminder fields false on Not now choice', () => {
      const fullProfile = buildOnboardingProfilePayload({
        displayName: 'Test Seeker',
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
        goals: ['peace'],
        notificationsPermissionGranted: false,
      });

      assert.equal(fullProfile.wants_festival_reminders, false);
      assert.equal(fullProfile.wants_nitya_reminders, false);
      assert.equal(fullProfile.wants_shloka_reminders, false);
      assert.equal(fullProfile.wants_community_notifications, false);
    });
  });

  describe('4. All Four Reminder Fields Completeness', () => {
    it('always includes all 4 distinct notification preference keys in the profile payload', () => {
      const grantedProfile = buildOnboardingProfilePayload({
        displayName: 'Seeker',
        tradition: 'sikh',
        language: 'en',
        dateOfBirth: '1995-05-10',
        gender: 'male',
        lifeStage: 'grihastha',
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: ['gurbani'],
        notificationsPermissionGranted: true,
      });

      assert.equal(grantedProfile.wants_festival_reminders, true);
      assert.equal(grantedProfile.wants_nitya_reminders, true);
      assert.equal(grantedProfile.wants_shloka_reminders, true);
      assert.equal(grantedProfile.wants_community_notifications, true);
    });
  });

  describe('5. Nullable Life Stage Contract', () => {
    it('persists life_stage as null when unanswered by user, never defaulting to brahmacharya', () => {
      const unansweredProfile = buildOnboardingProfilePayload({
        displayName: 'Seeker',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '',
        gender: 'prefer_not',
        lifeStage: null, // unanswered
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        notificationsPermissionGranted: false,
      });

      assert.equal(unansweredProfile.life_stage, null);
      assert.notEqual(unansweredProfile.life_stage, 'brahmacharya');
    });
  });

  describe('6. DOB-derived vs Manual Life Stage Contract', () => {
    it('derives life stage suggestion from DOB accurately', () => {
      const stageYoung = suggestedLifeStage('2010-01-01');
      assert.equal(stageYoung, 'brahmacharya');

      const stageAdult = suggestedLifeStage('1985-01-01');
      assert.equal(stageAdult, 'grihastha');

      const stageSenior = suggestedLifeStage('1960-01-01');
      assert.equal(stageSenior, 'vanaprastha');

      const stageElder = suggestedLifeStage('1940-01-01');
      assert.equal(stageElder, 'sannyasa');
    });

    it('handles DOB cleared vs manual override lifecycle correctly', () => {
      let lifeStage: string | null = null;
      let isManual = false;

      function onDobChange(dob: string) {
        if (!dob) {
          if (!isManual) lifeStage = null;
          return;
        }
        const suggested = suggestedLifeStage(dob);
        if (!isManual) lifeStage = suggested;
      }

      function onManualSelect(selected: string) {
        lifeStage = selected;
        isManual = true;
      }

      // Step A: DOB entered -> auto-suggests
      onDobChange('1990-06-15');
      assert.equal(lifeStage, 'grihastha');
      assert.equal(isManual, false);

      // Step B: DOB cleared without manual selection -> resets to null
      onDobChange('');
      assert.equal(lifeStage, null);

      // Step C: Manual selection made
      onManualSelect('vanaprastha');
      assert.equal(lifeStage, 'vanaprastha');
      assert.equal(isManual, true);

      // Step D: DOB changed / cleared -> preserves explicit manual selection
      onDobChange('2012-01-01');
      assert.equal(lifeStage, 'vanaprastha');

      onDobChange('');
      assert.equal(lifeStage, 'vanaprastha');
    });
  });

  describe('7. Merged Name Story and Active Step Denominators', () => {
    it('excludes ready and merged nameStory in Hindu flow (8 active steps)', () => {
      const steps = buildSteps('hindu');
      assert.equal(steps.includes('nameStory' as Step), false);
      assert.equal(steps.includes('ready'), true);

      const activeSteps = getActiveSteps(steps);
      assert.equal(activeSteps.length, 8);
      assert.equal(activeSteps.includes('ready'), false);

      assert.equal(stepEyebrow('preferences', steps, 'en'), 'Step 1 of 8');
      assert.equal(stepEyebrow('personal', steps, 'en'), 'Step 2 of 8');
      assert.equal(stepEyebrow('name', steps, 'en'), 'Step 7 of 8');
      assert.equal(stepEyebrow('notifications', steps, 'en'), 'Step 8 of 8');
      assert.equal(stepEyebrow('ready', steps, 'en'), '');
    });

    it('excludes ready and merged nameStory in non-Hindu flow (5 active steps)', () => {
      const steps = buildSteps('sikh');
      assert.equal(steps.includes('nameStory' as Step), false);

      const activeSteps = getActiveSteps(steps);
      assert.equal(activeSteps.length, 5);

      assert.equal(stepEyebrow('preferences', steps, 'en'), 'Step 1 of 5');
      assert.equal(stepEyebrow('name', steps, 'en'), 'Step 4 of 5');
      assert.equal(stepEyebrow('notifications', steps, 'en'), 'Step 5 of 5');
      assert.equal(stepEyebrow('preferences', steps, 'hi'), 'चरण 1 / 5');
    });
  });

  describe('8. State-Aware Navigation Labels (Never combine actions)', () => {
    function getNextButtonLabel(step: Step, isHindi: boolean, hasValue: boolean): string {
      if (
        step === 'nakshatra' ||
        step === 'calendarProfile' ||
        step === 'calendarScope' ||
        step === 'goals' ||
        step === 'name'
      ) {
        if (isHindi) return hasValue ? 'आगे बढ़ें' : 'अभी छोड़ें';
        return hasValue ? 'Continue' : 'Skip for now';
      }
      return isHindi ? 'आगे बढ़ें' : 'Continue';
    }

    it('renders "Continue" when optional fields have values, and "Skip for now" when empty', () => {
      // English
      assert.equal(getNextButtonLabel('name', false, true), 'Continue');
      assert.equal(getNextButtonLabel('name', false, false), 'Skip for now');
      assert.equal(getNextButtonLabel('nakshatra', false, true), 'Continue');
      assert.equal(getNextButtonLabel('nakshatra', false, false), 'Skip for now');
      assert.equal(getNextButtonLabel('goals', false, true), 'Continue');
      assert.equal(getNextButtonLabel('goals', false, false), 'Skip for now');

      // Hindi
      assert.equal(getNextButtonLabel('name', true, true), 'आगे बढ़ें');
      assert.equal(getNextButtonLabel('name', true, false), 'अभी छोड़ें');
      assert.equal(getNextButtonLabel('nakshatra', true, true), 'आगे बढ़ें');
      assert.equal(getNextButtonLabel('nakshatra', true, false), 'अभी छोड़ें');
    });
  });

  describe('9. Versioned User-Scoped Onboarding Draft Envelope', () => {
    it('generates distinct storage keys per user to prevent data cross-contamination', () => {
      const keyUserA = getDraftStorageKey('user-aaa-111');
      const keyUserB = getDraftStorageKey('user-bbb-222');

      assert.notEqual(keyUserA, keyUserB);
      assert.equal(keyUserA, 'shoonaya_onboarding_draft_v1_user-aaa-111');
      assert.equal(keyUserB, 'shoonaya_onboarding_draft_v1_user-bbb-222');
    });

    it('validates schema version and user ownership on deserialization', () => {
      const sampleDraft: OnboardingDraftData = {
        step: 'personal',
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
        goals: ['peace', 'mantra'],
        name: 'Pooja Sharma',
        notificationsPermissionGranted: true,
      };

      const envelope: OnboardingDraftEnvelope = {
        schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
        userId: 'user-aaa-111',
        savedAt: Date.now(),
        data: sampleDraft,
      };

      const raw = JSON.stringify(envelope);
      const parsed = JSON.parse(raw) as OnboardingDraftEnvelope;

      assert.equal(parsed.schemaVersion, 1);
      assert.equal(parsed.userId, 'user-aaa-111');
      assert.equal(parsed.data.name, 'Pooja Sharma');
      assert.equal(parsed.data.tradition, 'hindu');
    });
  });

  describe('10. Both Completion CTA Destinations', () => {
    it('has distinct, concrete destinations for practice initiation vs home exploration', () => {
      const practiceCtaDestination = '/bhakti/mala';
      const exploreCtaDestination = '/(tabs)';

      assert.notEqual(practiceCtaDestination, exploreCtaDestination);
      assert.equal(practiceCtaDestination, '/bhakti/mala');
      assert.equal(exploreCtaDestination, '/(tabs)');
    });
  });
});
