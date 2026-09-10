import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getHomeDiscoveryState,
  recordHomeFocusSession,
  isHeroArtworkCueEligible,
  dismissHeroArtworkCue,
  markHeroArtworkPickerOpened,
  clearHomeDiscoveryState,
  replayHomeDiscovery,
  clearAllHomeDiscoveryStates,
  resolveIdentityKey,
  isGuidedTourEligible,
  advanceGuidedTour,
  finishGuidedTour,
  GUIDED_TOUR_STEP_COUNT,
  type CueEvaluationContext,
} from '@/lib/homeDiscovery';
import type { AppIdentity } from '@/lib/appIdentity';

testReplay();
function testReplay() {
  const ctx = { hasRenderedContent: true, isFirstWeek: false, hasBlockingHomeSurface: false };

  it('explicit replay restarts the guided tour, and the artwork cue does not require another three cold launches once the tour is done', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'replay-only' };
    await replayHomeDiscovery(identity);

    // The tour comes back first, from the top -- not straight to the cue.
    const restarted = await recordHomeFocusSession(identity, true, 'current');
    assert.equal(restarted.guidedTourStep, 0);
    assert.equal(isGuidedTourEligible(restarted, ctx), true);
    assert.equal(isHeroArtworkCueEligible(restarted, ctx), false, 'cue must wait for the replayed tour to finish, same as the first time');

    // Once the (replayed) tour is finished, the cue is immediately
    // reachable -- session count was preserved by replay, not reset.
    const afterTour = await finishGuidedTour(identity);
    assert.equal(isHeroArtworkCueEligible(afterTour, ctx), true);

    assert.equal((await getHomeDiscoveryState({ kind: 'authenticated', userId: 'other-replay-user' })).sessionCount, 0);
  });
}

describe('Home Discovery — Identity Scoping & Session Counting', () => {
  const userA: AppIdentity = { kind: 'authenticated', userId: 'user_alpha' };
  const userB: AppIdentity = { kind: 'authenticated', userId: 'user_beta' };
  const guest: AppIdentity = { kind: 'guest' };
  const unauth: AppIdentity = { kind: 'unauthenticated' };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('1. resolves distinct identity keys for guest, user, and unauthenticated', () => {
    assert.equal(resolveIdentityKey(userA), 'user_user_alpha');
    assert.equal(resolveIdentityKey(userB), 'user_user_beta');
    assert.equal(resolveIdentityKey(guest), 'guest');
    assert.equal(resolveIdentityKey(unauth), 'unauthenticated');
  });

  it('2. initial discovery state has sessionCount=0 and heroArtworkCueDismissed=false', async () => {
    const state = await getHomeDiscoveryState(userA);
    assert.equal(state.version, 1);
    assert.equal(state.sessionCount, 0);
    assert.equal(state.heroArtworkCueDismissed, false);
    assert.equal(state.lastCountedSessionId, null);
  });

  it('3. does not increment sessionCount if Home has not rendered valid content', async () => {
    const state = await recordHomeFocusSession(userA, false, 'sess_1');
    assert.equal(state.sessionCount, 0);
    assert.equal(state.lastCountedSessionId, null);
  });

  it('4. increments sessionCount once per cold launch / distinct session ID', async () => {
    const s1 = await recordHomeFocusSession(userA, true, 'sess_1');
    assert.equal(s1.sessionCount, 1);
    assert.equal(s1.lastCountedSessionId, 'sess_1');

    // Repeated focus within the same session (tab switches) does not increment
    const s2 = await recordHomeFocusSession(userA, true, 'sess_1');
    assert.equal(s2.sessionCount, 1);

    const s3 = await recordHomeFocusSession(userA, true, 'sess_1');
    assert.equal(s3.sessionCount, 1);

    // New distinct session (subsequent launch / foregrounding) increments
    const s4 = await recordHomeFocusSession(userA, true, 'sess_2');
    assert.equal(s4.sessionCount, 2);
    assert.equal(s4.lastCountedSessionId, 'sess_2');

    const s5 = await recordHomeFocusSession(userA, true, 'sess_3');
    assert.equal(s5.sessionCount, 3);
  });

  it('5. maintains strict identity isolation (User A, User B, and Guest do not share counts)', async () => {
    await recordHomeFocusSession(userA, true, 'sess_1');
    await recordHomeFocusSession(userA, true, 'sess_2');
    await recordHomeFocusSession(userA, true, 'sess_3');

    await recordHomeFocusSession(guest, true, 'sess_1');

    const stateA = await getHomeDiscoveryState(userA);
    const stateB = await getHomeDiscoveryState(userB);
    const stateGuest = await getHomeDiscoveryState(guest);

    assert.equal(stateA.sessionCount, 3);
    assert.equal(stateB.sessionCount, 0);
    assert.equal(stateGuest.sessionCount, 1);
  });
});

