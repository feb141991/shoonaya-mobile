import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';

import { apiFetch } from '@/lib/api';
import { captureAppIdentity } from '@/lib/appIdentity';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { createJapaCompletionHandoff, readCurrentJapaCompletionContext, type JapaCompletionPayload } from '@/lib/japaCompletionSubmission';
import { attemptAndReconcilePendingCompletion, parsePendingCompletionMantra } from '@/lib/japaCompletionReconciliation';
import { writeJapaContextCache, type JapaContext } from '@/lib/japaContextCache';
import {
  discardFailedJapaCompletion,
  retryFailedJapaCompletion,
  type PendingJapaCompletion,
} from '@/lib/japaPendingCompletion';
import { recordMutationRetryOutcome } from '@/lib/telemetry';

type Options = {
  // The signed-in user the Japa screen last loaded context for; null for a
  // guest or signed-out person.
  userIdRef: MutableRefObject<string | null>;
  applyJapaContext: (context: JapaContext) => void;
  refreshSyncQueue: (userId: string) => Promise<void>;
};

// Saving a Japa completion and the manual retry/discard actions for rounds
// that could not be saved. Every write goes through the on-device pending
// queue first, so a round is never sent without being tracked.
export function useJapaCompletionPersistence({ userIdRef, applyJapaContext, refreshSyncQueue }: Options) {
  const [retryingCompletionId, setRetryingCompletionId] = useState<string | null>(null);

  const [handoff] = useState(() => createJapaCompletionHandoff(() => Crypto.randomUUID()));
  const submissionOrder = useRef(0);
  const appliedSubmission = useRef(0);

  const queueCompletion = useCallback(async (payload: JapaCompletionPayload) => {
    const lease = captureAppIdentity();
    if (lease.identity.kind !== 'authenticated' || lease.identity.userId !== userIdRef.current) {
      throw new Error('Sign in to save this session');
    }
    const { userId } = lease.identity;
    const pending = await handoff.enqueue(userId, payload);

    const order = ++submissionOrder.current;
    // The queue owns the round now. Delivery and dashboard refresh cannot undo that handoff.
    void (async () => {
      try {
        await refreshSyncQueue(userId);
        if (!lease.isCurrent()) return;
        const outcome = await attemptAndReconcilePendingCompletion(
          userId, pending,
          (path, options) => apiFetch(path, { ...options, expectedUserId: userId }),
          (label, attempts) => recordMutationRetryOutcome({ kind: 'authenticated', userId }, 'japa', label, attempts),
        );
        if (outcome.kind !== 'success') return;
        const context = await readCurrentJapaCompletionContext(outcome.response, lease.isCurrent);
        if (!lease.isCurrent()) return;
        if (payload.rounds > 0) void trackAnalyticsEvent('practice_completed');
        if (context && order > appliedSubmission.current) {
          appliedSubmission.current = order;
          applyJapaContext(context);
          await writeJapaContextCache(userId, context);
        }
      } finally {
        await refreshSyncQueue(userId);
      }
    })().catch(() => {
      // Delivery can be recovered from the durable queue.
    });
  }, [applyJapaContext, handoff, refreshSyncQueue, userIdRef]);

  const retrySyncedCompletion = useCallback(async (item: PendingJapaCompletion) => {
    const lease = captureAppIdentity();
    if (lease.identity.kind !== 'authenticated' || lease.identity.userId !== userIdRef.current) return;
    const { userId } = lease.identity;
    setRetryingCompletionId(item.clientCompletionId);
    try {
      // Re-arms the SAME entry (identical clientCompletionId/requestBody)
      // rather than generating a fresh operation -- a manual retry must
      // reuse the original id so the backend's idempotency check still
      // applies if it turns out the original request had actually landed.
      await retryFailedJapaCompletion(userId, item.clientCompletionId);
      const outcome = await attemptAndReconcilePendingCompletion(
        userId,
        { ...item, status: 'pending' },
        (path, options) => apiFetch(path, { ...options, expectedUserId: userId }),
        (label, attempts) => recordMutationRetryOutcome({ kind: 'authenticated', userId }, 'japa', label, attempts)
      );
      if (outcome.kind === 'success') {
        try {
          const latest = await apiFetch('/api/japa/context', { expectedUserId: userId });
          const updated = latest.ok ? await readCurrentJapaCompletionContext(latest, lease.isCurrent) : null;
          if (updated && lease.isCurrent()) {
            applyJapaContext(updated);
            await writeJapaContextCache(userId, updated);
          }
        } catch {
          // The retry itself already succeeded server-side -- a failure to
          // refresh the dashboard afterward is not a retry failure.
        }
      }
    } catch (error) {
      // retryFailedJapaCompletion's strict storage reader aborts rather
      // than corrupting the queue on a read failure (lib/japaPendingCompletion.ts),
      // so the item is untouched and still visible in the review sheet --
      // but the user must be told the attempt itself didn't go through,
      // not left assuming a silent no-op meant success.
      console.error('[Japa] retry failed', error);
      // What actually throws here is retryFailedJapaCompletion, a pure
      // on-device storage operation -- not a network call -- so this must
      // not blame connectivity for what is very likely a local storage
      // problem instead.
      Alert.alert('Could not retry', "Something went wrong updating this on your device. Please try again.");
    } finally {
      setRetryingCompletionId(null);
      await refreshSyncQueue(userId);
    }
  }, [applyJapaContext, refreshSyncQueue, userIdRef]);

  const discardSyncedCompletion = useCallback((item: PendingJapaCompletion) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const mantraName = parsePendingCompletionMantra(item.requestBody);
    Alert.alert(
      'Discard this round?',
      `${mantraName ? `"${mantraName}"` : 'This round'} could not be saved and will be permanently discarded, including its beads and duration. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void discardFailedJapaCompletion(userId, item.clientCompletionId)
              .catch((error) => {
                // Same strict-storage guarantee as retry: a failed discard
                // leaves the item exactly as it was, so it's safe to tell
                // the user to try again rather than assume it's gone.
                console.error('[Japa] discard failed', error);
                // Same as retry: discardFailedJapaCompletion is a pure
                // on-device storage operation, not a network call.
                Alert.alert('Could not discard', 'This round is still in your review list. Something went wrong updating this on your device -- please try again.');
              })
              .finally(() => refreshSyncQueue(userId));
          },
        },
      ]
    );
  }, [refreshSyncQueue, userIdRef]);

  return { queueCompletion, discardUnqueuedCompletion: handoff.discardUnqueued, retryingCompletionId, retrySyncedCompletion, discardSyncedCompletion };
}
