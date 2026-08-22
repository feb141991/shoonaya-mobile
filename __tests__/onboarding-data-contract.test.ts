import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSteps,
  getActiveSteps,
  stepEyebrow,
  getNotificationPersistencePayload,
  buildOnboardingProfilePayload,
  getOnboardingReadyPracticeCta,
  computeFinalNotificationState,
  type Step,
  type TraditionKey,
  type NotificationChoice,
} from '../lib/onboarding-contract';
import {
  OnboardingDraftStore,
  ONBOARDING_DRAFT_SCHEMA_VERSION,
  ONBOARDING_DRAFT_TTL_MS,
  getDraftStorageKey,
  type StorageAdapter,
  type Clock,
  type OnboardingDraftData,
  type OnboardingDraftEnvelope,
} from '../lib/onboardingDraft';
import { suggestedLifeStage } from '../lib/profile-constants';

/**
 * Controllable in-memory storage adapter for testing asynchronous out-of-order execution,
 * latency injection, and edge-case cancellation without duplicating production logic.
 */
class ControllableStorageAdapter implements StorageAdapter {
  public map = new Map<string, string>();
  public setItemHooks: Array<{ key: string; value: string; delayMs?: number }> = [];

  async getItem(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }

  async getAllKeys(): Promise<readonly string[]> {
    return Array.from(this.map.keys());
  }

  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      this.map.delete(key);
    }
  }
}

class ControllableClock implements Clock {
  public currentTime: number;

  constructor(initialTime: number = 1700000000000) {
    this.currentTime = initialTime;
  }

  now(): number {
    return this.currentTime;
  }

