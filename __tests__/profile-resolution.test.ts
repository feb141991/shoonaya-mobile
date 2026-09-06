import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveProfileOutcome } from '../lib/profileResolution';

describe('resolveProfileOutcome -- the exact bug this fixes', () => {
  it('a missing profile (null) resolves to "failed", never "complete"', () => {
    // This is the confirmed bug: a null profile (bootstrap repair also
    // failed) previously satisfied `profile?.onboarding_completed === false`
    // as `false`, which the caller's `!needsOnboarding` branch then treated
    // as "onboarding is done" -- silently admitting an unprovisioned user
    // into Home. It must resolve to a distinct, blocking outcome instead.
    const outcome = resolveProfileOutcome(null);
    assert.equal(outcome.kind, 'failed');
    assert.notEqual(outcome.kind, 'complete');
    assert.notEqual(outcome.kind, 'needs_onboarding');
  });

  it('a confirmed incomplete profile resolves to "needs_onboarding"', () => {
    assert.equal(resolveProfileOutcome({ onboarding_completed: false }).kind, 'needs_onboarding');
  });

  it('a confirmed complete profile resolves to "complete"', () => {
    assert.equal(resolveProfileOutcome({ onboarding_completed: true }).kind, 'complete');
  });

  it('the three outcomes are mutually exclusive for every possible input', () => {
    const inputs: Array<{ onboarding_completed: boolean } | null> = [
      null,
      { onboarding_completed: false },
      { onboarding_completed: true },
    ];
    const kinds = inputs.map((input) => resolveProfileOutcome(input).kind);
    assert.deepEqual(kinds, ['failed', 'needs_onboarding', 'complete']);
    assert.equal(new Set(kinds).size, 3, 'each input must map to a distinct outcome');
  });
});
