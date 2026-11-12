import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_LIFETIME, parseGuestLifetime } from '../lib/japaGuestLifetime';

test('nothing stored is empty and not saved', () => {
  assert.deepEqual(parseGuestLifetime(null), { lifetime: EMPTY_LIFETIME, saved: false });
  assert.deepEqual(parseGuestLifetime(''), { lifetime: EMPTY_LIFETIME, saved: false });
});

test('a stored total is read back as saved', () => {
  const stored = { totalBeads: 216, totalRounds: 2, lastPracticed: '2026-11-12T10:00:00.000Z' };
  assert.deepEqual(parseGuestLifetime(JSON.stringify(stored)), { lifetime: stored, saved: true });
});

test('unreadable or odd stored text falls back to empty but still counts as saved', () => {
  for (const raw of ['not json', '{', 'null', '5', '[]', '"text"', ' ']) {
    const result = parseGuestLifetime(raw);
    assert.deepEqual(result.lifetime, EMPTY_LIFETIME, raw);
    assert.equal(result.saved, true, raw);
  }
});

test('fields of the wrong type are ignored one by one', () => {
  const result = parseGuestLifetime(JSON.stringify({ totalBeads: '108', totalRounds: 3, lastPracticed: 7 }));
  assert.deepEqual(result.lifetime, { totalBeads: 0, totalRounds: 3, lastPracticed: null });
});
