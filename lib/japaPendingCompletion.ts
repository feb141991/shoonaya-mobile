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
 * One slot per user, not a queue: app/(tabs)/japa.tsx already serializes
 * completions via its own `saving` state (a second completion cannot start
 * while one is in flight in the same session), so at most one true pending
 * completion can exist for a user at a time. The only way a stale entry
 * survives is a process death mid-request, resolved on the next mount.
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
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingJapaCompletion>;
    if (typeof parsed.clientCompletionId !== 'string' || typeof parsed.requestBody !== 'string') return null;
    return {
      clientCompletionId: parsed.clientCompletionId,
      requestBody: parsed.requestBody,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    };
  } catch {
    return null;
  }
}

export async function writePendingJapaCompletion(userId: string, pending: PendingJapaCompletion): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(pending));
  } catch {
    // Best-effort: a failed write only means process-death recovery won't
    // find this one. The in-memory bounded retry in japaCompleteRetry.ts
    // still covers the common case where the process survives.
  }
}

export async function clearPendingJapaCompletion(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {}
}