  advance(ms: number) {
    this.currentTime += ms;
  }
}

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

  describe('2. Notification Decision Table & Intent Invariants', () => {
    it('Allow + OS granted => preferences true, token registration eligible', () => {
      const choice: NotificationChoice = 'enabled';
      const osGranted = true;
      const finalState = computeFinalNotificationState(choice, osGranted);
      assert.equal(finalState, true);

      const payload = getNotificationPersistencePayload(finalState);
      assert.deepEqual(payload, {
        wants_festival_reminders: true,
        wants_nitya_reminders: true,
        wants_shloka_reminders: true,
        wants_community_notifications: true,
      });
    });

    it('Allow + OS denied/revoked => preferences false', () => {
      const choice: NotificationChoice = 'enabled';
      const osGranted = false;
      const finalState = computeFinalNotificationState(choice, osGranted);
      assert.equal(finalState, false);

      const payload = getNotificationPersistencePayload(finalState);
      assert.deepEqual(payload, {
        wants_festival_reminders: false,
        wants_nitya_reminders: false,
        wants_shloka_reminders: false,
        wants_community_notifications: false,
      });
    });

    it('Not now + OS granted => preferences false', () => {
      const choice: NotificationChoice = 'disabled';
      const osGranted = true;
      const finalState = computeFinalNotificationState(choice, osGranted);
      assert.equal(finalState, false, 'User explicit "Not now" must override already-granted OS permission');

      const payload = getNotificationPersistencePayload(finalState);
      assert.equal(payload.wants_festival_reminders, false);
      assert.equal(payload.wants_nitya_reminders, false);
      assert.equal(payload.wants_shloka_reminders, false);
      assert.equal(payload.wants_community_notifications, false);
    });

    it('Not now + OS denied => preferences false', () => {
      const choice: NotificationChoice = 'disabled';
      const osGranted = false;
      const finalState = computeFinalNotificationState(choice, osGranted);
      assert.equal(finalState, false);
    });

    it('Restored disabled choice + OS granted => preferences false', () => {
      const restoredChoice: NotificationChoice = 'disabled';
      const liveOsPermission = true;
      const finalState = computeFinalNotificationState(restoredChoice, liveOsPermission);
      assert.equal(finalState, false, 'Restored "disabled" choice must keep reminder preferences false');
    });

    it('Unset choice => preferences false', () => {
      const unsetChoice: NotificationChoice = 'unset';
      assert.equal(computeFinalNotificationState(unsetChoice, true), false);
      assert.equal(computeFinalNotificationState(unsetChoice, false), false);
    });

    it('builds full profile payload reflecting final notification decision', () => {
      const profile = buildOnboardingProfilePayload({
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
        notificationsEnabled: true,
      });

      assert.equal(profile.wants_festival_reminders, true);
      assert.equal(profile.wants_nitya_reminders, true);
      assert.equal(profile.wants_shloka_reminders, true);
      assert.equal(profile.wants_community_notifications, true);
      assert.equal(profile.onboarding_completed, true);
    });
  });

  describe('3. Production User-Scoped OnboardingDraftStore Invariants', () => {
    it('isolates storage keys strictly per user', () => {
      const keyUserA = getDraftStorageKey('user-aaa-111');
      const keyUserB = getDraftStorageKey('user-bbb-222');

      assert.notEqual(keyUserA, keyUserB);
      assert.equal(keyUserA, 'shoonaya_onboarding_draft_v1_user-aaa-111');
      assert.equal(keyUserB, 'shoonaya_onboarding_draft_v1_user-bbb-222');
    });

    it('ensures notification OS permission is absent from serialized drafts while user choice is preserved', async () => {
      const storage = new ControllableStorageAdapter();
      const clock = new ControllableClock();
      const store = new OnboardingDraftStore(storage, clock);

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
        notificationChoice: 'disabled',
        deniedNotificationPromptShown: true,
      };

      await store.saveDraft('user-1', sampleDraft);

      const rawSerialized = await storage.getItem(getDraftStorageKey('user-1'));
      assert.notEqual(rawSerialized, null);
      assert.equal(rawSerialized?.includes('notificationsPermissionGranted'), false, 'Dynamic OS permission must NOT be serialized');

      const restored = await store.readDraft('user-1');
      assert.notEqual(restored, null);
      assert.equal(restored?.notificationChoice, 'disabled', 'User notification choice must be preserved');
      assert.equal(restored?.name, 'Pooja');
    });

    it('newer same-user navigation wins despite delayed asynchronous writes', async () => {
      const storage = new ControllableStorageAdapter();
      const clock = new ControllableClock();
      const store = new OnboardingDraftStore(storage, clock);

      const baseDraft: OnboardingDraftData = {
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

      const step1Draft: OnboardingDraftData = { ...baseDraft, step: 'preferences' };
      const step2Draft: OnboardingDraftData = { ...baseDraft, step: 'personal', dateOfBirth: '1990-01-01' };
      const step3Draft: OnboardingDraftData = { ...baseDraft, step: 'goals', goals: ['peace', 'focus'] };

      // Queue saves rapidly (simulating fast user navigation)
      const p1 = store.saveDraft('user-1', step1Draft);
      const p2 = store.saveDraft('user-1', step2Draft);
      const p3 = store.saveDraft('user-1', step3Draft);

      await Promise.all([p1, p2, p3]);

      const finalDraft = await store.readDraft('user-1');
      assert.equal(finalDraft?.step, 'goals', 'Latest queued step (step 3) must be the final saved state');
      assert.deepEqual(finalDraft?.goals, ['peace', 'focus']);
    });

    it('separate users remain isolated and do not delay or suppress each other', async () => {
      const storage = new ControllableStorageAdapter();
      const clock = new ControllableClock();
      const store = new OnboardingDraftStore(storage, clock);

      const userADraft: OnboardingDraftData = {
        step: 'personal',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '1985-05-10',
        gender: 'male',
        lifeStage: 'grihastha',
        isManualLifeStage: false,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        name: 'User A',
      };

      const userBDraft: OnboardingDraftData = {
        step: 'name',
        tradition: 'buddhist',
        language: 'hi',
        dateOfBirth: '1995-11-20',
        gender: 'female',
        lifeStage: null,
        isManualLifeStage: false,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: ['mindfulness'],
        name: 'User B',
      };

      await Promise.all([
        store.saveDraft('user-A', userADraft),
        store.saveDraft('user-B', userBDraft),
      ]);

      const readA = await store.readDraft('user-A');
      const readB = await store.readDraft('user-B');

      assert.equal(readA?.name, 'User A');
      assert.equal(readA?.tradition, 'hindu');
      assert.equal(readB?.name, 'User B');
      assert.equal(readB?.tradition, 'buddhist');
    });

    it('pending save cannot recreate a draft after clearDraft', async () => {
      class LatencyStorageAdapter extends ControllableStorageAdapter {
        public readonly writeStarted: Promise<void>;
        private resolveWriteStarted: (() => void) | null = null;
        private readonly writeGate: Promise<void>;
        private resolveWriteGate: (() => void) | null = null;

        constructor() {
          super();
          this.writeStarted = new Promise<void>((resolve) => {
            this.resolveWriteStarted = resolve;
          });
          this.writeGate = new Promise<void>((resolve) => {
            this.resolveWriteGate = resolve;
          });
        }

        override async setItem(key: string, value: string): Promise<void> {
          this.resolveWriteStarted?.();
          await this.writeGate;
          await super.setItem(key, value);
        }

        releaseWrite() {
          this.resolveWriteGate?.();
        }
      }

      const delayedStorage = new LatencyStorageAdapter();
      const clock = new ControllableClock();
      const store = new OnboardingDraftStore(delayedStorage, clock);

      const draft: OnboardingDraftData = {
        step: 'personal',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        lifeStage: null,
        isManualLifeStage: false,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        name: 'Prince',
      };

      // Start saving draft with artificial latency
      const savePromise = store.saveDraft('user-1', draft);
      await delayedStorage.writeStarted;

      // The write is now genuinely inside setItem. Clearing must queue behind
      // it and remove the value after the blocked write is released.
      const clearPromise = store.clearDraft('user-1');
      delayedStorage.releaseWrite();
      await Promise.all([savePromise, clearPromise]);

      const finalDraft = await store.readDraft('user-1');
      assert.equal(finalDraft, null, 'Earlier pending save must NOT recreate draft after clearDraft was called');

      const futureDraft: OnboardingDraftData = { ...draft, step: 'goals', goals: ['peace'] };
      await store.saveDraft('user-1', futureDraft);
      assert.equal((await store.readDraft('user-1'))?.step, 'goals', 'A future save must work after clearDraft');
    });

    it('clearAllDrafts invalidates all pending writes across all users', async () => {
      class MultiWriteLatencyStorageAdapter extends ControllableStorageAdapter {
        public readonly allWritesStarted: Promise<void>;
        private resolveAllWritesStarted: (() => void) | null = null;
        private readonly writeGate: Promise<void>;
        private resolveWriteGate: (() => void) | null = null;
        private startedWrites = 0;

        constructor(private readonly expectedWrites: number) {
          super();
          this.allWritesStarted = new Promise<void>((resolve) => {
            this.resolveAllWritesStarted = resolve;
          });
          this.writeGate = new Promise<void>((resolve) => {
            this.resolveWriteGate = resolve;
          });
        }

        override async setItem(key: string, value: string): Promise<void> {
          this.startedWrites += 1;
          if (this.startedWrites === this.expectedWrites) {
            this.resolveAllWritesStarted?.();
          }
          await this.writeGate;
          await super.setItem(key, value);
        }

        releaseWrites() {
          this.resolveWriteGate?.();
        }
      }

      const storage = new MultiWriteLatencyStorageAdapter(2);
      const clock = new ControllableClock();
      const store = new OnboardingDraftStore(storage, clock);

      const draft: OnboardingDraftData = {
        step: 'preferences',
        tradition: 'sikh',
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

      const saveUser1 = store.saveDraft('user-1', draft);
      const saveUser2 = store.saveDraft('user-2', draft);
      await storage.allWritesStarted;

      const clearAllPromise = store.clearAllDrafts();
      storage.releaseWrites();
      await Promise.all([saveUser1, saveUser2, clearAllPromise]);

      assert.equal(await store.readDraft('user-1'), null);
      assert.equal(await store.readDraft('user-2'), null);
      assert.equal(storage.map.size, 0);

      const futureDraft: OnboardingDraftData = { ...draft, step: 'name', name: 'New session' };
      await store.saveDraft('user-1', futureDraft);
      assert.equal((await store.readDraft('user-1'))?.name, 'New session', 'A future save must work after clearAllDrafts');
    });

    it('rejects expired drafts (> 7 days TTL) and removes them from storage', async () => {
      const storage = new ControllableStorageAdapter();
      const clock = new ControllableClock(1700000000000);
      const store = new OnboardingDraftStore(storage, clock);

      const draft: OnboardingDraftData = {
        step: 'personal',
        tradition: 'hindu',
        language: 'en',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        lifeStage: null,
        isManualLifeStage: false,
        rashi: '',
        nakshatra: '',
        gotra: '',
        calendarProfile: '',
        calendarScope: '',
        goals: [],
        name: 'Prince',
      };

      await store.saveDraft('user-1', draft);
      assert.notEqual(await store.readDraft('user-1'), null);

      // Advance clock by 7 days + 1 minute
      clock.advance(ONBOARDING_DRAFT_TTL_MS + 60000);

      const expiredRead = await store.readDraft('user-1');
      assert.equal(expiredRead, null, 'Expired draft must return null');
      assert.equal(await storage.getItem(getDraftStorageKey('user-1')), null, 'Expired draft must be purged from storage');
    });

    it('rejects malformed envelopes, wrong user IDs, wrong schema versions, and future timestamps safely', async () => {
      const storage = new ControllableStorageAdapter();
      const clock = new ControllableClock(1700000000000);
      const store = new OnboardingDraftStore(storage, clock);

      const key = getDraftStorageKey('user-victim');

      // 1. Malformed JSON
      await storage.setItem(key, '{ invalid json');
      assert.equal(await store.readDraft('user-victim'), null);
      assert.equal(await storage.getItem(key), null);

      // 2. Wrong schema version
      const wrongSchemaEnvelope: OnboardingDraftEnvelope = {
        schemaVersion: 999,
        userId: 'user-victim',
        savedAt: clock.now(),
        data: { step: 'personal' } as any,
      };
      await storage.setItem(key, JSON.stringify(wrongSchemaEnvelope));
      assert.equal(await store.readDraft('user-victim'), null);

      // 3. Wrong user ID
      const wrongUserEnvelope: OnboardingDraftEnvelope = {
        schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
        userId: 'attacker-id',
        savedAt: clock.now(),
        data: { step: 'personal' } as any,
      };
      await storage.setItem(key, JSON.stringify(wrongUserEnvelope));
      assert.equal(await store.readDraft('user-victim'), null);

      // 4. Invalid future timestamp (> 60s ahead)
      const futureEnvelope: OnboardingDraftEnvelope = {
        schemaVersion: ONBOARDING_DRAFT_SCHEMA_VERSION,
        userId: 'user-victim',
        savedAt: clock.now() + 10000000,
        data: { step: 'personal' } as any,
      };
      await storage.setItem(key, JSON.stringify(futureEnvelope));
      assert.equal(await store.readDraft('user-victim'), null);
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
        notificationsEnabled: false,
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
