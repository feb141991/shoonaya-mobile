import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  recordRouteOpen,
  recordRefreshFailure,
  recordMutationRetryOutcome,
  recordServerTiming,
  parseServerTimingHeader,
  getTelemetrySummary,
  clearTelemetry,
  clearAllTelemetry,
  type TelemetryIdentity,
} from '../lib/telemetry';

// recordRouteOpen etc. are fire-and-forget (void appendEvent(...)) -- tests
// await a microtask flush so the AsyncStorage write has landed before
// reading it back.
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Telemetry -- identity isolation', () => {
  beforeEach(async () => {
    await clearAllTelemetry();
  });

  it('one user\'s recorded events are never visible to another user\'s summary', async () => {
    const userA: TelemetryIdentity = { kind: 'authenticated', userId: 'user-A' };
    const userB: TelemetryIdentity = { kind: 'authenticated', userId: 'user-B' };

    recordRouteOpen(userA, 'home', { cacheHit: true, durationMs: 100 });
    await flush();

    const summaryB = await getTelemetrySummary(userB);
    assert.equal(summaryB.totalEvents, 0, 'User B must see zero events from User A');

    const summaryA = await getTelemetrySummary(userA);
    assert.equal(summaryA.totalEvents, 1);
  });

  it('guest and authenticated telemetry are isolated', async () => {
    recordRouteOpen({ kind: 'guest' }, 'home', { cacheHit: false, durationMs: 50 });
    await flush();

    const guestSummary = await getTelemetrySummary({ kind: 'guest' });
    const userSummary = await getTelemetrySummary({ kind: 'authenticated', userId: 'user-C' });
    assert.equal(guestSummary.totalEvents, 1);
    assert.equal(userSummary.totalEvents, 0);
  });

  it('clearTelemetry removes one identity without touching another', async () => {
    const userD: TelemetryIdentity = { kind: 'authenticated', userId: 'user-D' };
    const userE: TelemetryIdentity = { kind: 'authenticated', userId: 'user-E' };
    recordRouteOpen(userD, 'home', { cacheHit: true, durationMs: 10 });
    recordRouteOpen(userE, 'home', { cacheHit: true, durationMs: 10 });
    await flush();

    await clearTelemetry(userD);

    assert.equal((await getTelemetrySummary(userD)).totalEvents, 0);
    assert.equal((await getTelemetrySummary(userE)).totalEvents, 1);
  });

  it('clearAllTelemetry (logout purge) wipes every identity', async () => {
    recordRouteOpen({ kind: 'guest' }, 'home', { cacheHit: true, durationMs: 10 });
    recordRouteOpen({ kind: 'authenticated', userId: 'user-F' }, 'home', { cacheHit: true, durationMs: 10 });
    await flush();

    await clearAllTelemetry();

    assert.equal((await getTelemetrySummary({ kind: 'guest' })).totalEvents, 0);
    assert.equal((await getTelemetrySummary({ kind: 'authenticated', userId: 'user-F' })).totalEvents, 0);
  });

  it('fails safe on a corrupt telemetry entry instead of throwing', async () => {
    await AsyncStorage.setItem('shoonaya_telemetry_v1_user_user-G', 'not json{{{');
    const summary = await getTelemetrySummary({ kind: 'authenticated', userId: 'user-G' });
    assert.equal(summary.totalEvents, 0);
  });

  it('fails safe on a stale schema version', async () => {
    await AsyncStorage.setItem(
      'shoonaya_telemetry_v1_user_user-H',
      JSON.stringify({ schemaVersion: 99, identity: { kind: 'authenticated', userId: 'user-H' }, events: [{ type: 'route_open' }] })
    );
    const summary = await getTelemetrySummary({ kind: 'authenticated', userId: 'user-H' });
    assert.equal(summary.totalEvents, 0);
  });
});

