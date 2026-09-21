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
  profileHomeViewport,
  createMockHomeSummaryPayload,
  formatViewportReport,
} from '../scripts/profile-home-viewport';

test('Home Viewport Profiler -- Architectural Budget Enforcement', async (t) => {
  await t.test('verifies mock home-summary payload conforms to standard keys', () => {
    const payload = createMockHomeSummaryPayload();
    assert.ok(payload.hero);
    assert.ok(Array.isArray(payload.practices));
    assert.equal(payload.practices.length, 5);
    assert.ok(payload.panchang);
    assert.ok(payload.dharmVeer);
    assert.ok(payload.dailySacredText);
  });

  await t.test('executes profiling and enforces <= 1 cold mount request and SWR cache hit', async () => {
    const result = await profileHomeViewport();

    assert.equal(result.coldMountRequests, 1, 'Must strictly make <= 1 network request on cold mount');
    assert.equal(result.coldMountPassed, true);
    assert.equal(result.swrImmediateHit, true);
    assert.equal(result.swrSubsequentRequests, 0, 'Must not refetch when returning within 5min stale window');
    assert.equal(result.overallPassed, true);
    assert.equal(result.sectionsDetected.practices, 5);

    const markdown = formatViewportReport(result);
    assert.ok(markdown.includes('# Home Viewport Profiling Report'));
    assert.ok(markdown.includes('✅ CONFORMANT'));
    assert.ok(markdown.includes('**1** request'));
  });
});
