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
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'shoonaya.japa.pending_completion.v1_user_';

export type PendingJapaCompletion = {
  clientCompletionId: string;
  requestBody: string;
  createdAt: string;
};

function keyFor(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function readPendingJapaCompletion(userId: string): Promise<PendingJapaCompletion | null> {
  return (await readPendingJapaCompletions(userId))[0] ?? null;
}

export async function readPendingJapaCompletions(userId: string): Promise<PendingJapaCompletion[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Accept the previous single-slot format without losing an in-flight save.
    return (Array.isArray(parsed) ? parsed : [parsed]).filter((item): item is PendingJapaCompletion =>
      !!item && typeof item === 'object' && typeof item.clientCompletionId === 'string'
      && typeof item.requestBody === 'string');
  } catch {
    return [];
  }
}

const writes = new Map<string, Promise<void>>();
function serialize(userId: string, action: () => Promise<void>): Promise<void> {
  const next = (writes.get(userId) ?? Promise.resolve()).catch(() => {}).then(action);
  writes.set(userId, next);
  return next;
}

export async function writePendingJapaCompletion(userId: string, pending: PendingJapaCompletion): Promise<void> {
  return serialize(userId, async () => {
    const queue = await readPendingJapaCompletions(userId);
    if (!queue.some((entry) => entry.clientCompletionId === pending.clientCompletionId)) queue.push(pending);
    // Fail before sending when durable persistence is unavailable.
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(queue));
  });
}

export async function clearPendingJapaCompletion(userId: string, completionId: string): Promise<void> {
  return serialize(userId, async () => {
    const queue = (await readPendingJapaCompletions(userId)).filter((entry) => entry.clientCompletionId !== completionId);
    if (queue.length) await AsyncStorage.setItem(keyFor(userId), JSON.stringify(queue));
    else await AsyncStorage.removeItem(keyFor(userId));
  });
}

export function isJapaCompletionAcknowledged(response: Response | null): boolean {
  return response?.ok === true;
}
