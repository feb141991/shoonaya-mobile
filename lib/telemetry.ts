/**
 * Local-first, privacy-safe performance telemetry -- route-open timing,
 * cache hit/miss, refresh failures, and mutation retry outcomes for the
 * caches built this session (Home, Mandali, Settings, Notifications).
 *
 * Deliberately NOT routed through lib/analytics.ts: that facade is the
 * consent-gated *product/marketing* analytics pipeline (app_opened,
 * onboarding_completed, ...), currently a no-op stub pending a consented
 * provider. This is a different category -- internal engineering
 * observability, not a tracking channel. It exists specifically to answer
 * the "do route timings actually show a need for a content cache" question
 * the Bhakti/Dharm Veer/Pathshala caching phase is gated on, and (as of
 * 2026-09-20) to give Phase 0 of docs/STARTUP_PERFORMANCE_IMPLEMENTATION_PLAN.md
 * real-device measurements without reading them off one physical device.
 *
 * Privacy classification: every event records only a route identifier
 * (an internal screen name, e.g. "mandali", never a URL with query
 * params or an id), a boolean/duration/outcome, and a timestamp -- never
 * user content, free text, or anything else that could identify what the
 * user was looking at beyond "they opened the Mandali screen". Still
 * identity-scoped and purged on sign-out/account-switch like every other
 * cache this session, on the same account-hygiene principle, not because
 * the content itself is sensitive.
 *
 * Transmission (as of 2026-09-20, explicit product decision -- this is a
 * change from this module's original local-only design): the aggregated
 * summary this file computes (never raw events, never anything beyond the
 * shapes above) is uploaded to the backend, throttled to roughly once per
 * hour per install. This file stays free of react-native/network imports
 * on purpose -- it is covered by __tests__/telemetry.test.ts under this
 * project's plain `tsx --test` runner, which has no React Native transform,
 * so anything that pulls in `react-native` (even transitively, e.g. via
 * lib/api.ts) breaks that test file's ability to import this module at
 * all. The actual upload trigger lives in lib/telemetryUpload.ts, which
 * imports getTelemetrySummary from here and is triggered from
 * app/_layout.tsx on backgrounding. See src/lib/native-telemetry-contract.ts
 * and src/app/api/native/telemetry-summary/route.ts (backend repo) for the
 * receiving contract, and /admin's "Native Startup Performance" monitoring
 * tab for the viewer. Authenticated uploads carry the user's id (the same
 * per-user partition this module already used locally); guest uploads
 * carry no identifier at all.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Stage 0 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md 10-stage reliability
// plan): bumped 1 -> 2 to add refresh-failure classification, duplicate-request
// detection, named interaction timings and full-screen-loader exposure --
// purely additive event shapes (see below), but the version bump means any
// telemetry recorded under schema 1 is discarded on next read rather than
// misread under the new shape (readEnvelope already treats a schemaVersion
// mismatch as "start fresh"). This is a clean baseline reset, not a bug.
//
// Reliability plan item 8 (release measurement): bumped 2 -> 3 to add
// first_useful_frame -- cold-start-to-interactive timing was already being
// computed in app/_layout.tsx (the `shoonaya:startup:last-receipt` local
// diagnostic write) but was never fed into this module's aggregation/
// upload pipeline, so it never reached the same admin percentile dashboard
// every other route-level metric does. Same additive-shape, clean-reset
// version bump as before.
export const TELEMETRY_SCHEMA_VERSION = 3;
const MAX_EVENTS = 500;

export type TelemetryIdentity = { kind: 'guest' } | { kind: 'authenticated'; userId: string };

export type RouteName = 'home' | 'mandali' | 'settings' | 'notifications' | 'bhakti' | 'dharm_veer' | 'pathshala' | 'panchang' | 'vrat' | 'japa' | 'profile';
export type OutboxFeature = 'settings' | 'notifications' | 'japa' | 'mandali_posts' | 'mood' | 'sankalpa' | 'reactions';
export type RetryOutcome = 'success' | 'retry' | 'permanent_failure';

// Classifies why a route's refresh failed -- Stage 0 baseline for the 401 /
// timeout / retry / profile-failure rates the reliability plan asks for.
// 'unknown' is the honest default for call sites not yet upgraded to pass a
// real reason, not a guess dressed up as one.
export type FailureReason =
  | 'unauthorized'       // 401
  | 'timeout'
  | 'network'            // fetch itself failed (offline, DNS, connection reset)
  | 'server_error'       // 5xx
  | 'owner_mismatch'      // response identity didn't match the requesting identity
  | 'malformed_response'
  | 'unknown';

// Named client-side interactions worth timing independent of a route's own
// open/refresh cycle -- starts with exactly the one the plan's Stage 3 is
// about (Mandali comment expansion); add more here as later stages need them,
// not preemptively.
export type InteractionName = 'mandali_comment_expand';

// Where a request-dedup opportunity (or, for Mandali comments today, an
// actual un-deduplicated double-fire -- see recordDuplicateRequestDetected's
// doc comment) originated from.
export type RequestSource = 'mount' | 'focus' | 'foreground' | 'reconnect' | 'pull_refresh' | 'retry' | 'state_effect';

export type TelemetryEvent =
  | {
      type: 'route_open';
      route: RouteName;
      cacheHit: boolean;
      // Present only where the caller can actually tell the difference (Home
      // today). Absent (not `false`) means "this call site doesn't yet
      // distinguish fresh from stale" -- never collapsed into a false
      // negative for routes that haven't been upgraded.
      stale?: boolean;
      durationMs: number;
      timestamp: number;
    }
  | {
      type: 'refresh_failure';
      route: RouteName;
      reason?: FailureReason;
      // Whether the screen still had usable (possibly stale) content to show
      // when this failure happened -- the exact distinction between "full-
      // screen error" and "quiet degraded state" the reliability plan is
      // about. Absent means not yet classified by this call site.
      hadCachedData?: boolean;
      timestamp: number;
    }
  | { type: 'mutation_retry_outcome'; feature: OutboxFeature; outcome: RetryOutcome; attempts: number; timestamp: number }
  | { type: 'server_timing'; route: RouteName; breakdown: Record<string, number>; timestamp: number }
  | {
      // A request that a dedup layer correctly collapsed into an existing
      // in-flight call (good), OR -- for call sites that don't dedupe yet,
      // like Mandali comment expansion -- a genuine second network call that
      // fired for work already in flight (a real bug this event exists to
      // measure honestly, not label as handled). `avoided: true` only when a
      // dedup mechanism actually caught it before firing.
      type: 'duplicate_request';
      route: RouteName;
      source: RequestSource;
      avoided: boolean;
      timestamp: number;
    }
  | { type: 'interaction_timing'; name: InteractionName; durationMs: number; timestamp: number }
  | {
      // How long a full-screen loader was actually shown, and -- the
      // invariant Stage 7 is built around -- whether usable content already
      // existed when it was shown anyway.
      type: 'loader_shown';
      route: RouteName;
      hadUsableData: boolean;
      durationMs: number;
      timestamp: number;
    }
  | {
      // Cold-start-to-interactive: elapsed time from JS init
      // (startupStartedAtRef in app/_layout.tsx) to the moment
      // resolveStartupSurface reports 'app' -- overlay gone AND the app
      // ready, not just auth resolved. One event per cold start.
      type: 'first_useful_frame';
      elapsedMs: number;
      // Distinguishes readiness reached normally from the 6-second
      // emergency fail-safe forcing it open after a stalled session/
      // profile resolution -- see F01/F02 in app/_layout.tsx.
      viaEmergencyFallback: boolean;
      timestamp: number;
    };

type TelemetryEnvelope = {
  schemaVersion: number;
  identity: TelemetryIdentity;
  events: TelemetryEvent[];
};

function getTelemetryKey(identity: TelemetryIdentity): string {
  return identity.kind === 'guest'
    ? 'shoonaya_telemetry_v1_guest'
    : `shoonaya_telemetry_v1_user_${identity.userId}`;
}

async function readEnvelope(identity: TelemetryIdentity): Promise<TelemetryEnvelope> {
  const key = getTelemetryKey(identity);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { schemaVersion: TELEMETRY_SCHEMA_VERSION, identity, events: [] };
    const parsed = JSON.parse(raw) as Partial<TelemetryEnvelope>;
    if (parsed.schemaVersion !== TELEMETRY_SCHEMA_VERSION || !Array.isArray(parsed.events)) {
      return { schemaVersion: TELEMETRY_SCHEMA_VERSION, identity, events: [] };
    }
    return { schemaVersion: TELEMETRY_SCHEMA_VERSION, identity, events: parsed.events };
  } catch {
    return { schemaVersion: TELEMETRY_SCHEMA_VERSION, identity, events: [] };
  }
}

// recordRouteOpen/recordRefreshFailure/recordMutationRetryOutcome are all
// fire-and-forget void calls, and several fire in quick succession from the
// same screen (e.g. a route-open followed immediately by an outbox
// success). Without serialization, concurrent read-modify-write cycles on
// the same identity's key race: call 2 can read the envelope before call
// 1's write lands, then call 1's write is silently clobbered when call 2
// writes back. One promise chain per identity key forces each append to
// wait for the previous one to finish landing before it reads.
const writeChains = new Map<string, Promise<void>>();

// F08 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md). Original fix
// (2026-09-20) added a single generation check at the START of appendEvent's
// write, before its own `await readEnvelope` -- an external review
// correctly found this insufficient and reproduced it: a clear landing
// AFTER that check has already passed, but WHILE readEnvelope/setItem are
// still in flight, still lands and resurrects data the clear was supposed
// to remove. Checking once before an await does not survive that await.
//
// Real fix (2026-09-21): clears now route through the SAME per-identity
// writeChains queue appends already use, so a clear can never run
// concurrently with an append for the same key -- only strictly before or
// after it in the order each was initiated. The generation counter still
// exists and is still checked (now at two points: once before the read,
// once again right after it resolves, immediately before the write) so an
// append already mid-flight when a clear is queued behind it correctly
// no-ops instead of writing after the clear catches up. One global counter
// (not per-identity) is still deliberately simple: an unrelated identity's
// in-flight write being skipped by someone else's clear costs one rolling,
// low-value telemetry event, not correctness -- this is "a lightweight
// local signal, not a durable audit log" per the comment below, not worth a
// per-key generation map to save that one event.
let clearGeneration = 0;

async function appendEvent(identity: TelemetryIdentity, event: TelemetryEvent): Promise<void> {
  const key = getTelemetryKey(identity);
  const generationAtStart = clearGeneration;
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => {}) // a prior failure must not permanently wedge this identity's chain
    .then(async () => {
      if (clearGeneration !== generationAtStart) return;
      const envelope = await readEnvelope(identity);
      // Re-checked here, not just before the read above -- the read itself
      // is the async gap a clear queued behind this write (see
      // clearKeyChained) needs to have actually run within before this
      // check, since clears now share this same per-key chain.
      if (clearGeneration !== generationAtStart) return;
      // Rolling window -- this is a lightweight local signal, not a durable
      // audit log; capping keeps it from growing unbounded across a long
      // install lifetime.
      const events = [...envelope.events, event].slice(-MAX_EVENTS);
      await AsyncStorage.setItem(key, JSON.stringify({ ...envelope, events }));
    });
  writeChains.set(key, next);
  try {
    await next;
  } catch (error) {
    console.warn('[Telemetry] record failed', error);
  }
}

// Routes a clear through the same per-key chain appendEvent uses, so a
// clear can never interleave with an in-flight append for that key -- it
// either runs strictly before whatever is already queued (nothing to race)
// or strictly after (appendEvent's own generation re-check, above, makes
// anything already queued ahead of it a no-op once its turn comes).
async function clearKeyChained(key: string): Promise<void> {
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    await AsyncStorage.removeItem(key);
  });
  writeChains.set(key, next);
  await next;
}

export function recordRouteOpen(
  identity: TelemetryIdentity,
  route: RouteName,
  data: { cacheHit: boolean; stale?: boolean; durationMs: number }
): void {
  void appendEvent(identity, {
    type: 'route_open',
    route,
    cacheHit: data.cacheHit,
    ...(data.stale !== undefined ? { stale: data.stale } : {}),
    durationMs: data.durationMs,
    timestamp: Date.now(),
  });
}

export function recordRefreshFailure(
  identity: TelemetryIdentity,
  route: RouteName,
  data?: { reason?: FailureReason; hadCachedData?: boolean }
): void {
  void appendEvent(identity, {
    type: 'refresh_failure',
    route,
    ...(data?.reason !== undefined ? { reason: data.reason } : {}),
    ...(data?.hadCachedData !== undefined ? { hadCachedData: data.hadCachedData } : {}),
    timestamp: Date.now(),
  });
}

/**
 * Records a request that a dedup layer correctly collapsed into an
 * already-in-flight call for the same resource -- `avoided: true`. Call
 * this from the branch that REUSES an existing in-flight promise instead of
 * starting a new fetch (e.g. lib/homeCoordinator.ts's `inFlightRequests`
 * reuse path).
 */
