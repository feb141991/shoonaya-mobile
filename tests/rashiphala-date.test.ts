import assert from 'node:assert/strict';
import test from 'node:test';

import { formatRashiphalaSpiritualDate } from '../lib/rashiphalaDate';

test('formats the backend spiritual date as that exact date in the selected app language', () => {
  assert.equal(formatRashiphalaSpiritualDate('2026-06-15', 'en'), 'Monday, 15 June 2026');
  assert.match(formatRashiphalaSpiritualDate('2026-06-15', 'hi'), /सोमवार|जून/);
  assert.match(formatRashiphalaSpiritualDate('2026-06-15', 'pa'), /ਸੋਮਵਾਰ|ਜੂਨ/);
});

test('preserves malformed or impossible ISO dates for safe diagnosis instead of silently shifting them', () => {
  assert.equal(formatRashiphalaSpiritualDate('not-a-date', 'en'), 'not-a-date');
  assert.equal(formatRashiphalaSpiritualDate('2026-02-31', 'en'), '2026-02-31');
});
