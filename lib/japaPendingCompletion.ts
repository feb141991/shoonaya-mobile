/**
 * Durable, owner-scoped persistence for a Japa completion that has been
 * sent but not yet acknowledged by the server -- closes the gap
 * lib/japaCompleteRetry.ts's bounded in-memory retry can't: that retry
 * loop, and its clientCompletionId, live only in JS memory, so a process
 * death between sending the request and receiving the response loses all
 * record of it. A naive retry after restart would generate a fresh
 * clientCompletionId and, if the original request actually succeeded
 * server-side, silently double-award karma/streak instead of resolving as
 * the same operation.
 *
 * Persisting the exact request body (not just the id) means a resume can
 * replay the identical request. complete_japa_session() is idempotent on
 * (user_id, clientCompletionId) (see the migration this depends on), so
 * replaying a request that already succeeded safely returns
 * idempotentReplay: true instead of a duplicate.
 *
 * A failed round can be followed by another round. Keep every operation,
 * and acknowledge by ID so an older response cannot clear newer work.
 *
 * Two read contracts, deliberately not one:
 * - readQueueStrict (private): used by writes/clears. Any storage read
 *   failure, invalid JSON, or entry that doesn't match the expected shape
 *   throws instead of being treated as "queue is empty" -- a write or
 *   clear that can't fully trust what it read must abort rather than
 *   construct a "cleaned" queue and overwrite whatever is actually
 *   stored. This is what makes the "persist before sending; a storage
 *   failure must not start an untracked write" comment in japa.tsx's
 *   persistJapaCompletion actually true: previously the read silently
 *   returned [] on failure, so a write proceeded anyway and could
 *   overwrite other still-pending entries with a truncated queue.
 * - readPendingJapaCompletions (public): for the recovery scan, which
 *   must never throw but also must not pretend an unreadable queue is an
 *   empty one -- those are different facts ("nothing to recover" vs
 *   "couldn't check"), and collapsing them would make a corrupt/
 *   unreadable queue look identical to a healthy empty one.
 *
 * status mirrors lib/reactionOutbox.ts's convention: one persisted queue,
 * entries carry 'pending' or 'failed' rather than living in two separate
 * lists. 'failed' is reserved for a definitive rejection (see
 * japaCompleteRetry.ts's JapaCompleteOutcome) -- a request that will never
 * succeed no matter how many times it's retried verbatim. It stays queued
 * (visible, retryable from Settings/Japa's own failed-item UI) rather than
 * being silently dropped, and -- critically -- no longer sits at the front
 * of the queue blocking recovery of independent, still-viable entries
 * after it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'shoonaya.japa.pending_completion.v1_user_';

export type PendingJapaCompletionStatus = 'pending' | 'failed';

export type PendingJapaCompletion = {
  clientCompletionId: string;
  requestBody: string;
  createdAt: string;
  status: PendingJapaCompletionStatus;
};

export type PendingQueueReadResult =
  | { status: 'ok'; items: PendingJapaCompletion[] }
  | { status: 'unavailable' };

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function normalizePendingJapaCompletion(item: unknown): PendingJapaCompletion {
  if (!item || typeof item !== 'object') {
    throw new Error('Corrupt pending Japa completion queue entry');
  }
  const record = item as Record<string, unknown>;
  if (typeof record.clientCompletionId !== 'string' || typeof record.requestBody !== 'string') {
    throw new Error('Corrupt pending Japa completion queue entry');
  }
  // Entries written before `status` existed have no such field -- that's a
  // known, expected legacy shape, not corruption. An explicit value that
  // isn't one of the two valid ones, on the other hand, is.
  if (record.status !== undefined && record.status !== 'pending' && record.status !== 'failed') {
    throw new Error('Corrupt pending Japa completion queue entry');
  }
  return {
    clientCompletionId: record.clientCompletionId,
    requestBody: record.requestBody,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    status: record.status === 'failed' ? 'failed' : 'pending',
  };
}

async function readQueueStrict(userId: string): Promise<PendingJapaCompletion[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  // Accept the previous single-slot format without losing an in-flight save.
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map(normalizePendingJapaCompletion);
}

async function writeQueue(userId: string, queue: PendingJapaCompletion[]): Promise<void> {
  if (queue.length) await AsyncStorage.setItem(keyFor(userId), JSON.stringify(queue));
  else await AsyncStorage.removeItem(keyFor(userId));
}

export async function readPendingJapaCompletions(userId: string): Promise<PendingQueueReadResult> {
  try {
    return { status: 'ok', items: await readQueueStrict(userId) };
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * Simplified getter for callers that only need "is there something
 * pending" and can safely treat "unavailable" the same as "nothing found"
 * -- e.g. a future display badge. Never use this to decide what to write
 * back to storage; use readQueueStrict (via write/clear) for that.
 */