export function recordDuplicateRequestAvoided(identity: TelemetryIdentity, route: RouteName, source: RequestSource): void {
  void appendEvent(identity, { type: 'duplicate_request', route, source, avoided: true, timestamp: Date.now() });
}

/**
 * Records a request that duplicated an already-in-flight one and was NOT
 * caught by any dedup layer -- because, at call sites like Mandali comment
 * expansion, none exists yet. `avoided: false`. This is what gives Stage 3
 * (and any other future dedup fix) a real "how often does this actually
 * happen today" baseline instead of an assumption.
 */
export function recordDuplicateRequestDetected(identity: TelemetryIdentity, route: RouteName, source: RequestSource): void {
  void appendEvent(identity, { type: 'duplicate_request', route, source, avoided: false, timestamp: Date.now() });
}

export function recordInteractionTiming(identity: TelemetryIdentity, name: InteractionName, durationMs: number): void {
  void appendEvent(identity, { type: 'interaction_timing', name, durationMs, timestamp: Date.now() });
}

export function recordLoaderShown(identity: TelemetryIdentity, route: RouteName, data: { hadUsableData: boolean; durationMs: number }): void {
  void appendEvent(identity, { type: 'loader_shown', route, hadUsableData: data.hadUsableData, durationMs: data.durationMs, timestamp: Date.now() });
}

