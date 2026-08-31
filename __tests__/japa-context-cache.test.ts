import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeJapaContext } from '@/lib/japaContextCache';

describe('Japa context cache contract', () => {
  const valid = {
    tradition: 'hindu', timezone: 'Europe/London', activeSymbolId: null,
    spiritualDate: '2026-08-31', japaDone: false, streak: 3,
    lifetime: { totalBeads: 324, totalRounds: 3, lastPracticed: null },
  };

  it('accepts the authoritative context shape', () => {
    assert.deepEqual(normalizeJapaContext(valid), valid);
  });

  it('fails closed on incomplete lifetime data', () => {
    assert.equal(normalizeJapaContext({ ...valid, lifetime: { totalBeads: 1 } }), null);
  });
});
