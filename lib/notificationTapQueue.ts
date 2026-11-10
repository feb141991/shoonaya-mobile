import { isSameAppIdentity, type AppIdentity } from './appIdentity';
import type { NotificationTapLaunchState, PendingNotificationTap } from './notificationTap';

/**
 * The private, per-account queue of notification taps waiting to be reported (AGENTS.md section 28).
 *
 * Pure: no React Native, no network, no storage of its own. Everything it touches arrives through `TapQueueDeps`, so
 * the rules below can be tested exactly. The runtime wiring is lib/notificationTapTracking.ts.
 *
 * What a queued tap holds: a stable event id, the backend's notification key, when the tap happened and whether it
 * launched the app. Never a title, body, route, screen, type or anything the person typed. The server decides the type
 * and the send time from its own log and decides whether recording is allowed at all; this queue only avoids storing,
 * and avoids sending, what the server would refuse.
 */

export const TAP_QUEUE_VERSION = 1;
/** Beyond this the oldest taps are dropped; a person does not tap 20 notifications while the server is unreachable. */
export const TAP_QUEUE_LIMIT = 20;
/** The server refuses a tap older than a week, so there is no point keeping one longer. */
export const TAP_QUEUE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** At most this many requests in one flush, so a long queue cannot hold the network. */
export const TAP_FLUSH_BATCH = 10;
export const TAP_UPLOAD_PATH = '/api/native/notification-taps';

/**
 * Mirrors the backend's notification_tap_type_reveals_practice (migration 20261111100000): types that are another
 * person's action or our own account notices, which cannot reveal religious practice. The server is the authority. A
 * difference between the two lists is harmless in both directions: if this is narrower, a tap is not queued that the
 * server would have kept; if it is wider, the server refuses the tap and it is dropped.
 */
export const NON_PRACTICE_TAP_TYPES: readonly string[] = [
  'connection_request', 'connection_accepted', 'connection_rejected', 'connection_cancelled',
  'post_reaction', 'comment_reaction', 'mandali_comment', 'user_blocked', 'content_reported',
  'security', 'account',
];

