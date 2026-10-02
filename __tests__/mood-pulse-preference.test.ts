import assert from 'node:assert/strict';
import test from 'node:test';

if (typeof window === 'undefined' || !window.localStorage) {
  const memoryStore = new Map<string, string>();
  const testGlobal = globalThis as unknown as { window?: { localStorage: Storage } };
  testGlobal.window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() { return memoryStore.size; },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    } as Storage,
  };
}

import { getMoodPulseDismissedDate, getMoodSpiritualDate, setMoodPulseDismissedDate } from '../lib/moodPulsePreference';

test('mood spiritual date changes at 4 a.m. in the requested timezone', () => {
  assert.equal(getMoodSpiritualDate(new Date('2026-10-01T22:29:00.000Z'), 'Asia/Kolkata'), '2026-10-01');
  assert.equal(getMoodSpiritualDate(new Date('2026-10-01T22:30:00.000Z'), 'Asia/Kolkata'), '2026-10-02');
});

test('an invalid timezone falls back to the UTC spiritual day instead of throwing', () => {
  assert.equal(
    getMoodSpiritualDate(new Date('2026-10-02T02:00:00.000Z'), 'Not/A_Timezone'),
    '2026-10-01',
  );
});

test('spiritual date uses local wall time correctly across a DST transition', () => {
  assert.equal(getMoodSpiritualDate(new Date('2026-03-29T02:59:00.000Z'), 'Europe/London'), '2026-03-28');
  assert.equal(getMoodSpiritualDate(new Date('2026-03-29T03:00:00.000Z'), 'Europe/London'), '2026-03-29');
});

test('dismissal storage is isolated per authenticated user', async () => {
  await setMoodPulseDismissedDate('mood-preference-test-A', '2026-10-02');

  assert.equal(await getMoodPulseDismissedDate('mood-preference-test-A'), '2026-10-02');
  assert.equal(await getMoodPulseDismissedDate('mood-preference-test-B'), null);
});