describe('Home Discovery — Cue Eligibility & Overlay Suppression', () => {
  const baseContext: CueEvaluationContext = {
    hasRenderedContent: true,
    isFirstWeek: false,
    hasBlockingHomeSurface: false,
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('1. cue is not eligible before reaching 3 sessions', () => {
    const state = {
      version: 1 as const,
      identityKey: 'user_1',
      sessionCount: 2,
      lastCountedSessionId: 'sess_2',
      heroArtworkCueDismissed: false,
      guidedTourStep: 0,
      guidedTourFinished: true,
      updatedAt: Date.now(),
    };
    assert.equal(isHeroArtworkCueEligible(state, baseContext), false);
  });

  it('2. cue becomes eligible when sessionCount >= 3 with no blockers', () => {
    const state = {
      version: 1 as const,
      identityKey: 'user_1',
      sessionCount: 3,
      lastCountedSessionId: 'sess_3',
      heroArtworkCueDismissed: false,
      guidedTourStep: 0,
      guidedTourFinished: true,
      updatedAt: Date.now(),
    };
    assert.equal(isHeroArtworkCueEligible(state, baseContext), true);
  });

  it('3. cue is strictly suppressed when isFirstWeek is true', () => {
    const state = {
      version: 1 as const,
      identityKey: 'user_1',
      sessionCount: 5,
      lastCountedSessionId: 'sess_5',
      heroArtworkCueDismissed: false,
      guidedTourStep: 0,
      guidedTourFinished: true,
      updatedAt: Date.now(),
    };
    assert.equal(isHeroArtworkCueEligible(state, { ...baseContext, isFirstWeek: true }), false);
  });

  it('4. cue is strictly suppressed when hasBlockingHomeSurface is true', () => {
    const state = {
      version: 1 as const,
      identityKey: 'user_1',
      sessionCount: 5,
      lastCountedSessionId: 'sess_5',
      heroArtworkCueDismissed: false,
      guidedTourStep: 0,
      guidedTourFinished: true,
      updatedAt: Date.now(),
    };
    assert.equal(isHeroArtworkCueEligible(state, { ...baseContext, hasBlockingHomeSurface: true }), false);
  });

  it('5. cue is suppressed when content has not rendered', () => {
    const state = {
      version: 1 as const,
      identityKey: 'user_1',
      sessionCount: 5,
      lastCountedSessionId: 'sess_5',
      heroArtworkCueDismissed: false,
      guidedTourStep: 0,
      guidedTourFinished: true,
      updatedAt: Date.now(),
    };
    assert.equal(isHeroArtworkCueEligible(state, { ...baseContext, hasRenderedContent: false }), false);
  });

  it('6. dismissHeroArtworkCue marks dismissed permanently and prevents cue eligibility', async () => {
    const user: AppIdentity = { kind: 'authenticated', userId: 'user_1' };
    await finishGuidedTour(user);
    await recordHomeFocusSession(user, true, 'sess_1');
    await recordHomeFocusSession(user, true, 'sess_2');
    await recordHomeFocusSession(user, true, 'sess_3');

    let state = await getHomeDiscoveryState(user);
    assert.equal(isHeroArtworkCueEligible(state, baseContext), true);

    state = await dismissHeroArtworkCue(user);
    assert.equal(state.heroArtworkCueDismissed, true);
    assert.equal(isHeroArtworkCueEligible(state, baseContext), false);

    // Re-reading from storage still returns dismissed
    const reloaded = await getHomeDiscoveryState(user);
    assert.equal(reloaded.heroArtworkCueDismissed, true);
    assert.equal(isHeroArtworkCueEligible(reloaded, baseContext), false);
  });

  it('7. markHeroArtworkPickerOpened also marks dismissed permanently', async () => {
    const user: AppIdentity = { kind: 'authenticated', userId: 'user_2' };
    await recordHomeFocusSession(user, true, 'sess_1');
    await recordHomeFocusSession(user, true, 'sess_2');
    await recordHomeFocusSession(user, true, 'sess_3');

    const state = await markHeroArtworkPickerOpened(user);
    assert.equal(state.heroArtworkCueDismissed, true);
    assert.equal(isHeroArtworkCueEligible(state, baseContext), false);
  });

  it('8. clearAllHomeDiscoveryStates wipes all discovery entries on logout', async () => {
    const userA: AppIdentity = { kind: 'authenticated', userId: 'user_a' };
    const guest: AppIdentity = { kind: 'guest' };

    await recordHomeFocusSession(userA, true, 'sess_1');
    await recordHomeFocusSession(guest, true, 'sess_1');

    assert.equal((await getHomeDiscoveryState(userA)).sessionCount, 1);
    assert.equal((await getHomeDiscoveryState(guest)).sessionCount, 1);

    await clearAllHomeDiscoveryStates();

    assert.equal((await getHomeDiscoveryState(userA)).sessionCount, 0);
    assert.equal((await getHomeDiscoveryState(guest)).sessionCount, 0);
  });

  it('9. recovers safely from corrupted or malformed JSON payloads without throwing', async () => {
    const user: AppIdentity = { kind: 'authenticated', userId: 'user_corrupt' };
    await AsyncStorage.setItem('shoonaya_home_discovery_v1_user_user_corrupt', '{ malformed json :: [');

    const state = await getHomeDiscoveryState(user);
    assert.equal(state.version, 1);
    assert.equal(state.sessionCount, 0);
    assert.equal(state.heroArtworkCueDismissed, false);
  });

  it('11. clearHomeDiscoveryState ("replay first-use tips") re-arms cue eligibility for one identity without touching another', async () => {
    // Settings' "Replay first-use tips" action clears one identity's own
    // discovery state (unlike clearAllHomeDiscoveryStates, which is a
    // logout-wide wipe) -- a signed-in user replaying tips must not reset
    // some other identity's progress sharing the same device.
    const userA: AppIdentity = { kind: 'authenticated', userId: 'user_replay_a' };
    const userB: AppIdentity = { kind: 'authenticated', userId: 'user_replay_b' };
    await recordHomeFocusSession(userA, true, 'sess_1');
    await recordHomeFocusSession(userA, true, 'sess_2');
    await recordHomeFocusSession(userA, true, 'sess_3');
    await dismissHeroArtworkCue(userA);
    await recordHomeFocusSession(userB, true, 'sess_1');
    await recordHomeFocusSession(userB, true, 'sess_2');
    await recordHomeFocusSession(userB, true, 'sess_3');
    await dismissHeroArtworkCue(userB);

    await clearHomeDiscoveryState(userA);

    const stateA = await getHomeDiscoveryState(userA);
    assert.equal(stateA.sessionCount, 0);
    assert.equal(stateA.heroArtworkCueDismissed, false);
    assert.equal(isHeroArtworkCueEligible(stateA, baseContext), false, 'still needs 3 fresh sessions, not instantly eligible');

    const stateB = await getHomeDiscoveryState(userB);
    assert.equal(stateB.sessionCount, 3, 'user B is untouched by user A replaying their tips');
    assert.equal(stateB.heroArtworkCueDismissed, true);
  });

  it('10. handles unauthenticated identity gracefully without throwing or mutating storage', async () => {
    const unauth: AppIdentity = { kind: 'unauthenticated' };
    const initial = await getHomeDiscoveryState(unauth);
    assert.equal(initial.sessionCount, 0);

    const afterRecord = await recordHomeFocusSession(unauth, true, 'sess_x');
    assert.equal(afterRecord.sessionCount, 0);

    const afterDismiss = await dismissHeroArtworkCue(unauth);
    assert.equal(afterDismiss.heroArtworkCueDismissed, true);
  });
});

describe('Home Hero Guided Tour', () => {
  const baseContext: CueEvaluationContext = {
    hasRenderedContent: true,
    isFirstWeek: false,
    hasBlockingHomeSurface: false,
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('12. is eligible on the very first render, unlike the artwork cue which waits for 3 sessions', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_1' };
    const state = await getHomeDiscoveryState(identity);
    assert.equal(state.sessionCount, 0);
    assert.equal(isGuidedTourEligible(state, baseContext), true);
  });

  it('13. advances one step at a time and finishes automatically after the last step', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_2' };
    let state = await getHomeDiscoveryState(identity);
    for (let i = 0; i < GUIDED_TOUR_STEP_COUNT - 1; i++) {
      state = await advanceGuidedTour(identity);
      assert.equal(state.guidedTourStep, i + 1);
      assert.equal(state.guidedTourFinished, false, `should not finish before step ${GUIDED_TOUR_STEP_COUNT - 1}`);
      assert.equal(isGuidedTourEligible(state, baseContext), true);
    }
    state = await advanceGuidedTour(identity);
    assert.equal(state.guidedTourStep, GUIDED_TOUR_STEP_COUNT);
    assert.equal(state.guidedTourFinished, true);
    assert.equal(isGuidedTourEligible(state, baseContext), false);
  });

  it('14. skipping via finishGuidedTour ends it immediately regardless of current step', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_3' };
    await advanceGuidedTour(identity);
    const state = await finishGuidedTour(identity);
    assert.equal(state.guidedTourFinished, true);
    assert.equal(isGuidedTourEligible(state, baseContext), false);
  });

  it('15. never re-eligible after finishing, even across a fresh state read', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_4' };
    await finishGuidedTour(identity);
    const reloaded = await getHomeDiscoveryState(identity);
    assert.equal(isGuidedTourEligible(reloaded, baseContext), false);
  });

  it("16. the artwork cue never shows while the tour hasn't finished, even at session 3+", async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_5' };
    await recordHomeFocusSession(identity, true, 'sess_1');
    await recordHomeFocusSession(identity, true, 'sess_2');
    const state = await recordHomeFocusSession(identity, true, 'sess_3');
    assert.equal(state.sessionCount, 3);
    assert.equal(state.guidedTourFinished, false);
    assert.equal(isHeroArtworkCueEligible(state, baseContext), false, 'artwork cue must wait for the tour to finish, not just session count');
  });

  it('17. the artwork cue becomes reachable again once the tour finishes and session count is met', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_6' };
    await recordHomeFocusSession(identity, true, 'sess_1');
    await recordHomeFocusSession(identity, true, 'sess_2');
    await recordHomeFocusSession(identity, true, 'sess_3');
    const state = await finishGuidedTour(identity);
    assert.equal(isHeroArtworkCueEligible(state, baseContext), true);
  });

  it('18. suppressed by the same blockers as the artwork cue (first week, blocking surface, no content)', async () => {
    const identity: AppIdentity = { kind: 'authenticated', userId: 'tour_user_7' };
    const state = await getHomeDiscoveryState(identity);
    assert.equal(isGuidedTourEligible(state, { ...baseContext, isFirstWeek: true }), true, 'unlike the artwork cue, the tour is meant for brand-new first-week users');
    assert.equal(isGuidedTourEligible(state, { ...baseContext, hasBlockingHomeSurface: true }), false);
    assert.equal(isGuidedTourEligible(state, { ...baseContext, hasRenderedContent: false }), false);
  });
});
