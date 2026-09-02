/**
 * Local, privacy-safe performance telemetry -- route-open timing, cache
 * hit/miss, refresh failures, and mutation retry outcomes for the caches
 * built this session (Home, Mandali, Settings, Notifications).
 *
 * Deliberately NOT routed through lib/analytics.ts: that facade is the
 * consent-gated *product/marketing* analytics pipeline (app_opened,
 * onboarding_completed, ...), currently a no-op stub pending a consented
 * provider. This is a different category -- internal engineering
 * observability, not a tracking channel -- and stays local-only, never
 * transmitted anywhere. It exists specifically to answer the "do route
 * timings actually show a need for a content cache" question the
 * Bhakti/Dharm Veer/Pathshala caching phase is gated on, rather than
 * guessing.
 *
 * Privacy classification: every event records only a route identifier
 * (an internal screen name, e.g. "mandali", never a URL with query
 * params or an id), a boolean/duration/outcome, and a timestamp -- never
 * user content, free text, or anything else that could identify what the
 * user was looking at beyond "they opened the Mandali screen". Still
 * identity-scoped and purged on sign-out/account-switch like every other
 * cache this session, on the same account-hygiene principle, not because
 * the content itself is sensitive.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TELEMETRY_SCHEMA_VERSION = 1;
const MAX_EVENTS = 500;

export type TelemetryIdentity = { kind: 'guest' } | { kind: 'authenticated'; userId: string };

export type RouteName = 'home' | 'mandali' | 'settings' | 'notifications' | 'bhakti' | 'dharm_veer' | 'pathshala' | 'panchang' | 'vrat';
export type OutboxFeature = 'settings' | 'notifications' | 'japa' | 'mandali_posts' | 'mood' | 'sankalpa' | 'reactions';
export type RetryOutcome = 'success' | 'retry' | 'permanent_failure';

export type TelemetryEvent =
  | { type: 'route_open'; route: RouteName; cacheHit: boolean; durationMs: number; timestamp: number }
  | { type: 'refresh_failure'; route: RouteName; timestamp: number }
  | { type: 'mutation_retry_outcome'; feature: OutboxFeature; outcome: RetryOutcome; attempts: number; timestamp: number };

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

async function appendEvent(identity: TelemetryIdentity, event: TelemetryEvent): Promise<void> {
  const key = getTelemetryKey(identity);
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => {}) // a prior failure must not permanently wedge this identity's chain
    .then(async () => {
      const envelope = await readEnvelope(identity);
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

export function recordRouteOpen(
  identity: TelemetryIdentity,
  route: RouteName,
  data: { cacheHit: boolean; durationMs: number }
): void {
  void appendEvent(identity, { type: 'route_open', route, cacheHit: data.cacheHit, durationMs: data.durationMs, timestamp: Date.now() });
}

export function recordRefreshFailure(identity: TelemetryIdentity, route: RouteName): void {
  void appendEvent(identity, { type: 'refresh_failure', route, timestamp: Date.now() });
}

export function recordMutationRetryOutcome(
  identity: TelemetryIdentity,
  feature: OutboxFeature,
  outcome: RetryOutcome,
  attempts: number
): void {
  void appendEvent(identity, { type: 'mutation_retry_outcome', feature, outcome, attempts, timestamp: Date.now() });
}

export type RouteSummary = {
  route: RouteName;
  opens: number;
  cacheHitRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  refreshFailures: number;
};

export type OutboxSummary = {
  feature: OutboxFeature;
  success: number;
  retry: number;
  permanentFailure: number;
};

export type TelemetrySummary = {
  routes: RouteSummary[];
  outbox: OutboxSummary[];
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

  const routeGroups = new Map<RouteName, { durations: number[]; hits: number; opens: number; failures: number }>();
  const outboxGroups = new Map<OutboxFeature, OutboxSummary>();

  for (const event of envelope.events) {
    if (event.type === 'route_open') {
      const group = routeGroups.get(event.route) ?? { durations: [], hits: 0, opens: 0, failures: 0 };
      group.durations.push(event.durationMs);
      group.opens += 1;
      if (event.cacheHit) group.hits += 1;
      routeGroups.set(event.route, group);
    } else if (event.type === 'refresh_failure') {
      const group = routeGroups.get(event.route) ?? { durations: [], hits: 0, opens: 0, failures: 0 };
      group.failures += 1;
      routeGroups.set(event.route, group);
    } else {
      const group = outboxGroups.get(event.feature) ?? { feature: event.feature, success: 0, retry: 0, permanentFailure: 0 };
      if (event.outcome === 'success') group.success += 1;
      else if (event.outcome === 'retry') group.retry += 1;
      else group.permanentFailure += 1;
      outboxGroups.set(event.feature, group);
    }
  }

  const routes: RouteSummary[] = Array.from(routeGroups.entries()).map(([route, group]) => {
    const sorted = [...group.durations].sort((a, b) => a - b);
    return {
      route,
      opens: group.opens,
      cacheHitRate: group.opens > 0 ? group.hits / group.opens : 0,
      avgDurationMs: sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
      p95DurationMs: percentile(sorted, 95),
      refreshFailures: group.failures,
    };
  });

  return {
    routes,
    outbox: Array.from(outboxGroups.values()),
    totalEvents: envelope.events.length,
  };
}

export async function clearTelemetry(identity: TelemetryIdentity): Promise<void> {
  try {
    await AsyncStorage.removeItem(getTelemetryKey(identity));
  } catch (error) {
    console.warn('[Telemetry] clear failed', error);
  }
}

export async function clearAllTelemetry(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const telemetryKeys = keys.filter((k) => k === 'shoonaya_telemetry_v1_guest' || k.startsWith('shoonaya_telemetry_v1_user_'));
    if (telemetryKeys.length > 0) {
      await AsyncStorage.multiRemove(telemetryKeys);
    }
  } catch (error) {
    console.warn('[Telemetry] clearAll failed', error);
  }
}
