import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeActStepStatuses } from '../lib/firstWeekGuideSequence';

const ACTS = ['sacred_text', 'japa', 'nitya', 'pathshala', 'mandali'];

test('FirstWeekGuide sequential unlock (AGENTS.md: closing a defect — guard for the exact bug class this prevents)', async (t) => {
  await t.test('nothing done — only the first act is current, the rest are locked', () => {
    assert.deepEqual(computeActStepStatuses(ACTS, new Set()), [
      'current', 'locked', 'locked', 'locked', 'locked',
    ]);
  });

  await t.test('in-order partial completion — the next act becomes current', () => {
    assert.deepEqual(computeActStepStatuses(ACTS, new Set(['sacred_text', 'japa'])), [
      'done', 'done', 'current', 'locked', 'locked',
    ]);
  });

  await t.test('all done — every act reports done, nothing current or locked', () => {
    assert.deepEqual(computeActStepStatuses(ACTS, new Set(ACTS)), [
      'done', 'done', 'done', 'done', 'done',
    ]);
  });

  await t.test('out-of-order completion from before this change — the earliest gap unlocks, nothing already done is re-locked', () => {
    // A user on the old flat-list card could tap any row in any order.
    // Here they finished mandali (last) and pathshala (4th) but never
    // touched the first three.
    const legacy = new Set(['mandali', 'pathshala']);
    assert.deepEqual(computeActStepStatuses(ACTS, legacy), [
      'current', 'locked', 'locked', 'done', 'done',
    ]);
  });

  await t.test('out-of-order completion deep in the list still finds the true gap, not just the first id', () => {
    const legacy = new Set(['sacred_text', 'nitya', 'mandali']);
    // nitya (index 2) and mandali (index 4) were done without japa (index 1)
    // or pathshala (index 3) ever being completed.
    assert.deepEqual(computeActStepStatuses(ACTS, legacy), [
      'done', 'current', 'done', 'locked', 'done',
    ]);
  });
});

test('regression: a doneCount-indexed implementation permanently locks an act for exactly this legacy shape (proves the guard above is not vacuous)', () => {
  // This is the bug the real implementation must NOT have: picking
  // "current" by position (how many are done) instead of by scanning for
  // the first incomplete id. Reproduced here, deliberately, to prove the
  // test above would fail against it.
  function buggyComputeActStepStatuses(actIds: readonly string[], completedIds: ReadonlySet<string>) {
    const doneCount = actIds.filter((id) => completedIds.has(id)).length;
    return actIds.map((id, index) => {
      if (completedIds.has(id)) return 'done' as const;
      if (index === doneCount) return 'current' as const;
      return 'locked' as const;
    });
  }

  const legacy = new Set(['mandali']); // only the 5th act done, out of order
  const buggy = buggyComputeActStepStatuses(ACTS, legacy);
  // doneCount = 1, so index 1 (japa) is wrongly marked "current" while
  // sacred_text (index 0, genuinely the first incomplete act) is wrongly
  // "locked" with no row left that will ever unlock it again.
  assert.deepEqual(buggy, ['locked', 'current', 'locked', 'locked', 'done']);
  assert.notEqual(buggy[0], 'current');

  const fixed = computeActStepStatuses(ACTS, legacy);
  assert.equal(fixed[0], 'current');
});
