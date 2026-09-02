/**
 * Sankalpa check-in's durable outbox. Unlike mood check-in, this action
 * has no "user is waiting for a return value to proceed" shape at either
 * of its two call sites (components/home/SankalpaCard.tsx,
 * app/sankalpa.tsx) -- both just want to know "did today's check-in
 * stick" and update a boolean. And unlike mood, the backend is already
 * naturally idempotent (upsert on user_id/sankalpa_id/checked_date), so
 * there's no operation-id bookkeeping needed, no risk in persisting and
 * retrying across an app restart. That combination is exactly what a
 * queue-and-resume outbox (Settings/Notifications' shape) is for, unlike
 * mood's bounded-inline-retry treatment.
 *
 * Both screens share this one outbox (keyed by userId only, not per-
 * screen) so a check-in queued from the Home card and a resume triggered
 * from the standalone Sankalpa screen can't race into two separate
 * queued attempts for the same day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attemptSankalpaCheckinWithRetry, type SankalpaCheckinFetch } from './sankalpaCheckinRetry';
import { recordMutationRetryOutcome } from './telemetry';

const SCHEMA_VERSION = 1;

type PendingSankalpaCheckin = {
  id: string;
  sankalpaId: string;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  status: 'pending' | 'failed';
};

type SankalpaOutboxEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  pendingOperations: PendingSankalpaCheckin[];
};

function getKey(userId: string): string {
  return `shoonaya_sankalpa_outbox_v1_user_${userId}`;
}

function isValidEnvelope(value: unknown): value is SankalpaOutboxEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.userId === 'string' && Array.isArray(v.pendingOperations);
}

const writeChains = new Map<string, Promise<void>>();

async function readEnvelope(userId: string): Promise<SankalpaOutboxEnvelope> {
  try {
    const raw = await AsyncStorage.getItem(getKey(userId));
    if (!raw) return { schemaVersion: SCHEMA_VERSION, userId, savedAt: 0, pendingOperations: [] };
    const parsed = JSON.parse(raw);
    if (!isValidEnvelope(parsed) || parsed.schemaVersion !== SCHEMA_VERSION || parsed.userId !== userId) {
      return { schemaVersion: SCHEMA_VERSION, userId, savedAt: 0, pendingOperations: [] };
    }
    return parsed;
  } catch {
    return { schemaVersion: SCHEMA_VERSION, userId, savedAt: 0, pendingOperations: [] };
  }
}

// Same per-key write-serialization as lib/telemetry.ts -- concurrent
// queue/resume calls for the same user must not race on a read-modify-
// write cycle and silently drop a queued operation.
async function mutateEnvelope(
  userId: string,
  mutator: (pendingOperations: PendingSankalpaCheckin[]) => PendingSankalpaCheckin[]
): Promise<void> {
  const key = getKey(userId);
  const previous = writeChains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const envelope = await readEnvelope(userId);
    const pendingOperations = mutator(envelope.pendingOperations);
    await AsyncStorage.setItem(key, JSON.stringify({ ...envelope, savedAt: Date.now(), pendingOperations }));
  });
  writeChains.set(key, next);
  await next;
}

type DelayFn = (ms: number) => Promise<void>;
const realDelay: DelayFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(userId: string, op: PendingSankalpaCheckin, fetchImpl: SankalpaCheckinFetch, delay: DelayFn): Promise<void> {
  const success = await attemptSankalpaCheckinWithRetry(
    fetchImpl,
    op.sankalpaId,
    (outcome, attempts) => recordMutationRetryOutcome({ kind: 'authenticated', userId }, 'sankalpa', outcome, attempts),
    delay
  );
  if (success) {
    await mutateEnvelope(userId, (ops) => ops.filter((item) => item.id !== op.id));
    return;
  }
  // attemptSankalpaCheckinWithRetry already exhausted its own inline
  // backoff window before returning false -- from the outbox's
  // perspective that's a single terminal failure for this attempt, not
  // something to schedule yet another round of retries for immediately.
  // It stays 'failed' until the next resume (foreground/cold start) or an
  // explicit user Retry.
  await mutateEnvelope(userId, (ops) => ops.map((item) => (item.id === op.id ? { ...item, attempts: item.attempts + 1, status: 'failed' } : item)));
}

/**
 * Queues today's check-in for `sankalpaId` and attempts it immediately.
 * If a pending or failed entry for the same sankalpa already exists
 * (e.g. a rapid double-tap, or the standalone screen and the Home card
 * both queueing around the same moment), reuses it rather than queueing a
 * duplicate -- there's only ever one meaningful "did today's check-in
 * happen" outcome per sankalpa.
 */
export async function queueSankalpaCheckin(
  userId: string,
  sankalpaId: string,
  fetchImpl: SankalpaCheckinFetch,
  delay: DelayFn = realDelay
): Promise<void> {
  let op: PendingSankalpaCheckin | undefined;
  await mutateEnvelope(userId, (ops) => {
    const existing = ops.find((item) => item.sankalpaId === sankalpaId);
    if (existing) {
      op = { ...existing, status: 'pending' };
      return ops.map((item) => (item.id === existing.id ? op! : item));
    }
    op = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sankalpaId,
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      status: 'pending',
    };
    return [...ops, op];
  });
  if (op) await attempt(userId, op, fetchImpl, delay);
}

/** Call on screen mount (cold start) and app-foreground -- resumes only 'pending' entries, never 'failed' ones (those wait for an explicit Retry). */
export async function resumePendingSankalpaCheckins(userId: string, fetchImpl: SankalpaCheckinFetch, delay: DelayFn = realDelay): Promise<void> {
  const envelope = await readEnvelope(userId);
  const resumable = envelope.pendingOperations.filter((op) => op.status === 'pending');
  for (const op of resumable) {
    await attempt(userId, op, fetchImpl, delay);
  }
}

export async function retryFailedSankalpaCheckins(userId: string, fetchImpl: SankalpaCheckinFetch, delay: DelayFn = realDelay): Promise<void> {
  const envelope = await readEnvelope(userId);
  const failed = envelope.pendingOperations.filter((op) => op.status === 'failed');
  for (const op of failed) {
    await attempt(userId, { ...op, status: 'pending' }, fetchImpl, delay);
  }
}

export async function hasFailedSankalpaCheckin(userId: string, sankalpaId: string): Promise<boolean> {
  const envelope = await readEnvelope(userId);
  return envelope.pendingOperations.some((op) => op.sankalpaId === sankalpaId && op.status === 'failed');
}

export async function discardFailedSankalpaCheckins(userId: string): Promise<void> {
  await mutateEnvelope(userId, (ops) => ops.filter((op) => op.status !== 'failed'));
}

export async function clearSankalpaOutbox(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getKey(userId));
  } catch (error) {
    console.warn('[SankalpaOutbox] clear failed', error);
  }
}

export async function clearAllSankalpaOutboxes(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const outboxKeys = keys.filter((k) => k.startsWith('shoonaya_sankalpa_outbox_v1_user_'));
    if (outboxKeys.length > 0) await AsyncStorage.multiRemove(outboxKeys);
  } catch (error) {
    console.warn('[SankalpaOutbox] clearAll failed', error);
  }
}
