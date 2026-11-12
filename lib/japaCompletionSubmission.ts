import { normalizeJapaContext } from './japaContextCache';
import { writePendingJapaCompletion, type PendingJapaCompletion } from './japaPendingCompletion';
import type { JapaChantingMode } from './japaPreferences';

export type JapaCompletionPayload = {
  mantra: string;
  count: number;
  rounds: number;
  durationSeconds: number;
  tradition: string | null;
  practiceType: string | null;
  activeSymbolId: string | null;
  chantingMode: JapaChantingMode;
};

export function createPendingJapaCompletion(
  clientCompletionId: string,
  payload: JapaCompletionPayload,
): PendingJapaCompletion {
  return {
    clientCompletionId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    requestBody: JSON.stringify({
      clientCompletionId,
      ...payload,
      practiceType: `${payload.practiceType ?? 'mala'}:${payload.chantingMode}`,
    }),
  };
}

/** Keep the same request if device storage fails before confirming the handoff. */
export function createJapaCompletionHandoff(makeId: () => string) {
  let unqueued: PendingJapaCompletion | null = null;
  return {
    async enqueue(userId: string, payload: JapaCompletionPayload) {
      const operation = unqueued ?? createPendingJapaCompletion(makeId(), payload);
      unqueued = operation;
      await writePendingJapaCompletion(userId, operation);
      unqueued = null;
      return operation;
    },
    discardUnqueued() {
      unqueued = null;
    },
  };
}

export function getJapaRoundDuration(elapsed: number, queuedThrough: number) {
  return Math.max(0, elapsed - queuedThrough);
}

export async function readCurrentJapaCompletionContext(response: Response, isCurrent: () => boolean) {
  try {
    const context = normalizeJapaContext(await response.json());
    return isCurrent() ? context : null;
  } catch {
    // Delivery may already have succeeded even if its dashboard body is unusable.
    return null;
  }
}
