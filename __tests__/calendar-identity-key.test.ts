import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildCalendarIdentityKey, type CalendarIdentityInputs } from '../lib/calendarIdentityKey';

const base: CalendarIdentityInputs = {
  accountKey: 'user-A',
  tradition: 'hindu',
  calendarProfile: 'legacy-ujjain',
  sampradaya: null,
  latitude: 23.1765,
  longitude: 75.7885,
  timezone: 'Asia/Kolkata',
  spiritualDateIso: '2026-09-06',
};

describe('buildCalendarIdentityKey', () => {
  it('is stable for identical inputs', () => {
    assert.equal(buildCalendarIdentityKey(base), buildCalendarIdentityKey({ ...base }));
  });

  it('changes when the account changes, even with everything else identical (the audit-flagged regression)', () => {
    // This is the exact scenario the reliability audit named: two accounts
    // sharing the same tradition/location/timezone/date must NOT collapse
    // to the same key, or a stale retry from the old account's session
    // would never be cancelled across the switch and could merge a late
    // response into the new account's state.
    const userA = buildCalendarIdentityKey({ ...base, accountKey: 'user-A' });
    const userB = buildCalendarIdentityKey({ ...base, accountKey: 'user-B' });
    assert.notEqual(userA, userB);
  });

  it('changes when calendarProfile changes even though tradition stays the same', () => {
    const a = buildCalendarIdentityKey({ ...base, calendarProfile: 'legacy-ujjain' });
    const b = buildCalendarIdentityKey({ ...base, calendarProfile: 'iskcon' });
    assert.notEqual(a, b);
  });

  it('changes when sampradaya changes even though tradition and calendarProfile stay the same', () => {
    const a = buildCalendarIdentityKey({ ...base, sampradaya: null });
    const b = buildCalendarIdentityKey({ ...base, sampradaya: 'gaudiya' });
    assert.notEqual(a, b);
  });

  it('treats a missing calendarProfile/sampradaya (old cached payload) as distinct from an explicit empty one only where that matters -- both normalize to the empty-string segment', () => {
    const withUndefined = buildCalendarIdentityKey({ ...base, calendarProfile: undefined, sampradaya: undefined });
    const withNull = buildCalendarIdentityKey({ ...base, calendarProfile: null, sampradaya: null });
    assert.equal(withUndefined, withNull, 'undefined and null must normalize identically so an old cached payload does not spuriously differ from a fresh one with explicit nulls');
  });

  it('changes on a location or timezone change', () => {
    const original = buildCalendarIdentityKey(base);
    assert.notEqual(buildCalendarIdentityKey({ ...base, latitude: 51.5074, longitude: -0.1278 }), original);
    assert.notEqual(buildCalendarIdentityKey({ ...base, timezone: 'Europe/London' }), original);
  });

  it('changes on a spiritual-date rollover', () => {
    const original = buildCalendarIdentityKey(base);
    assert.notEqual(buildCalendarIdentityKey({ ...base, spiritualDateIso: '2026-09-07' }), original);
  });

  it('guest and unauthenticated account keys are distinguished from any real userId', () => {
    const guest = buildCalendarIdentityKey({ ...base, accountKey: 'guest' });
    const unauthenticated = buildCalendarIdentityKey({ ...base, accountKey: 'unauthenticated' });
    const realUser = buildCalendarIdentityKey({ ...base, accountKey: 'user-A' });
    assert.notEqual(guest, unauthenticated);
    assert.notEqual(guest, realUser);
    assert.notEqual(unauthenticated, realUser);
  });
});