export type QueuedTap = {
  id: string;
  key: string;
  tappedAt: string;
  launchState: NotificationTapLaunchState;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function hash32(input: string, seed: number): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * The same notification response always yields the same event id, so a response replayed after a restart (Android keeps
 * the last one until it is cleared) is recorded once: the server ignores an id it has seen. Not a security primitive.
 */
export function deterministicEventId(seed: string): string {
  const parts = [0x1f3d5b79, 0x2c1b3c6d, 0x297a2d39, 0x3c6ef372].map((s) => hash32(seed, s).toString(16).padStart(8, '0'));
  const hex = parts.join('');
  const variant = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** What the signed-in device currently allows. Read at call time, never cached by the queue. */
export type TapConsent = { analytics: boolean; practice: boolean };

export type EnqueueResult =
  | 'queued'
  | 'duplicate'
  | 'not_signed_in'
  | 'no_key'
  | 'consent_off'
  | 'practice_consent_off'
  | 'invalid';

/** True when this device's own settings allow the tap to be kept. Fail closed: an unknown type needs practice consent. */
export function consentAllowsTap(consent: TapConsent, notificationType: string | null): 'ok' | 'consent_off' | 'practice_consent_off' {
  if (!consent.analytics) return 'consent_off';
  const revealsPractice = notificationType === null || !NON_PRACTICE_TAP_TYPES.includes(notificationType);
  if (revealsPractice && !consent.practice) return 'practice_consent_off';
  return 'ok';
}

export function buildQueuedTap(tap: Pick<PendingNotificationTap, 'key' | 'notificationKey' | 'receivedAt' | 'launchState'>): QueuedTap | null {
  if (!tap.notificationKey || tap.notificationKey.length > 200) return null;
  if (!Number.isFinite(tap.receivedAt)) return null;
  if (tap.launchState !== 'cold_start' && tap.launchState !== 'running') return null;
  return {
    id: deterministicEventId(tap.key),
    key: tap.notificationKey,
    tappedAt: new Date(tap.receivedAt).toISOString(),
    launchState: tap.launchState,
  };
}

function isQueuedTap(value: unknown): value is QueuedTap {
  if (!value || typeof value !== 'object') return false;
  const tap = value as Record<string, unknown>;
  return typeof tap.id === 'string' && UUID.test(tap.id)
    && typeof tap.key === 'string' && tap.key.length >= 1 && tap.key.length <= 200
    && typeof tap.tappedAt === 'string' && Number.isFinite(Date.parse(tap.tappedAt))
    && (tap.launchState === 'cold_start' || tap.launchState === 'running');
}

/** Reads what storage returned. Anything that is not exactly the current shape is discarded, never repaired. */
export function parseTapQueue(raw: string | null, now: number): QueuedTap[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || typeof parsed !== 'object') return [];
  const file = parsed as { v?: unknown; taps?: unknown };
  if (file.v !== TAP_QUEUE_VERSION || !Array.isArray(file.taps)) return [];
  const seen = new Set<string>();
  const taps: QueuedTap[] = [];
  for (const candidate of file.taps) {
    if (!isQueuedTap(candidate) || seen.has(candidate.id)) continue;
    const age = now - Date.parse(candidate.tappedAt);
    if (age > TAP_QUEUE_MAX_AGE_MS) continue;
    seen.add(candidate.id);
    taps.push({ id: candidate.id, key: candidate.key, tappedAt: candidate.tappedAt, launchState: candidate.launchState });
  }
  return taps.slice(-TAP_QUEUE_LIMIT);
}

export function serializeTapQueue(taps: readonly QueuedTap[]): string {
  return JSON.stringify({ v: TAP_QUEUE_VERSION, taps: taps.slice(-TAP_QUEUE_LIMIT) });
}

export type TapQueueDeps = {
  now(): number;
  getIdentity(): AppIdentity;
  consent(): TapConsent;
  readQueue(identity: AppIdentity): Promise<string | null>;
  /** Must itself refuse to write for an identity that is no longer current (writeUserScoped does). */
  writeQueue(identity: AppIdentity, value: string): Promise<void>;
  post(userId: string, body: Record<string, unknown>): Promise<{ status: number; json(): Promise<unknown> }>;
  appVersion: string;
  platform: 'ios' | 'android' | undefined;
};

/** Adds one delivered tap to the signed-in account's queue, if the device's own settings allow it. */
export async function enqueueTap(deps: TapQueueDeps, tap: PendingNotificationTap): Promise<EnqueueResult> {
  const identity = deps.getIdentity();
  if (identity.kind !== 'authenticated') return 'not_signed_in';
  if (!tap.notificationKey) return 'no_key';
  const allowed = consentAllowsTap(deps.consent(), tap.notificationType);
  if (allowed !== 'ok') return allowed;
  const queued = buildQueuedTap(tap);
  if (!queued) return 'invalid';

  const existing = parseTapQueue(await deps.readQueue(identity), deps.now());
  if (existing.some((item) => item.id === queued.id)) return 'duplicate';
  // The person may have signed out or switched while storage was read: never file a tap under the wrong owner.
  if (!isSameAppIdentity(identity, deps.getIdentity())) return 'not_signed_in';
  await deps.writeQueue(identity, serializeTapQueue([...existing, queued]));
  return 'queued';
}

export type TapAnswer = 'ack' | 'consent_off' | 'drop' | 'stop';

/**
 * What a server answer means for ONE queued tap.
 *   ack          the server has dealt with it (recorded, replayed, unmatched, or religious consent missing): remove it.
 *   consent_off  the account has not opted in: remove everything, there is nothing to upload.
 *   drop         the server judged the request invalid and always will: remove it.
 *   stop         not now (sign-in refused, route not deployed, rate limited, server error): keep it and stop this flush.
 */
export function classifyTapAnswer(status: number, body: unknown): TapAnswer {
  if (status === 202 || status === 200) {
    const result = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    return result.consentRequired === true ? 'consent_off' : 'ack';
  }
  if (status === 400) return 'drop';
  return 'stop';
}

export type FlushResult = {
  attempted: number;
  acknowledged: number;
  dropped: number;
  remaining: number;
  stoppedBy: 'consent_off' | 'consent_missing' | 'not_signed_in' | 'identity_changed' | 'server' | 'network' | null;
};

/**
 * Sends the signed-in account's queued taps, oldest first, removing exactly the ones the server has acknowledged.
 * Nothing is sent without this device's analytics consent, and a failed or interrupted flush leaves the rest queued.
 */
export async function flushTapQueue(deps: TapQueueDeps): Promise<FlushResult> {
  const result: FlushResult = { attempted: 0, acknowledged: 0, dropped: 0, remaining: 0, stoppedBy: null };
  const identity = deps.getIdentity();
  if (identity.kind !== 'authenticated') return { ...result, stoppedBy: 'not_signed_in' };
  // Not yet known (the consent flags are read asynchronously at start-up) or switched off: keep the queue for later.
  // Switching consent off deletes the queue where it happens (clearTapQueue); this never uploads without consent.
  if (!deps.consent().analytics) return { ...result, stoppedBy: 'consent_missing' };

  let queue = parseTapQueue(await deps.readQueue(identity), deps.now());
  result.remaining = queue.length;
  if (queue.length === 0) return result;

  const batch = queue.slice(0, TAP_FLUSH_BATCH);
  const settled = new Set<string>();
  for (const tap of batch) {
    if (!isSameAppIdentity(identity, deps.getIdentity())) { result.stoppedBy = 'identity_changed'; break; }
    // Consent can be withdrawn between requests.
    if (!deps.consent().analytics) { result.stoppedBy = 'consent_missing'; break; }
    result.attempted += 1;
    let response: { status: number; json(): Promise<unknown> };
    try {
      response = await deps.post(identity.userId, {
        clientEventId: tap.id,
        notificationKey: tap.key,
        tappedAt: tap.tappedAt,
        launchState: tap.launchState,
        ...(deps.appVersion ? { appVersion: deps.appVersion } : {}),
        ...(deps.platform ? { platform: deps.platform } : {}),
      });
    } catch {
      // Transport, timeout, or an identity mismatch raised by the API layer: keep everything and try later.
      result.stoppedBy = 'network';
      break;
    }
    const body = await response.json().catch(() => null);
    const answer = classifyTapAnswer(response.status, body);
    if (answer === 'consent_off') {
      // The account has not opted in (for example it was withdrawn on another device): nothing here may be uploaded.
      queue = [];
      settled.clear();
      result.dropped += result.remaining;
      result.remaining = 0;
      result.stoppedBy = 'consent_off';
      break;
    }
    if (answer === 'stop') { result.stoppedBy = 'server'; break; }
    settled.add(tap.id);
    if (answer === 'ack') result.acknowledged += 1; else result.dropped += 1;
  }

  if (result.stoppedBy === 'identity_changed') return result;
  // Re-read before writing so a tap queued during the uploads is never overwritten by a stale copy.
  const latest = result.stoppedBy === 'consent_off' ? [] : parseTapQueue(await deps.readQueue(identity), deps.now());
  const remaining = latest.filter((tap) => !settled.has(tap.id));
  result.remaining = remaining.length;
  if (isSameAppIdentity(identity, deps.getIdentity())) await deps.writeQueue(identity, serializeTapQueue(remaining));
  return result;
}

/** Deletes the account's queue (consent withdrawn, or practice consent withdrawn). */
export async function clearTapQueue(deps: Pick<TapQueueDeps, 'getIdentity' | 'writeQueue'>, userId: string): Promise<void> {
  const identity = deps.getIdentity();
  if (identity.kind !== 'authenticated' || identity.userId !== userId) return;
  await deps.writeQueue(identity, serializeTapQueue([]));
}

/** Runs queue operations one at a time, in order, so a flush and an enqueue can never overwrite each other. */
export function createSerialRunner() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const next = tail.then(operation, operation);
      tail = next.then(() => undefined, () => undefined);
      return next;
    },
  };
}
