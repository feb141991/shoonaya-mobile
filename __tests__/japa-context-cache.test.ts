import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeJapaContext } from '@/lib/japaContextCache';

describe('Japa context cache contract', () => {
  const valid = {
    tradition: 'hindu', timezone: 'Europe/London', activeSymbolId: null,
    spiritualDate: '2026-08-31', japaDone: false, streak: 3, japaReminderEnabled: true,
    lifetime: { totalBeads: 324, totalRounds: 3, lastPracticed: null },
  };

  it('accepts the authoritative context shape', () => {
    assert.deepEqual(normalizeJapaContext(valid), valid);
  });

  it('fails closed on incomplete lifetime data', () => {
    assert.equal(normalizeJapaContext({ ...valid, lifetime: { totalBeads: 1 } }), null);
  });

  it('keeps legacy cached contexts valid but does not guess the reminder preference', () => {
    const { japaReminderEnabled: _ignored, ...legacy } = valid;
    assert.equal(normalizeJapaContext(legacy)?.japaReminderEnabled, null);
  });
});
