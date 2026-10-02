import assert from 'node:assert/strict';
import test from 'node:test';

import { isMoodStatusOwnedBy, shouldShowMoodPulse } from '../lib/moodPulsePolicy';

const today = '2026-10-02';
const freshEmptyStatus = {
  hasLoggedMoodToday: false,
  hasDismissedToday: false,
  spiritualDate: today,
};

test('shows the prompt only for an authoritative fresh spiritual-day status with no mood or dismissal', () => {
  assert.equal(shouldShowMoodPulse(freshEmptyStatus, today, null), true);
});

test('does not prompt after the user has logged a mood, including a quick-pulse save', () => {
  assert.equal(shouldShowMoodPulse({ ...freshEmptyStatus, hasLoggedMoodToday: true }, today, null), false);
});

test('does not prompt after dismissal recorded on the server or locally', () => {
  assert.equal(shouldShowMoodPulse({ ...freshEmptyStatus, hasDismissedToday: true }, today, null), false);
  assert.equal(shouldShowMoodPulse(freshEmptyStatus, today, today), false);
});

test('fails closed for missing or stale server status', () => {
  assert.equal(shouldShowMoodPulse(null, today, null), false);
  assert.equal(shouldShowMoodPulse({ ...freshEmptyStatus, spiritualDate: '2026-10-01' }, today, null), false);
});

test('mood status is visible only to the account that fetched it', () => {
  assert.equal(isMoodStatusOwnedBy('user-a', 'user-a'), true);
  assert.equal(isMoodStatusOwnedBy('user-a', 'user-b'), false);
  assert.equal(isMoodStatusOwnedBy(null, 'user-b'), false);
});