describe('Telemetry -- aggregation correctness', () => {
  beforeEach(async () => {
    await clearAllTelemetry();
  });

  it('computes cache hit rate, average and p95 duration per route', async () => {
    const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-I' };
    recordRouteOpen(identity, 'mandali', { cacheHit: true, durationMs: 100 });
    recordRouteOpen(identity, 'mandali', { cacheHit: true, durationMs: 200 });
    recordRouteOpen(identity, 'mandali', { cacheHit: false, durationMs: 900 });
    await flush();

    const summary = await getTelemetrySummary(identity);
    const mandali = summary.routes.find((r) => r.route === 'mandali');
    assert.ok(mandali);
    assert.equal(mandali!.opens, 3);
    assert.equal(mandali!.cacheHitRate, 2 / 3);
    assert.equal(mandali!.avgDurationMs, (100 + 200 + 900) / 3);
    assert.equal(mandali!.p95DurationMs, 900, 'The slowest open should dominate p95 with only 3 samples');
  });

  it('tracks refresh failures per route independently of route opens', async () => {
    const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-J' };
    recordRouteOpen(identity, 'settings', { cacheHit: false, durationMs: 50 });
    recordRefreshFailure(identity, 'settings');
    recordRefreshFailure(identity, 'settings');
    await flush();

    const summary = await getTelemetrySummary(identity);
    const settings = summary.routes.find((r) => r.route === 'settings');
    assert.equal(settings?.opens, 1);
    assert.equal(settings?.refreshFailures, 2);
  });

  it('groups mutation retry outcomes by feature', async () => {
    const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-K' };
    recordMutationRetryOutcome(identity, 'settings', 'success', 0);
    recordMutationRetryOutcome(identity, 'settings', 'retry', 1);
    recordMutationRetryOutcome(identity, 'notifications', 'permanent_failure', 4);
    await flush();

    const summary = await getTelemetrySummary(identity);
    const settingsOutbox = summary.outbox.find((o) => o.feature === 'settings');
    const notifOutbox = summary.outbox.find((o) => o.feature === 'notifications');
    assert.equal(settingsOutbox?.success, 1);
    assert.equal(settingsOutbox?.retry, 1);
    assert.equal(notifOutbox?.permanentFailure, 1);
  });

  it('returns an empty summary for an identity with no recorded events', async () => {
    const summary = await getTelemetrySummary({ kind: 'authenticated', userId: 'user-never-opened-anything' });
    assert.deepEqual(summary.routes, []);
    assert.deepEqual(summary.outbox, []);
    assert.deepEqual(summary.serverTimings, []);
    assert.equal(summary.totalEvents, 0);
  });
});

describe('parseServerTimingHeader -- backend ServerTimingCollector format', () => {
  it('parses the standard "name;dur=X;desc=Y" format into a flat map', () => {
    const header = 'auth;dur=12.34;desc="Authentication", profile;dur=5.6;desc="Profile Fetch (ready)", total;dur=456.78;desc="Total"';
    assert.deepEqual(parseServerTimingHeader(header), { auth: 12.34, profile: 5.6, total: 456.78 });
  });

  it('parses a section with no desc param', () => {
    assert.deepEqual(parseServerTimingHeader('compose;dur=3.2'), { compose: 3.2 });
  });

  it('returns null for a missing header', () => {
    assert.equal(parseServerTimingHeader(null), null);
    assert.equal(parseServerTimingHeader(undefined), null);
    assert.equal(parseServerTimingHeader(''), null);
  });

  it('returns null rather than throwing on an unparseable header', () => {
    assert.equal(parseServerTimingHeader('not a server-timing header at all'), null);
  });

  it('skips malformed segments but keeps the parseable ones', () => {
    assert.deepEqual(parseServerTimingHeader('auth;dur=10, garbage, calendar_batches;dur=750'), {
      auth: 10,
      calendar_batches: 750,
    });
  });
});

describe('Telemetry -- server timing capture and aggregation', () => {
  beforeEach(async () => {
    await clearAllTelemetry();
  });

  it('records a server-timing breakdown and surfaces per-section avg/p95 in the summary', async () => {
    const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-L' };
    recordServerTiming(identity, 'home', { auth: 10, calendar_batches: 100, total: 200 });
    recordServerTiming(identity, 'home', { auth: 12, calendar_batches: 900, total: 1000 });
    await flush();

    const summary = await getTelemetrySummary(identity);
    const homeTiming = summary.serverTimings.find((s) => s.route === 'home');
    assert.ok(homeTiming);
    assert.equal(homeTiming!.samples, 2);

    const calendarBatches = homeTiming!.sections.find((s) => s.name === 'calendar_batches');
    assert.ok(calendarBatches);
    assert.equal(calendarBatches!.avgDurationMs, (100 + 900) / 2);
    assert.equal(calendarBatches!.p95DurationMs, 900);
  });

  it('keeps server-timing samples isolated per identity, same as route-open events', async () => {
    recordServerTiming({ kind: 'authenticated', userId: 'user-M' }, 'home', { auth: 10 });
    await flush();

    const otherUserSummary = await getTelemetrySummary({ kind: 'authenticated', userId: 'user-N' });
    assert.deepEqual(otherUserSummary.serverTimings, []);
  });

  it('does not let a server_timing event corrupt outbox aggregation (event-type discrimination regression)', async () => {
    // Regression: the aggregator used to fall through to an `else` branch
    // that assumed every non-route_open/refresh_failure event was a
    // mutation_retry_outcome. Adding a 4th event type without an explicit
    // branch would have made this read `event.feature`/`event.outcome` off
    // a server_timing event (both undefined) and silently pollute the
    // outbox summary with bogus permanent-failure entries.
    const identity: TelemetryIdentity = { kind: 'authenticated', userId: 'user-O' };
    recordServerTiming(identity, 'home', { auth: 10 });
    recordMutationRetryOutcome(identity, 'settings', 'success', 0);
    await flush();

    const summary = await getTelemetrySummary(identity);
    assert.equal(summary.outbox.length, 1, 'Only the real mutation_retry_outcome event should produce an outbox entry');
    assert.equal(summary.outbox[0].feature, 'settings');
    assert.equal(summary.outbox[0].success, 1);
  });
});
