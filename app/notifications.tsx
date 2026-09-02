import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, RefreshControl, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, TYPE } from '@/lib/constants';
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type NotificationRow,
} from '@/lib/notificationsData';
import {
  readNotificationsCache,
  writeNotificationsCache,
  patchNotificationsCache,
  writePendingNotificationOperations,
  type PendingNotificationOperation,
  type NotificationOutboxAction,
} from '@/lib/notificationsCache';
import { classifyFailure, nextBackoffMs, HttpError } from '@/lib/retryPolicy';
import { recordRouteOpen, recordRefreshFailure, recordMutationRetryOutcome } from '@/lib/telemetry';
import { resolveNativeRoute } from '@/lib/routes';
import { supabase } from '@/lib/supabase';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';

// Native's notification inbox replaces the Home bell's former alert-only
// behavior. Matches the PWA's notification panel UX
// (src/app/(main)/home/HomeDashboard.tsx:1559-1717 in the web repo): emoji
// avatar, title/body/timestamp, unread gold tint + dot, header "mark all
// read", an account-aware empty state, tap-to-mark-
// read-then-navigate. Presented as a full native screen rather than a
// floating dropdown — a dropdown overlay doesn't translate to a phone-sized
// viewport, and a full list is the standard, more premium mobile pattern
// for a notification center (native owns the experience; the visual
// language and interaction model are what's kept faithful to the PWA, not
// the container shape).
//
// Notification *preferences* (festival/shloka/nitya/community/family
// toggles) already exist and work end to end in app/settings.tsx — not
// duplicated here. This screen links to Settings instead.

function formatNotificationDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

type NotificationTheme = {
  bg: string;
  card: string;
  border: string;
  text: string;
  dim: string;
  iconWell: string;
  unreadBg: string;
  brand: string;
};

type NotificationListRowProps = {
  row: NotificationRow;
  theme: NotificationTheme;
  onPress: (row: NotificationRow) => void;
};

const NotificationListRow = memo(function NotificationListRow({ row, theme, onPress }: NotificationListRowProps) {
  return (
    <PressableSurface
      haptic="none"
      onPress={() => {
        onPress(row);
      }}
      accessibilityLabel={`${row.title}${row.read ? '' : ', unread'}`}
      style={{
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        backgroundColor: row.read ? theme.card : theme.unreadBg,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.iconWell,
        }}
      >
        <Text style={{ fontSize: 20 }}>{row.emoji ?? '🔔'}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              flex: 1,
              color: theme.text,
              fontFamily: row.read ? FONTS.sansMedium : FONTS.sansSemiBold,
              fontSize: 14,
            }}
            numberOfLines={2}
          >
            {row.title}
          </Text>
          {!row.read ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand }} />
          ) : null}
        </View>

        {row.body ? (
          <Text
            style={{ marginTop: 3, color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 17 }}
            numberOfLines={2}
          >
            {row.body}
          </Text>
        ) : null}

        <Text style={{ marginTop: 6, color: theme.dim, fontFamily: FONTS.sans, fontSize: 11 }}>
          {formatNotificationDate(row.created_at)}
        </Text>
      </View>
    </PressableSurface>
  );
});

