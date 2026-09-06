import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  LoadGenerationGuard,
  identityChanged,
  shouldRecordRouteOpen,
  type AttributionIdentity,
} from '../lib/routeOpenAttribution';

describe('identityChanged', () => {
  it('is false for the same authenticated user', () => {
    const a: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    const b: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    assert.equal(identityChanged(a, b), false);
  });

  it('is true across an account switch (P1 regression: misattribution after switching accounts)', () => {
    const a: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    const b: AttributionIdentity = { kind: 'authenticated', userId: 'user-B' };
    assert.equal(identityChanged(a, b), true);
  });

  it('is true across a guest -> authenticated transition', () => {
    assert.equal(identityChanged({ kind: 'guest' }, { kind: 'authenticated', userId: 'user-A' }), true);
  });

  it('is false when both sides are guest', () => {
    assert.equal(identityChanged({ kind: 'guest' }, { kind: 'guest' }), false);
  });
});

describe('LoadGenerationGuard', () => {
  it('a single start() token stays current until another start() happens', () => {
    const guard = new LoadGenerationGuard();
    const token = guard.start();
    assert.equal(guard.isCurrent(token), true);
  });

  it('an earlier token is no longer current once a newer load has started (P2 regression: overlapping opens)', () => {
    // Reproduces the Pathshala bug directly: the user leaves and reopens
    // the screen before the first load finishes. Both loads use
    // dataLoadedRef-derived "is this a first open" (still false for both,
    // since neither has completed), but only ONE completion should ever
    // be allowed to record.
    const guard = new LoadGenerationGuard();
    const firstToken = guard.start(); // first focus, load A starts
    const secondToken = guard.start(); // user left and reopened before A finished, load B starts

    assert.equal(guard.isCurrent(firstToken), false, 'The interrupted first load must not be recordable once a newer one has started');
    assert.equal(guard.isCurrent(secondToken), true, 'The newer load is the one that should actually be measured');
  });

  it('three overlapping starts leave only the last one current', () => {
    const guard = new LoadGenerationGuard();
    const tokens = [guard.start(), guard.start(), guard.start()];
    assert.deepEqual(tokens.map((t) => guard.isCurrent(t)), [false, false, true]);
  });
});

describe('shouldRecordRouteOpen -- the combined guard a completion actually runs', () => {
  it('records when nothing changed: same generation, same identity', () => {
    const guard = new LoadGenerationGuard();
    const token = guard.start();
    const identity: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    assert.equal(shouldRecordRouteOpen(guard, token, identity, identity), true);
  });

  it('does not record a superseded (interrupted-then-reopened) load, even with the same identity', () => {
    const guard = new LoadGenerationGuard();
    const staleToken = guard.start();
    guard.start(); // a newer load supersedes it
    const identity: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    assert.equal(shouldRecordRouteOpen(guard, staleToken, identity, identity), false);
  });

  it('does not record when the account changed mid-flight, even on the current generation (P1 regression)', () => {
    const guard = new LoadGenerationGuard();
    const token = guard.start();
    const identityAtStart: AttributionIdentity = { kind: 'authenticated', userId: 'user-A' };
    const identityNow: AttributionIdentity = { kind: 'authenticated', userId: 'user-B' };
    assert.equal(shouldRecordRouteOpen(guard, token, identityAtStart, identityNow), false);
  });

  it('does not record when BOTH the generation is stale AND the identity changed', () => {
    const guard = new LoadGenerationGuard();
    const staleToken = guard.start();
    guard.start();
    assert.equal(
      shouldRecordRouteOpen(guard, staleToken, { kind: 'authenticated', userId: 'user-A' }, { kind: 'authenticated', userId: 'user-B' }),
      false
    );
  });
});
