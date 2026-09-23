import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  clearPanchangScreenSnapshots,
  getPanchangScreenSnapshot,
  writePanchangScreenSnapshot,
} from '../lib/panchangScreenCache';

const profile = {
  lat: 23.1765,
  lon: 75.7885,
  timezone: 'Asia/Kolkata',
  tradition: 'hindu' as const,
  rashi: null,
  city: 'Ujjain',
};

describe('Panchang screen memory cache', () => {
  beforeEach(clearPanchangScreenSnapshots);

  it('returns a same-identity snapshot while isolating other accounts', () => {
    writePanchangScreenSnapshot('user:user-a', profile, [{ slug: 'ekadashi' }], new Date('2026-09-23T12:00:00Z'));
    assert.equal(getPanchangScreenSnapshot('user:user-b', new Date('2026-09-23T12:00:00Z')), null);
    assert.deepEqual(
      getPanchangScreenSnapshot<{ slug: string }, 'hindu'>('user:user-a', new Date('2026-09-23T12:00:00Z'))?.festivals,
      [{ slug: 'ekadashi' }]
    );
  });

  it('invalidates cached calendar content after the profile timezone spiritual-day rollover', () => {
    writePanchangScreenSnapshot('guest', profile, [{ slug: 'ekadashi' }], new Date('2026-09-23T00:00:00Z'));
    assert.equal(getPanchangScreenSnapshot('guest', new Date('2026-09-23T22:29:00Z'))?.festivals.length, 1);
    assert.equal(getPanchangScreenSnapshot('guest', new Date('2026-09-23T22:30:00Z')), null);
  });

  it('clears all in-memory profile-scoped snapshots', () => {
    writePanchangScreenSnapshot('user:user-a', profile, [], new Date('2026-09-23T12:00:00Z'));
    clearPanchangScreenSnapshots();
    assert.equal(getPanchangScreenSnapshot('user:user-a', new Date('2026-09-23T12:00:00Z')), null);
  });
});
