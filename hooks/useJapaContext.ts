import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { captureAppIdentity, getAppIdentity, type useAppIdentity } from '@/lib/appIdentity';
import { attemptAndReconcilePendingCompletion } from '@/lib/japaCompletionReconciliation';
import {
  clearJapaContextCache,
  normalizeJapaContext,
  readJapaContextCache,
  writeJapaContextCache,
  type JapaContext,
} from '@/lib/japaContextCache';
import { EMPTY_LIFETIME, readGuestLifetime, writeGuestLifetime, type JapaLifetimeData } from '@/lib/japaGuestLifetime';
import { readPendingJapaCompletions } from '@/lib/japaPendingCompletion';
import {
  parseServerTimingHeader,
  recordMutationRetryOutcome,
  recordRefreshFailure,
  recordRouteOpen,
  recordServerTiming,
} from '@/lib/telemetry';

type Options = {
  appIdentity: ReturnType<typeof useAppIdentity>;
  resetSyncQueue: () => void;
  refreshSyncQueue: (userId: string) => Promise<void>;
};

// What the Japa screen knows about the person's practice (tradition, streak,
// whether today's japa is done, lifetime beads, reminder setting) and how it
// is loaded: a same-identity cached copy first, then the server, with queued
// completions from an earlier session recovered after first paint. Moved out
// of app/(tabs)/japa.tsx without changes to the loading rules; every response
// is dropped unless it is still the newest load for the identity that
// started it (contextLoadGenerationRef and isCurrentLoad).
export function useJapaContext({ appIdentity, resetSyncQueue, refreshSyncQueue }: Options) {
  const [loading, setLoading] = useState(true);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(null);
  const [tradition, setTradition] = useState<string | null>('hindu');
  const [streak, setStreak] = useState(0);
  const [japaAlreadyDoneToday, setJapaAlreadyDoneToday] = useState(false);
  const [lifetime, setLifetime] = useState<JapaLifetimeData>(EMPTY_LIFETIME);
  const [isGuest, setIsGuest] = useState(false);
  const [japaReminderEnabled, setJapaReminderEnabled] = useState<boolean | null>(null);
  const userIdRef = useRef<string | null>(null);
  const contextLoadGenerationRef = useRef(0);
  const routeOpenStartedAtRef = useRef(Date.now());
  const routeOpenRecordedRef = useRef(false);

  const updateLifetime = useCallback(async (beadsToAdd: number) => {
    const lease = captureAppIdentity();
    if (lease.identity.kind !== 'guest') return;
    const next: JapaLifetimeData = {
      totalBeads: lifetime.totalBeads + beadsToAdd,
      totalRounds: lifetime.totalRounds + (beadsToAdd >= 108 ? 1 : 0),
      lastPracticed: new Date().toISOString(),
    };
    await writeGuestLifetime(next);
    if (lease.isCurrent()) setLifetime(next);
  }, [lifetime]);

  const applyJapaContext = useCallback((context: JapaContext) => {
    setActiveSymbolId(context.activeSymbolId);
    setTradition(context.tradition);
    setJapaAlreadyDoneToday(context.japaDone);
    setStreak(context.streak);
    setLifetime(context.lifetime);
    setJapaReminderEnabled(context.japaReminderEnabled);
  }, []);

  const loadContext = useCallback(async (options: { background?: boolean } = {}) => {
    let cacheApplied = false;
    const loadGeneration = ++contextLoadGenerationRef.current;
    const identityAtStart = getAppIdentity();
    const isCurrentLoad = () => {
      if (contextLoadGenerationRef.current !== loadGeneration) return false;
      const currentIdentity = getAppIdentity();
      if (identityAtStart.kind === 'authenticated') {
        return currentIdentity.kind === 'authenticated' && currentIdentity.userId === identityAtStart.userId;
      }
      return currentIdentity.kind === identityAtStart.kind;
    };
    const recordOpen = (identity: { kind: 'guest' } | { kind: 'authenticated'; userId: string }, cacheHit: boolean) => {
      if (routeOpenRecordedRef.current) return;
      const currentIdentity = getAppIdentity();
      const stillSameIdentity = identity.kind === 'guest'
        ? currentIdentity.kind === 'guest'
        : currentIdentity.kind === 'authenticated' && currentIdentity.userId === identity.userId;
      if (!stillSameIdentity) return;
      routeOpenRecordedRef.current = true;
      recordRouteOpen(identity, 'japa', { cacheHit, durationMs: Date.now() - routeOpenStartedAtRef.current });
    };
    try {
      const identity = identityAtStart;
      if (identity.kind === 'loading') return;

      if (identity.kind === 'guest') {
        setIsGuest(true);
        userIdRef.current = null;
        void clearJapaContextCache();
        resetSyncQueue();
        setTradition('hindu');
        setActiveSymbolId(null);
        setJapaAlreadyDoneToday(false);
        setStreak(0);
        setJapaReminderEnabled(null);
        const guestLifetime = await readGuestLifetime();
        if (!isCurrentLoad()) return;
        setLifetime(guestLifetime.lifetime);
        recordOpen({ kind: 'guest' }, guestLifetime.saved);
        return;
      }

      if (identity.kind === 'unauthenticated') {
        setIsGuest(false);
        userIdRef.current = null;
        resetSyncQueue();
        setTradition('hindu');
        setActiveSymbolId(null);
        setJapaAlreadyDoneToday(false);
        setStreak(0);
        setJapaReminderEnabled(null);
        setLifetime(EMPTY_LIFETIME);
        return;
      }

      setIsGuest(false);
      if (!options.background) setLoading(true);
      const userId = identity.userId;
      userIdRef.current = userId;

      // Resolve a completion left over from a previous session that never
      // got acknowledged (e.g. the app was killed after the request was
      // sent but before the response arrived) before reading fresh context
      // below -- otherwise this screen could show an unsaved streak for a
      // round that actually saved, or silently lose a genuinely-unsaved
      // one. Replays the exact original request (same clientCompletionId),
      // so a request that already succeeded resolves as idempotentReplay
      // rather than double-awarding karma/streak. Silent recovery attempt,
      // never surfaced as an error here; left pending on failure so the
      // next mount retries again.
      const cached = await readJapaContextCache(userId);
      if (!isCurrentLoad()) return;
      if (cached) {
        applyJapaContext(cached);
        cacheApplied = true;
        setLoading(false);
        recordOpen({ kind: 'authenticated', userId }, true);
      }
      const response = await apiFetch('/api/japa/context', { expectedUserId: userId });
      if (!isCurrentLoad()) return;
      const japaServerTiming = parseServerTimingHeader(response.headers.get('Server-Timing'));
      if (japaServerTiming) recordServerTiming({ kind: 'authenticated', userId }, 'japa', japaServerTiming);
      if (!response.ok) throw new Error('japa-context-failed');
      const context = normalizeJapaContext(await response.json());
      if (!context) throw new Error('japa-context-invalid');
      if (!isCurrentLoad()) return;
      applyJapaContext(context);
      cacheApplied = true;
      setLoading(false);
      await writeJapaContextCache(userId, context);
      recordOpen({ kind: 'authenticated', userId }, false);

      // Recover after rendering usable context, not on the first-paint path.
      let recovered = false;
      const pendingQueue = await readPendingJapaCompletions(userId);
      if (!isCurrentLoad()) return;
      // 'unavailable' (a corrupt/unreadable queue) is not evidence there's
      // nothing to recover -- skip recovery this launch rather than
      // pretending it's confirmed empty; the next launch gets another try.
      if (pendingQueue.status === 'ok') {
        // 'failed' entries wait for an explicit user Retry (Settings/Japa's
        // failed-item UI), same convention as reactionOutbox's
        // resumePendingReactionChanges -- they are not auto-retried here.
        for (const pendingCompletion of pendingQueue.items.filter((entry) => entry.status === 'pending')) {
          if (!isCurrentLoad()) return;
          const outcome = await attemptAndReconcilePendingCompletion(
            userId,
            pendingCompletion,
            (path, options) => apiFetch(path, { ...options, expectedUserId: userId }),
            (label, attempts) => recordMutationRetryOutcome({ kind: 'authenticated', userId }, 'japa', label, attempts)
          );
          if (!isCurrentLoad()) return;
          if (outcome.kind === 'success') {
            recovered = true;
          } else if (outcome.kind === 'uncertain') {
            // Ambiguous/potentially-recoverable (network exception, or a
            // still-retryable HTTP failure that exhausted this bounded
            // attempt) -- stop for this launch rather than risk reordering
            // completions past a request that may yet succeed, and retry
            // the remaining queue, in order, next launch.
            break;
          }
          // definitive_rejection: already quarantined by the shared
          // helper -- continue to the next independent entry.
        }
      }

      if (recovered) {
        const latest = await apiFetch('/api/japa/context', { expectedUserId: userId });
        if (!isCurrentLoad()) return;
        const updated = latest.ok ? normalizeJapaContext(await latest.json()) : null;
        if (updated && isCurrentLoad()) {
          applyJapaContext(updated);
          await writeJapaContextCache(userId, updated);
        }
      }
      await refreshSyncQueue(userId);
    } catch {
      if (!isCurrentLoad()) return;
      const identity = getAppIdentity();
      if (identity.kind === 'authenticated') recordRefreshFailure(identity, 'japa');
      if (!cacheApplied) {
        setActiveSymbolId(null);
        setTradition('hindu');
        setJapaAlreadyDoneToday(false);
        setStreak(0);
        setJapaReminderEnabled(null);
      }
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  }, [applyJapaContext, refreshSyncQueue, resetSyncQueue]);

  useEffect(() => {
    if (appIdentity.kind === 'loading') return;
    setJapaReminderEnabled(null);
    routeOpenStartedAtRef.current = Date.now();
    routeOpenRecordedRef.current = false;
    void loadContext();
    return () => {
      contextLoadGenerationRef.current += 1;
    };
  }, [appIdentity, loadContext]);

  return {
    loading,
    activeSymbolId,
    tradition,
    streak,
    japaAlreadyDoneToday,
    lifetime,
    isGuest,
    japaReminderEnabled,
    userIdRef,
    updateLifetime,
    applyJapaContext,
    loadContext,
  };
}