export function recordFirstUsefulFrame(identity: TelemetryIdentity, data: { elapsedMs: number; viaEmergencyFallback: boolean }): void {
  void appendEvent(identity, {
    type: 'first_useful_frame',
    elapsedMs: data.elapsedMs,
    viaEmergencyFallback: data.viaEmergencyFallback,
    timestamp: Date.now(),
  });
}

export function recordMutationRetryOutcome(
  identity: TelemetryIdentity,
  feature: OutboxFeature,
  outcome: RetryOutcome,
  attempts: number
): void {
  void appendEvent(identity, { type: 'mutation_retry_outcome', feature, outcome, attempts, timestamp: Date.now() });
}

export function recordServerTiming(
  identity: TelemetryIdentity,
  route: RouteName,
  breakdown: Record<string, number>
): void {
  void appendEvent(identity, { type: 'server_timing', route, breakdown, timestamp: Date.now() });
}

// Standard Server-Timing header format: "name;dur=12.34;desc=\"Label\", ...".
// Parses the backend's ServerTimingCollector output (home-summary/route.ts)
// into a flat { sectionName: durationMs } map. Returns null for a missing
// or unparseable header rather than throwing -- this is a measurement aid,
// never allowed to affect whether the caller's real response is usable.
export function parseServerTimingHeader(headerValue: string | null | undefined): Record<string, number> | null {
  if (!headerValue) return null;
  const breakdown: Record<string, number> = {};
  for (const part of headerValue.split(',')) {
    const [rawName, ...params] = part.split(';').map((s) => s.trim());
    if (!rawName) continue;
    const durParam = params.find((p) => p.toLowerCase().startsWith('dur='));
    if (!durParam) continue;
    const dur = Number(durParam.slice(durParam.indexOf('=') + 1));
    if (Number.isFinite(dur)) breakdown[rawName] = dur;
  }
  return Object.keys(breakdown).length > 0 ? breakdown : null;
}