export async function readPendingJapaCompletion(userId: string): Promise<PendingJapaCompletion | null> {
  const result = await readPendingJapaCompletions(userId);
  return result.status === 'ok' ? (result.items[0] ?? null) : null;
}

const writes = new Map<string, Promise<void>>();
function serialize(userId: string, action: () => Promise<void>): Promise<void> {
  const next = (writes.get(userId) ?? Promise.resolve()).catch(() => {}).then(action);
  writes.set(userId, next);
  return next;
}

export async function writePendingJapaCompletion(
  userId: string,
  pending: Omit<PendingJapaCompletion, 'status'>
): Promise<void> {
  return serialize(userId, async () => {
    // Throws (aborting the write) rather than risk overwriting an
    // unreadable-but-real queue with one built from an assumed-empty read.
    const queue = await readQueueStrict(userId);
    if (!queue.some((entry) => entry.clientCompletionId === pending.clientCompletionId)) {
      queue.push({ ...pending, status: 'pending' });
    }
    await writeQueue(userId, queue);
  });
}

export async function clearPendingJapaCompletion(userId: string, completionId: string): Promise<void> {
  return serialize(userId, async () => {
    const queue = (await readQueueStrict(userId)).filter((entry) => entry.clientCompletionId !== completionId);
    await writeQueue(userId, queue);
  });
}

/**
 * Quarantines a definitively-rejected completion: stays in the queue
 * (visible, not silently discarded) but is marked 'failed' so the
 * recovery loop skips it and moves on to independent, still-viable
 * entries instead of retrying (and blocking on) the same doomed request
 * forever.
 */
export async function markPendingJapaCompletionFailed(userId: string, completionId: string): Promise<void> {
  return serialize(userId, async () => {
    const queue = (await readQueueStrict(userId)).map((entry) =>
      entry.clientCompletionId === completionId ? { ...entry, status: 'failed' as const } : entry
    );
    await writeQueue(userId, queue);
  });
}

/** Explicit user Retry on a failed item -- re-arms it for the next recovery pass. */
export async function retryFailedJapaCompletion(userId: string, completionId: string): Promise<void> {
  return serialize(userId, async () => {
    const queue = (await readQueueStrict(userId)).map((entry) =>
      entry.clientCompletionId === completionId ? { ...entry, status: 'pending' as const } : entry
    );
    await writeQueue(userId, queue);
  });
}

/** Gives up on a failed item permanently -- the user has seen it and chosen to discard it. */
export async function discardFailedJapaCompletion(userId: string, completionId: string): Promise<void> {
  return clearPendingJapaCompletion(userId, completionId);
}

/** One-shot read of every currently-failed completion, for populating a failed-item UI. */
export async function listFailedJapaCompletions(userId: string): Promise<PendingJapaCompletion[]> {
  const result = await readPendingJapaCompletions(userId);
  return result.status === 'ok' ? result.items.filter((entry) => entry.status === 'failed') : [];
}

export async function hasFailedJapaCompletion(userId: string): Promise<boolean> {
  return (await listFailedJapaCompletions(userId)).length > 0;
}
