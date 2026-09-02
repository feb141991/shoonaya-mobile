import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE } from '@/lib/constants';
import {
  clearNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type NotificationRow,
} from '@/lib/notificationsData';
import { readNotificationsCache, writeNotificationsCache, patchNotificationsCache } from '@/lib/notificationsCache';
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

    if (!options.skipCache) {
      const cached = await readNotificationsCache(user.id);
      if (cached) {
        setNotifications(cached.notifications);
        setLoading(false);
      }
    }

    const rows = await fetchNotifications(user.id);
    setNotifications(rows);
    await writeNotificationsCache(user.id, rows);
  }, [router]);

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [load]);

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
        markNotificationRead(row.id).catch(() => {
          // Best-effort — a failed mark-read shouldn't block navigation, and
          // the next load() will reconcile the true server state anyway.
        });
      }

      if (row.action_url) {
        const route = resolveNativeRoute(row.action_url, '/notifications');
        if (route !== '/notifications') {
          router.push(route as Href);
        }
      }
    },
    [router, userId]
  );

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((row) => !row.read).map((row) => row.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    if (userId) {
      void patchNotificationsCache(userId, (current) => current.map((item) => ({ ...item, read: true })));
    }
    try {
      await markAllNotificationsRead(unreadIds);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch {
      await load({ skipCache: true });
    } finally {
      setMarkingAll(false);
    }
  }, [load, notifications, userId]);

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
            clearNotifications()
              .then(async () => {
                try {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch {}
              })
              .catch((err) => {
                setNotifications(previous);
                if (userId) void writeNotificationsCache(userId, previous);
                Alert.alert(
                  'Could not clear notifications',
                  err instanceof Error ? err.message : 'Check your connection and try again.'
                );
              })
              .finally(() => setClearingAll(false));
          },
        },
      ]
    );
  }, [clearingAll, notifications, userId]);

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