export type RouteSummary = {
  route: RouteName;
  opens: number;
  cacheHitRate: number;
  // Of the cache hits counted above, how many were explicitly marked stale
  // by a call site that distinguishes fresh from stale (see route_open's
  // `stale` field). 0 for routes that haven't been upgraded to report it --
  // read staleOpens against staleReportingOpens, not against `opens`, to
  // avoid reading "0 stale" as "never stale" for an unupgraded route.
  staleOpens: number;
  staleReportingOpens: number;
  avgDurationMs: number;
  p95DurationMs: number;
  refreshFailures: number;
  // Failures broken down by classified reason -- only call sites that pass
  // `reason` to recordRefreshFailure contribute anything beyond 'unknown'.
  failureReasons: Partial<Record<FailureReason, number>>;
  // Of refreshFailures above, how many happened while the screen still had
  // usable (possibly stale) content to show -- the full-screen-error-vs-
  // quiet-degraded-state distinction the reliability plan is about.
  failuresWithCachedData: number;
};

export type OutboxSummary = {
  feature: OutboxFeature;
  success: number;
  retry: number;
  permanentFailure: number;
};

export type ServerTimingSummary = {
  route: RouteName;
  samples: number;
  sections: Array<{ name: string; avgDurationMs: number; p95DurationMs: number }>;
};