export default function NotificationsScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingNotificationOperation[]>([]);
  const userIdRef = useRef<string | null>(null);
  // Set by load() when the cache-hit branch actually painted -- read by
  // the mount effect's telemetry after the promise settles.
  const routeOpenCacheHitRef = useRef(false);
  const retryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearRetryTimer = useCallback((id: string) => {
    const timer = retryTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      retryTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => () => {
    retryTimersRef.current.forEach((timer) => clearTimeout(timer));
    retryTimersRef.current.clear();
  }, []);

  // Mutable mirror of pendingOperations for use inside attemptOperation's
  // closures without re-creating the callback on every state change (it's
  // referenced from setTimeout callbacks that can fire long after the
  // render that scheduled them).
  const pendingOperationsRef = useRef<PendingNotificationOperation[]>([]);
  useEffect(() => {
    pendingOperationsRef.current = pendingOperations;
  }, [pendingOperations]);

  // Runs one queued action against the server. Mark-read/mark-all-read go
  // through Supabase directly (no HTTP status to classify), so any thrown
  // error there is treated as retryable -- a bounded cost (RETRY_BACKOFF_MS
  // has 4 stages before giving up), simpler than trying to distinguish a
  // permission error from a network blip from a PostgrestError. Clear goes
  // through apiFetch and throws HttpError, so it gets the full 429/5xx/4xx
  // classification.
  const attemptOperation = useCallback(async (op: PendingNotificationOperation) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const settle = async (next: PendingNotificationOperation[]) => {
      setPendingOperations(next);
      await writePendingNotificationOperations(uid, next);
    };

    try {
      if (op.action.kind === 'mark_read') {
        await markNotificationRead(op.action.notificationId);
      } else if (op.action.kind === 'mark_all_read') {
        await markAllNotificationsRead(op.action.notificationIds);
      } else {
        await clearNotifications();
      }
      clearRetryTimer(op.id);
      await settle(pendingOperationsRef.current.filter((item) => item.id !== op.id));
      recordMutationRetryOutcome({ kind: 'authenticated', userId: uid }, 'notifications', 'success', op.attempts);
    } catch (error) {
      const outcome = error instanceof HttpError
        ? classifyFailure(error.status, error.retryAfterHeader)
        : ({ kind: 'retry', afterMs: nextBackoffMs(op.attempts) ?? 0 } as const);

      if (outcome.kind === 'retry') {
        const attempts = op.attempts + 1;
        const backoff = nextBackoffMs(op.attempts);
        if (backoff === null) {
          const failed = { ...op, attempts, status: 'failed' as const };
          await settle(pendingOperationsRef.current.map((item) => (item.id === op.id ? failed : item)));
          recordMutationRetryOutcome({ kind: 'authenticated', userId: uid }, 'notifications', 'permanent_failure', attempts);
          return;
        }
        const next = { ...op, attempts, nextAttemptAt: Date.now() + backoff, status: 'pending' as const };
        await settle(pendingOperationsRef.current.map((item) => (item.id === op.id ? next : item)));
        clearRetryTimer(op.id);
        retryTimersRef.current.set(op.id, setTimeout(() => { void attemptOperation(next); }, backoff));
        recordMutationRetryOutcome({ kind: 'authenticated', userId: uid }, 'notifications', 'retry', attempts);
        return;
      }

      const failed = { ...op, attempts: op.attempts + 1, status: 'failed' as const };
      await settle(pendingOperationsRef.current.map((item) => (item.id === op.id ? failed : item)));
      recordMutationRetryOutcome({ kind: 'authenticated', userId: uid }, 'notifications', 'permanent_failure', failed.attempts);
    }
  }, [clearRetryTimer]);

  const queueOperation = useCallback((action: NotificationOutboxAction) => {
    const op: PendingNotificationOperation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      status: 'pending',
    };
    setPendingOperations((current) => {
      const next = [...current, op];
      pendingOperationsRef.current = next;
      if (userIdRef.current) void writePendingNotificationOperations(userIdRef.current, next);
      return next;
    });
    void attemptOperation(op);
  }, [attemptOperation]);

  const retryFailedOperations = useCallback(() => {
    pendingOperations.filter((op) => op.status === 'failed').forEach((op) => {
      const retried = { ...op, status: 'pending' as const };
      setPendingOperations((current) => current.map((item) => (item.id === op.id ? retried : item)));
      void attemptOperation(retried);
    });
  }, [pendingOperations, attemptOperation]);

  const discardFailedOperations = useCallback(() => {
    const uid = userIdRef.current;
    const failedClears = pendingOperations.filter((op) => op.status === 'failed' && op.action.kind === 'clear');
    // If a clear permanently failed and is being discarded, restore
    // whatever the list looked like right before that optimistic clear --
    // otherwise the user is left staring at an empty inbox that was never
    // actually cleared server-side.
    if (failedClears.length > 0) {
      const lastClear = failedClears[failedClears.length - 1];
      if (lastClear.action.kind === 'clear') {
        setNotifications(lastClear.action.previousSnapshot);
        if (uid) void writeNotificationsCache(uid, lastClear.action.previousSnapshot);
      }
    }
    setPendingOperations((current) => {
      const next = current.filter((op) => op.status !== 'failed');
      pendingOperationsRef.current = next;
      if (uid) void writePendingNotificationOperations(uid, next);
      return next;
    });
  }, [pendingOperations]);

  const theme = useMemo(
    () => ({
      bg: isDark ? COLORS.darkBg : COLORS.creamBg,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.borderDark : COLORS.borderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      iconWell: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight,
      unreadBg: COLORS.selectionWellSelected,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
    }),
    [isDark]
  );

  // Stale-while-revalidate: a cache hit paints the list instantly (no
  // skeleton), then a background fetch reconciles it -- same pattern as
  // Home/Mandali's own disk caches. The cache is also what Home's bell
  // badge reads (lib/notificationsCache.ts), so a mark-read/clear done
  // here is visible there without Home needing its own extra round trip.
  const load = useCallback(async (options: { skipCache?: boolean } = {}) => {
    setLoadError(false);

    if (await isGuestMode()) {
      // A notification inbox is inherently tied to an account — nothing
      // generic to show, so land on a "sign in to continue" empty state
      // instead of hitting Supabase and hard-redirecting to login.
      setIsGuest(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    setUserId(user.id);
    userIdRef.current = user.id;

    if (!options.skipCache) {
      const cached = await readNotificationsCache(user.id);
      if (cached) {
        setNotifications(cached.notifications);
        setLoading(false);
        routeOpenCacheHitRef.current = true;
        // Recovery after restart: resume whatever the outbox was mid-retry
        // on when the app was last closed. Only 'pending' entries auto-
        // resume; 'failed' waits for an explicit Retry tap, same split as
        // Settings' outbox.
        const resumable = cached.pendingOperations.filter((op) => op.status === 'pending');
        setPendingOperations(cached.pendingOperations);
        pendingOperationsRef.current = cached.pendingOperations;
        resumable.forEach((op) => { void attemptOperation(op); });
      }
    }

    const rows = await fetchNotifications(user.id);
    setNotifications(rows);
    await writeNotificationsCache(user.id, rows);
  }, [router, attemptOperation]);

  useEffect(() => {
    const startedAt = Date.now();
    routeOpenCacheHitRef.current = false;
    const run = async () => {
      try {
        await load();
        if (userIdRef.current) {
          recordRouteOpen(
            { kind: 'authenticated', userId: userIdRef.current },
            'notifications',
            { cacheHit: routeOpenCacheHitRef.current, durationMs: Date.now() - startedAt }
          );
        }
      } catch {
        setLoadError(true);
        if (userIdRef.current) {
          recordRefreshFailure({ kind: 'authenticated', userId: userIdRef.current }, 'notifications');
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [load]);

  // Resume on foreground -- per the agreed retry policy, retries happen
  // when the app is actually in front with network available, never via
  // unbounded background timers iOS would kill anyway.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !userIdRef.current) return;
      pendingOperationsRef.current.filter((op) => op.status === 'pending').forEach((op) => {
        void attemptOperation(op);
      });
    });
    return () => subscription.remove();
  }, [attemptOperation]);

  // Live updates while the inbox is actually open — see
  // lib/notificationsData.ts's subscribeToNotifications comment for why
  // this isn't mounted globally.
  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToNotifications(userId, () => {
      void load({ skipCache: true });
    });
  }, [userId, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ skipCache: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const unreadCount = notifications.filter((row) => !row.read).length;

  const handleRowPress = useCallback(
    async (row: NotificationRow) => {
      try {
        void Haptics.selectionAsync();
      } catch {}

      if (!row.read) {
        setNotifications((current) => current.map((item) => (item.id === row.id ? { ...item, read: true } : item)));
        if (userId) {
          void patchNotificationsCache(userId, (current) =>
            current.map((item) => (item.id === row.id ? { ...item, read: true } : item))
          );
        }
        // Queued through the durable outbox instead of a fire-and-forget
        // catch -- a failed mark-read now retries (2s/10s/60s/5m) and
        // survives an app restart, rather than being silently dropped.
        queueOperation({ kind: 'mark_read', notificationId: row.id });
      }

      if (row.action_url) {
        const route = resolveNativeRoute(row.action_url, '/notifications');
        if (route !== '/notifications') {
          router.push(route as Href);
        }
      }
    },
    [router, userId, queueOperation]
  );

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((row) => !row.read).map((row) => row.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    if (userId) {
      void patchNotificationsCache(userId, (current) => current.map((item) => ({ ...item, read: true })));
    }
    queueOperation({ kind: 'mark_all_read', notificationIds: unreadIds });
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setMarkingAll(false);
  }, [notifications, userId, queueOperation]);

  const handleClearAll = useCallback(() => {
    if (notifications.length === 0 || clearingAll) return;

    Alert.alert(
      'Clear notifications?',
      'This removes all messages from your notification bell. New reminders will still appear here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setClearingAll(true);
            const previous = notifications;
            setNotifications([]);
            if (userId) void writeNotificationsCache(userId, []);
            queueOperation({ kind: 'clear', previousSnapshot: previous });
            setClearingAll(false);
          },
        },
      ]
    );
  }, [clearingAll, notifications, userId, queueOperation]);

  const renderNotification = useCallback(
    ({ item }: { item: NotificationRow }) => (
      <NotificationListRow row={item} theme={theme} onPress={handleRowPress} />
    ),
    [handleRowPress, theme]
  );

  const listHeader = (
    <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton variant="glass" />

          <PressableSurface
            haptic="selection"
            onPress={() => router.push('/settings')}
            accessibilityLabel="Notification settings"
            hitSlop={10}
            style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="settings" size={18} color={theme.dim} />
          </PressableSurface>
        </View>

        {/* Explicit failure state for the outbox -- never an indefinite
            spinner or a silently-dropped mutation past the last retry. */}
        {pendingOperations.some((op) => op.status === 'failed') ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderRadius: RADII.md,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
              backgroundColor: COLORS.dangerBg,
              paddingVertical: 10,
              paddingHorizontal: 14,
            }}
          >
            <Feather name="alert-circle" size={15} color={COLORS.danger} />
            <Text style={{ ...TYPE.caption, color: COLORS.danger, flex: 1 }}>Could not sync some actions</Text>
            <PressableSurface haptic="selection" onPress={retryFailedOperations} style={{ minHeight: 0 }}>
              <Text style={{ ...TYPE.label, fontSize: 12.5, color: COLORS.danger, textDecorationLine: 'underline' }}>Retry</Text>
            </PressableSurface>
            <PressableSurface haptic="selection" onPress={discardFailedOperations} style={{ minHeight: 0 }}>
              <Text style={{ ...TYPE.label, fontSize: 12.5, color: theme.dim, textDecorationLine: 'underline' }}>Discard</Text>
            </PressableSurface>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ ...TYPE.screenTitle, color: theme.text }}>Notifications</Text>
            {unreadCount > 0 ? (
              <View
                style={{
                  minWidth: 24,
                  height: 22,
                  borderRadius: 11,
                  paddingHorizontal: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.brand,
                }}
              >
                <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{unreadCount}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {unreadCount > 0 ? (
              <PressableSurface
                haptic="selection"
                onPress={() => {
                  void handleMarkAllRead();
                }}
                disabled={markingAll}
                accessibilityLabel="Mark all read"
                hitSlop={8}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                  Mark read
                </Text>
              </PressableSurface>
            ) : null}

            {notifications.length > 0 ? (
              <PressableSurface
                haptic="selection"
                onPress={handleClearAll}
                disabled={clearingAll}
                accessibilityLabel="Clear notifications"
                hitSlop={8}
                style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' }}
              >
                <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>
                  {clearingAll ? 'Clearing...' : 'Clear'}
                </Text>
              </PressableSurface>
            ) : null}
          </View>
        </View>
    </View>
  );

  const listEmpty = loading ? (
    <View style={{ gap: 10 }}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  ) : isGuest ? (
    <EmptyState
      icon="bell"
      title="Sign in to see your notifications"
      subtitle="Festival alerts & practice milestones are saved to your account."
      ctaLabel="Sign in"
      onCta={() => {
        void setGuestMode(false).then(() => router.replace('/(auth)/login'));
      }}
    />
  ) : loadError ? (
    <EmptyState
      icon="wifi-off"
      title="Could not load notifications"
      subtitle="Check your connection and try again."
      ctaLabel="Retry"
      onCta={() => {
        setLoading(true);
        load()
          .catch(() => setLoadError(true))
          .finally(() => setLoading(false));
      }}
    />
  ) : (
    <EmptyState
      icon="bell"
      title="All quiet"
      subtitle="Festival alerts & practice milestones show up here."
      ctaLabel="Manage alerts"
      onCta={() => {
        router.push('/settings');
      }}
    />
  );

  const listFooter = (
    <View style={{ gap: 12 }}>
        <PressableSurface
          haptic="selection"
          accessibilityRole="link"
          onPress={() => router.push('/settings')}
          accessibilityLabel="Manage notification settings"
          style={{ minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
        >
          <Text style={{ color: theme.dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
            Manage notification settings
          </Text>
        </PressableSurface>

        {refreshing ? <ActivityIndicator color={theme.brand} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FlatList
        data={loading || loadError ? [] : notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 20, paddingBottom: 36, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}
