/**
 * Post/comment reaction's durable outbox. Reactions differ from Sankalpa
 * check-in in one important way: a target (a given post or comment) has
 * exactly one meaningful desired state at a time -- a reaction type, or
 * "removed" -- so unlike Sankalpa's append-one-entry-per-day shape, this
 * outbox is keyed by (targetType, targetId) and a new queue call for a
 * target that's already pending/failed *supersedes* the old desired state
 * rather than adding a second entry. That matches what the UI actually
 * wants: if you tap pranam then love in quick succession while offline,
 * only the final "love" should ever reach the server.
 *
 * The backend is already naturally idempotent (upsert on
 * post_id/user_id or comment_id/user_id for set, delete-by-match for
 * remove), so persisting and retrying across an app restart carries no
 * duplication risk.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attemptReactionActionWithRetry, type ReactionAction } from './reactionRetry';
import { recordMutationRetryOutcome } from './telemetry';
import type { ReactionType } from './mandali';

const SCHEMA_VERSION = 1;

export type ReactionTargetType = 'post' | 'comment';

type PendingReactionChange = {
  id: string;
  targetType: ReactionTargetType;
  targetId: string;
  desiredReaction: ReactionType | null; // null = "remove my reaction"
  attempts: number;
  createdAt: number;
  status: 'pending' | 'failed';
};

type ReactionOutboxEnvelope = {
  schemaVersion: number;
  userId: string;
  savedAt: number;
  pendingOperations: PendingReactionChange[];
};

/** Constructs the real Supabase write for a queued entry; injected so tests can substitute a fake. */
export type PerformReactionAction = (
  targetType: ReactionTargetType,
  targetId: string,
  desiredReaction: ReactionType | null
) => Promise<void>;

type DelayFn = (ms: number) => Promise<void>;
const realDelay: DelayFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getKey(userId: string): string {
  return `shoonaya_reaction_outbox_v1_user_${userId}`;
}

function targetKey(targetType: ReactionTargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function isValidEnvelope(value: unknown): value is ReactionOutboxEnvelope {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.userId === 'string' && Array.isArray(v.pendingOperations);
}

const writeChains = new Map<string, Promise<void>>();

async function readEnvelope(userId: string): Promise<ReactionOutboxEnvelope> {
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

// Same per-key write-serialization as lib/telemetry.ts / lib/sankalpaOutbox.ts
// -- concurrent queue/resume calls for the same user must not race on a
// read-modify-write cycle and silently drop a queued operation.
async function mutateEnvelope(
  userId: string,
  mutator: (pendingOperations: PendingReactionChange[]) => PendingReactionChange[]
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

function toAction(performAction: PerformReactionAction, op: PendingReactionChange): ReactionAction {
  return () => performAction(op.targetType, op.targetId, op.desiredReaction);
}

async function attempt(userId: string, op: PendingReactionChange, performAction: PerformReactionAction, delay: DelayFn): Promise<void> {
  const success = await attemptReactionActionWithRetry(
    toAction(performAction, op),
    (outcome, attempts) => recordMutationRetryOutcome({ kind: 'authenticated', userId }, 'reactions', outcome, attempts),
    delay
  );
  if (success) {
    await mutateEnvelope(userId, (ops) => ops.filter((item) => item.id !== op.id));
    return;
  }
  // The retry attempt already exhausted its own bounded backoff window --
  // stays 'failed' until the next resume (foreground/cold start) or an
  // explicit user Retry, same as the Sankalpa outbox.
  await mutateEnvelope(userId, (ops) => ops.map((item) => (item.id === op.id ? { ...item, attempts: item.attempts + 1, status: 'failed' } : item)));
}

/**
 * Queues the desired reaction state for a target and attempts it
 * immediately. If a pending or failed entry for the same target already
 * exists (rapid re-tapping, or a resume racing a fresh tap), it is
 * superseded in place -- only the latest desired state is ever meaningful.
 */
export async function queueReactionChange(
  userId: string,
  targetType: ReactionTargetType,
  targetId: string,
  desiredReaction: ReactionType | null,
  performAction: PerformReactionAction,
  delay: DelayFn = realDelay
): Promise<void> {
  let op: PendingReactionChange | undefined;
  await mutateEnvelope(userId, (ops) => {
    const key = targetKey(targetType, targetId);
    const existing = ops.find((item) => targetKey(item.targetType, item.targetId) === key);
    if (existing) {
      op = { ...existing, desiredReaction, status: 'pending' };
      return ops.map((item) => (item.id === existing.id ? op! : item));
    }
    op = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetType,
      targetId,
      desiredReaction,
      attempts: 0,
      createdAt: Date.now(),
      status: 'pending',
    };
    return [...ops, op];
  });
  if (op) await attempt(userId, op, performAction, delay);
}

/** Call on screen mount (cold start) and app-foreground -- resumes only 'pending' entries, never 'failed' ones (those wait for an explicit Retry). */
export async function resumePendingReactionChanges(userId: string, performAction: PerformReactionAction, delay: DelayFn = realDelay): Promise<void> {
  const envelope = await readEnvelope(userId);
  const resumable = envelope.pendingOperations.filter((op) => op.status === 'pending');
  for (const op of resumable) {
    await attempt(userId, op, performAction, delay);
  }
}

export async function retryFailedReactionChanges(userId: string, performAction: PerformReactionAction, delay: DelayFn = realDelay): Promise<void> {
  const envelope = await readEnvelope(userId);
  const failed = envelope.pendingOperations.filter((op) => op.status === 'failed');
  for (const op of failed) {
    await attempt(userId, { ...op, status: 'pending' }, performAction, delay);
  }
}

export async function getFailedReactionChange(
  userId: string,
  targetType: ReactionTargetType,
  targetId: string
): Promise<PendingReactionChange | null> {
  const envelope = await readEnvelope(userId);
  const key = targetKey(targetType, targetId);
  return envelope.pendingOperations.find((op) => targetKey(op.targetType, op.targetId) === key && op.status === 'failed') ?? null;
}

export async function hasFailedReactionChange(userId: string, targetType: ReactionTargetType, targetId: string): Promise<boolean> {
  return (await getFailedReactionChange(userId, targetType, targetId)) != null;
}

/** One-shot read of every currently-failed target, for populating a screen's failed-state UI without a per-post/per-comment lookup. */
export async function listFailedReactionChanges(userId: string): Promise<Array<{ targetType: ReactionTargetType; targetId: string }>> {
  const envelope = await readEnvelope(userId);
  return envelope.pendingOperations
    .filter((op) => op.status === 'failed')
    .map((op) => ({ targetType: op.targetType, targetId: op.targetId }));
}

export async function discardFailedReactionChange(userId: string, targetType: ReactionTargetType, targetId: string): Promise<void> {
  const key = targetKey(targetType, targetId);
  await mutateEnvelope(userId, (ops) => ops.filter((op) => !(targetKey(op.targetType, op.targetId) === key && op.status === 'failed')));
}

export async function clearReactionOutbox(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(getKey(userId));
  } catch (error) {
    console.warn('[ReactionOutbox] clear failed', error);
  }
}

export async function clearAllReactionOutboxes(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const outboxKeys = keys.filter((k) => k.startsWith('shoonaya_reaction_outbox_v1_user_'));
    if (outboxKeys.length > 0) await AsyncStorage.multiRemove(outboxKeys);
  } catch (error) {
    console.warn('[ReactionOutbox] clearAll failed', error);
  }
}