export type DuplicateRequestSummary = {
  route: RouteName;
  avoided: number; // a dedup layer caught it before firing a second network call
  detected: number; // a second network call actually fired -- a real bug, not yet fixed
};

export type InteractionTimingSummary = {
  name: InteractionName;
  samples: number;
  avgDurationMs: number;
  p95DurationMs: number;
};

export type LoaderExposureSummary = {
  route: RouteName;
  shown: number;
  // Per the Stage 7 invariant: a full-screen loader must never hide content
  // that's already usable. This should be 0 for a correctly-behaving route;
  // any non-zero count here is a direct, measured violation of that rule.
  shownWithUsableData: number;
  avgDurationMs: number;
  p95DurationMs: number;
};

export type FirstUsefulFrameSummary = {
  samples: number;
  avgMs: number;
  p50Ms: number;
  p75Ms: number;
  p95Ms: number;
  emergencyFallbackCount: number;
};

export type TelemetrySummary = {
  routes: RouteSummary[];
  outbox: OutboxSummary[];
  serverTimings: ServerTimingSummary[];
  duplicateRequests: DuplicateRequestSummary[];
  interactionTimings: InteractionTimingSummary[];
  loaderExposure: LoaderExposureSummary[];
  firstUsefulFrame: FirstUsefulFrameSummary | null;
  totalEvents: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

/**
 * Aggregates recorded events into per-route and per-feature summaries --
 * this is what actually answers "do route timings show a need for a
 * content cache" for the Bhakti/Dharm Veer/Pathshala phase, instead of
 * guessing from the architecture diagram alone.
 */
export async function getTelemetrySummary(identity: TelemetryIdentity): Promise<TelemetrySummary> {
  const envelope = await readEnvelope(identity);

  const routeGroups = new Map<RouteName, {
    durations: number[]; hits: number; opens: number; failures: number;
    staleOpens: number; staleReportingOpens: number;
    failureReasons: Partial<Record<FailureReason, number>>; failuresWithCachedData: number;
  }>();
  const outboxGroups = new Map<OutboxFeature, OutboxSummary>();
  const serverTimingGroups = new Map<RouteName, { samples: number; sections: Map<string, number[]> }>();
  const duplicateGroups = new Map<RouteName, { avoided: number; detected: number }>();
  const interactionGroups = new Map<InteractionName, number[]>();
  const loaderGroups = new Map<RouteName, { durations: number[]; shownWithUsableData: number }>();
  const firstUsefulFrame: { durations: number[]; emergencyFallbackCount: number } = { durations: [], emergencyFallbackCount: 0 };

  const routeGroup = (route: RouteName) =>
    routeGroups.get(route) ?? { durations: [], hits: 0, opens: 0, failures: 0, staleOpens: 0, staleReportingOpens: 0, failureReasons: {}, failuresWithCachedData: 0 };

  for (const event of envelope.events) {
    if (event.type === 'route_open') {
      const group = routeGroup(event.route);
      group.durations.push(event.durationMs);
      group.opens += 1;
      if (event.cacheHit) group.hits += 1;
      if (event.stale !== undefined) {
        group.staleReportingOpens += 1;
        if (event.stale) group.staleOpens += 1;
      }
      routeGroups.set(event.route, group);
    } else if (event.type === 'refresh_failure') {
      const group = routeGroup(event.route);
      group.failures += 1;
      const reason = event.reason ?? 'unknown';
      group.failureReasons[reason] = (group.failureReasons[reason] ?? 0) + 1;
      if (event.hadCachedData) group.failuresWithCachedData += 1;
      routeGroups.set(event.route, group);
    } else if (event.type === 'server_timing') {
      const group = serverTimingGroups.get(event.route) ?? { samples: 0, sections: new Map() };
      group.samples += 1;
      for (const [name, dur] of Object.entries(event.breakdown)) {
        const durations = group.sections.get(name) ?? [];
        durations.push(dur);
        group.sections.set(name, durations);
      }
      serverTimingGroups.set(event.route, group);
    } else if (event.type === 'mutation_retry_outcome') {
      const group = outboxGroups.get(event.feature) ?? { feature: event.feature, success: 0, retry: 0, permanentFailure: 0 };
      if (event.outcome === 'success') group.success += 1;
      else if (event.outcome === 'retry') group.retry += 1;
      else group.permanentFailure += 1;
      outboxGroups.set(event.feature, group);
    } else if (event.type === 'duplicate_request') {
      const group = duplicateGroups.get(event.route) ?? { avoided: 0, detected: 0 };
      if (event.avoided) group.avoided += 1;
      else group.detected += 1;
      duplicateGroups.set(event.route, group);
    } else if (event.type === 'interaction_timing') {
      const durations = interactionGroups.get(event.name) ?? [];
      durations.push(event.durationMs);
      interactionGroups.set(event.name, durations);
    } else if (event.type === 'loader_shown') {
      const group = loaderGroups.get(event.route) ?? { durations: [], shownWithUsableData: 0 };
      group.durations.push(event.durationMs);
      if (event.hadUsableData) group.shownWithUsableData += 1;
      loaderGroups.set(event.route, group);
    } else if (event.type === 'first_useful_frame') {
      firstUsefulFrame.durations.push(event.elapsedMs);
      if (event.viaEmergencyFallback) firstUsefulFrame.emergencyFallbackCount += 1;
    }
  }

  const routes: RouteSummary[] = Array.from(routeGroups.entries()).map(([route, group]) => {
    const sorted = [...group.durations].sort((a, b) => a - b);
    return {
      route,
      opens: group.opens,
      cacheHitRate: group.opens > 0 ? group.hits / group.opens : 0,
      staleOpens: group.staleOpens,
      staleReportingOpens: group.staleReportingOpens,
      avgDurationMs: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p95DurationMs: percentile(sorted, 95),
      refreshFailures: group.failures,
      failureReasons: group.failureReasons,
      failuresWithCachedData: group.failuresWithCachedData,
    };
  });

  const serverTimings: ServerTimingSummary[] = Array.from(serverTimingGroups.entries()).map(([route, group]) => ({
    route,
    samples: group.samples,
    sections: Array.from(group.sections.entries()).map(([name, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b);
      return {
        name,
        avgDurationMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        p95DurationMs: percentile(sorted, 95),
      };
    }),
  }));

  const duplicateRequests: DuplicateRequestSummary[] = Array.from(duplicateGroups.entries()).map(([route, group]) => ({
    route,
    avoided: group.avoided,
    detected: group.detected,
  }));

  const interactionTimings: InteractionTimingSummary[] = Array.from(interactionGroups.entries()).map(([name, durations]) => {
    const sorted = [...durations].sort((a, b) => a - b);
    return {
      name,
      samples: sorted.length,
      avgDurationMs: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p95DurationMs: percentile(sorted, 95),
    };
  });

  const loaderExposure: LoaderExposureSummary[] = Array.from(loaderGroups.entries()).map(([route, group]) => {
    const sorted = [...group.durations].sort((a, b) => a - b);
    return {
      route,
      shown: sorted.length,
      shownWithUsableData: group.shownWithUsableData,
      avgDurationMs: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p95DurationMs: percentile(sorted, 95),
    };
  });

  const firstUsefulFrameSorted = [...firstUsefulFrame.durations].sort((a, b) => a - b);
  const firstUsefulFrameSummary: FirstUsefulFrameSummary | null =
    firstUsefulFrameSorted.length > 0
      ? {
          samples: firstUsefulFrameSorted.length,
          avgMs: firstUsefulFrameSorted.reduce((a, b) => a + b, 0) / firstUsefulFrameSorted.length,
          p50Ms: percentile(firstUsefulFrameSorted, 50),
          p75Ms: percentile(firstUsefulFrameSorted, 75),
          p95Ms: percentile(firstUsefulFrameSorted, 95),
          emergencyFallbackCount: firstUsefulFrame.emergencyFallbackCount,
        }
      : null;

  return {
    routes,
    outbox: Array.from(outboxGroups.values()),
    serverTimings,
    duplicateRequests,
    interactionTimings,
    loaderExposure,
    firstUsefulFrame: firstUsefulFrameSummary,
    totalEvents: envelope.events.length,
  };
}

export async function clearTelemetry(identity: TelemetryIdentity): Promise<void> {
  clearGeneration += 1;
  const key = getTelemetryKey(identity);
  try {
    await clearKeyChained(key);
  } catch (error) {
    console.warn('[Telemetry] clear failed', error);
  }
}

export async function clearAllTelemetry(): Promise<void> {
  clearGeneration += 1;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const telemetryKeys = keys.filter((k) => k === 'shoonaya_telemetry_v1_guest' || k.startsWith('shoonaya_telemetry_v1_user_'));
    // Union with writeChains' own keyset: an identity with a pending
    // append that has never yet persisted to AsyncStorage would not show
    // up in getAllKeys() at all, but still needs its chain cleared so that
    // pending append's generation re-check (above) actually fires against
    // the bumped generation instead of racing an untracked key.
    const keysToChain = new Set<string>([...telemetryKeys, ...writeChains.keys()]);
    if (keysToChain.size > 0) {
      await Promise.all(Array.from(keysToChain).map((k) => clearKeyChained(k)));
    }
  } catch (error) {
    console.warn('[Telemetry] clearAll failed', error);
  }
}
