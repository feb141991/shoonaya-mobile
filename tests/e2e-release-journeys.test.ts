import test from 'node:test';
import assert from 'node:assert/strict';

// Node.js test environment polyfill for AsyncStorage web driver
if (typeof window === 'undefined' || !(window as any).localStorage) {
  const memoryStore = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
      removeItem: (key: string) => memoryStore.delete(key),
      clear: () => memoryStore.clear(),
      get length() {
        return memoryStore.size;
      },
      key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    },
  };
}

import {
  runGuestJourney,
  runAuthenticatedJourney,
  runAccountSwitchingJourney,
  runReleaseJourneys,
  formatReleaseJourneysReport,
} from '../scripts/e2e-release-journeys';

test('E2E Release Journeys Harness', async (t) => {
  await t.test('Journey 1: Guest (Atithi) experience mounts without auth errors', async () => {
    const result = await runGuestJourney();
    assert.equal(result.passed, true);
    assert.equal(result.steps.length, 4);
    assert.ok(result.steps.every((s) => s.passed));
  });

  await t.test('Journey 2: Authenticated user validates profile invariant & repair', async () => {
    const result = await runAuthenticatedJourney();
    assert.equal(result.passed, true);
    assert.equal(result.steps.length, 4);
    assert.ok(result.steps.every((s) => s.passed));
  });

  await t.test('Journey 3: Account switching purges private caches and isolates identity', async () => {
    const result = await runAccountSwitchingJourney();
    assert.equal(result.passed, true);
    assert.equal(result.steps.length, 3);
    assert.ok(result.steps.every((s) => s.passed));
  });

  await t.test('Complete Release Harness aggregates and formats report', async () => {
    const harness = await runReleaseJourneys();
    assert.equal(harness.allPassed, true);
    assert.equal(harness.passedJourneys, 3);
    assert.equal(harness.totalJourneys, 3);

    const markdown = formatReleaseJourneysReport(harness);
    assert.ok(markdown.includes('# End-to-End Release Journeys Verification Report'));
    assert.ok(markdown.includes('✅ ALL RELEASE JOURNEYS VERIFIED'));
  });
});
