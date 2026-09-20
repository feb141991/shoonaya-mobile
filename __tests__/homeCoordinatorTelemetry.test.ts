import assert from 'node:assert/strict';
import { test } from 'node:test';

// Node.js test environment polyfill for AsyncStorage's web driver -- same
// shim __tests__/home-swr-and-sankalpa.test.ts uses, needed before any
// import that transitively touches lib/telemetry.ts's AsyncStorage calls.
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

import { HomeSummaryCoordinator, type HomeLoaderDependencies } from '../lib/homeCoordinator';
import { getTelemetrySummary, clearTelemetry, type TelemetryIdentity } from '../lib/telemetry';

// recordRouteOpen is fire-and-forget (void appendEvent(...)) -- same
// microtask-flush helper __tests__/telemetry.test.ts uses so the
// AsyncStorage write has landed before reading it back.
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

// F05 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): onFocus's
// memory-snapshot fast path (content already valid, not stale -- the
// fastest possible outcome) previously returned without calling
// recordRouteOpen at all, and loadHome's own recordRouteOpen calls are
// gated on !wasAlreadyValid so they never cover this path either. The
// fastest, most successful opens were silently absent from the telemetry
// dataset this session just built upload/admin infrastructure around.

function noopDeps(): HomeLoaderDependencies {
  return {
    fetchApi: async () => { throw new Error('fetchApi should not be called on the fast path'); },
    onApplyPayload: () => {},
    onSetLoading: () => {},
    onSetError: () => {},
    onRedirectToLogin: () => {},
    buildGuestPayload: () => ({}),
  };
}

test('a fresh, already-valid Home focus records a route-open instead of silently returning', async () => {
  const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-f05' };
  await clearTelemetry(identity);

  const coordinator = new HomeSummaryCoordinator(noopDeps());
  coordinator.setHydratedFromSnapshot('authenticated:user-f05', Date.now(), Date.now());

  await coordinator.onFocus({ kind: 'authenticated', userId: 'user-f05' });
  await flush();

  const summary = await getTelemetrySummary(identity);
  const homeRoute = summary.routes.find((r) => r.route === 'home');
  assert.ok(homeRoute, 'the fast-path open must be recorded, not silently dropped');
  assert.equal(homeRoute?.opens, 1);
  assert.equal(homeRoute?.cacheHitRate, 1);
});

test('a stale already-valid Home focus falls through to loadHome instead of the fast path', async () => {
  const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-f05-stale' };
  await clearTelemetry(identity);

  let fetchApiCalled = false;
  const deps = noopDeps();
  deps.fetchApi = async () => { fetchApiCalled = true; return { ok: false, status: 500, headers: new Headers() } as any; };

  const coordinator = new HomeSummaryCoordinator(deps);
  // Hydrated far enough in the past to be stale (> HOME_FOCUS_STALE_MS).
  coordinator.setHydratedFromSnapshot('authenticated:user-f05-stale', Date.now() - 10 * 60 * 1000, Date.now());

  await coordinator.onFocus({ kind: 'authenticated', userId: 'user-f05-stale' });

  assert.equal(fetchApiCalled, true, 'a stale focus must still revalidate, confirming the fast path only fires when genuinely fresh');
});
