import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { supabase } from '@/lib/supabase';
import { spiritualDate } from '@/lib/spiritualDate';
import {
  SankalpaCoordinator,
  type SankalpaRow,
  type HomeAuthIdentity,
  type SankalpaStatus,
} from '@/lib/homeCoordinator';
import { queueSankalpaCheckin, resumePendingSankalpaCheckins, hasFailedSankalpaCheckin, retryFailedSankalpaCheckins } from '@/lib/sankalpaOutbox';

export type { SankalpaRow };

function todayUtcString(timezone?: string): string {
  return spiritualDate(timezone ?? 'UTC');
}

function buildDayNumber(startDate: string, today: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  if (isNaN(start) || isNaN(current)) return 1;
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export type SankalpaCardProps = {
  userId?: string;
  isGuest?: boolean;
  identity?: HomeAuthIdentity;
  timezone?: string;
  initialSankalpa?: SankalpaRow | null;
};

export function SankalpaCard({
  userId: propUserId,
  isGuest: propIsGuest,
  identity: propIdentity,
  timezone: propTimezone,
  initialSankalpa,
}: SankalpaCardProps = {}) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(
    () => ({
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      glass: isDark ? COLORS.premiumGlassDark : COLORS.premiumGlassLight,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
      ring: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
    }),
    [isDark]
  );

  const [status, setStatus] = useState<SankalpaStatus>(
    propIsGuest || propIdentity?.kind === 'guest'
      ? 'hidden'
      : initialSankalpa !== undefined
      ? 'ready'
      : 'loading'
  );
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(initialSankalpa ?? null);
  const [checkedToday, setCheckedToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinFailed, setCheckinFailed] = useState(false);
  const resolvedUserIdRef = useRef<string | null>(null);

  const coordinatorRef = useRef<SankalpaCoordinator | null>(null);
  if (!coordinatorRef.current) {
    coordinatorRef.current = new SankalpaCoordinator(
      {
        fetchApi: apiFetch,
        onSetStatus: (s) => setStatus(s),
        onSetSankalpa: (sk) => setSankalpa(sk),
        onSetCheckedToday: (c) => setCheckedToday(c),
        getTimezone: () => propTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      initialSankalpa
    );
  }

  // Synchronize authoritative initialSankalpa changes from parent
  useEffect(() => {
    if (initialSankalpa !== undefined && coordinatorRef.current) {
      coordinatorRef.current.setInitialSankalpa(initialSankalpa);
    }
  }, [initialSankalpa]);

  const load = useCallback(async () => {
    if (propIsGuest || propIdentity?.kind === 'guest') {
      setStatus('hidden');
      return;
    }

    let identity: HomeAuthIdentity;
    if (propIdentity) {
      identity = propIdentity;
    } else if (propUserId) {
      identity = { kind: 'authenticated', userId: propUserId };
    } else {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      identity = user ? { kind: 'authenticated', userId: user.id } : { kind: 'unauthenticated' };
    }

    if (identity.kind !== 'authenticated') {
      setStatus('hidden');
      return;
    }
    resolvedUserIdRef.current = identity.userId;

    if (coordinatorRef.current) {
      await coordinatorRef.current.load(identity);
    }

    // Resume on mount (cold start) -- a killed app loses any in-memory
    // retry state, so a queued-but-not-yet-confirmed check-in from a
    // previous session needs to resume here, not wait for another tap.
    // Re-load afterward so checkedToday reflects server truth regardless
    // of whether the resume just landed a check-in that predates this
    // mount's own coordinator.load() call above.
    void resumePendingSankalpaCheckins(identity.userId, apiFetch).then(() => {
      void coordinatorRef.current?.load(identity);
    });
    if (sankalpa?.id) {
      hasFailedSankalpaCheckin(identity.userId, sankalpa.id).then(setCheckinFailed).catch(() => {});
    }
  }, [propIdentity, propIsGuest, propUserId, sankalpa?.id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const handleCheckIn = useCallback(async () => {
    if (!sankalpa || checkedToday || checkingIn) return;
    const userId = resolvedUserIdRef.current;
    if (!userId) return;
    setCheckingIn(true);
    setCheckedToday(true);
    setCheckinFailed(false);
    try {
      // queueSankalpaCheckin persists to the durable outbox before
      // attempting, so even if this exact call never resolves (app killed
      // mid-request), the check-in resumes on next launch instead of being
      // silently lost -- and the backend's own upsert means a retry can
      // never create a duplicate check-in for today.
      await queueSankalpaCheckin(userId, sankalpa.id, apiFetch);
      const stillFailed = await hasFailedSankalpaCheckin(userId, sankalpa.id);
      if (stillFailed) {
        // Previously: silently reverted the optimistic checkmark with zero
        // explanation. Now surfaces an explicit failed state with Retry,
        // matching the "never a silent revert" discipline applied to
        // Settings/Notifications/Mood this session.
        setCheckedToday(false);
        setCheckinFailed(true);
        return;
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } finally {
      setCheckingIn(false);
    }
  }, [checkedToday, checkingIn, sankalpa]);

  const handleRetryCheckIn = useCallback(async () => {
    const userId = resolvedUserIdRef.current;
    if (!userId || checkingIn) return;
    setCheckingIn(true);
    setCheckedToday(true);
    try {
      await retryFailedSankalpaCheckins(userId, apiFetch);
      const stillFailed = sankalpa ? await hasFailedSankalpaCheckin(userId, sankalpa.id) : false;
      setCheckinFailed(stillFailed);
      setCheckedToday(!stillFailed);
      if (!stillFailed) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, sankalpa]);

  // Resume on foreground -- per the agreed retry policy, retries happen
  // when the app is actually in front with network available, never via
  // unbounded background timers.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const userId = resolvedUserIdRef.current;
      if (!userId) return;
      void resumePendingSankalpaCheckins(userId, apiFetch).then(() => {
        void coordinatorRef.current?.load(propIdentity ?? { kind: 'authenticated', userId });
      });
    });
    return () => subscription.remove();
  }, [propIdentity]);

  if (status === 'hidden') {
    return null;
  }

  if (status === 'loading') {
    return <SkeletonRow style={{ marginTop: 0 }} />;
  }

  if (status === 'error') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Couldn't load your Sankalpa. Tap to retry."
        onPress={() => {
          load().catch(() => {});
        }}
        style={{
          minHeight: 58,
          borderRadius: 22,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        }}
      >
        <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 12.5, color: theme.dim }}>
          Couldn&apos;t load your Sankalpa.
        </Text>
        <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 12.5 }}>Retry</Text>
      </Pressable>
    );
  }

  if (!sankalpa) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set your Sankalpa"
        onPress={() => router.push('/sankalpa')}
        style={{
          minHeight: 58,
          borderRadius: 22,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Feather name="sun" size={16} color={theme.brand} />
          </View>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, lineHeight: 19, color: theme.text, flex: 1 }} numberOfLines={1}>
            Set your Sankalpa for this month
          </Text>
        </View>
        <Feather name="arrow-right" size={18} color={theme.brand} />
      </Pressable>
    );
  }

  const today = todayUtcString(propTimezone);
  const startDate = sankalpa.start_date ?? sankalpa.startDate ?? today;
  const day = buildDayNumber(startDate, today);
  const targetDays = sankalpa.target_days ?? sankalpa.target_count ?? 0;
  const progress = targetDays > 0 ? clampProgress(day / targetDays) : 0;
  const sankalpaText = sankalpa.text ?? sankalpa.sankalpa_text ?? '';

  return (
    <View
      style={{
        minHeight: 64,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: checkedToday ? theme.soft : theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        opacity: checkedToday ? 0.88 : 1,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          checkedToday
            ? `View Sankalpa: ${sankalpaText}. Honoured today`
            : `View Sankalpa: ${sankalpaText}. Day ${Math.min(day, targetDays || day)} of ${targetDays}`
        }
        accessibilityHint="Navigates to Sankalpa screen"
        onPress={() => router.push('/sankalpa')}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
          minWidth: 0,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Feather name="sun" size={16} color={theme.brand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, lineHeight: 19, color: theme.text }} numberOfLines={1}>
            {sankalpaText}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Text style={{ ...TYPE.caption, color: checkinFailed ? COLORS.danger : theme.dim }} numberOfLines={1}>
              {checkinFailed
                ? 'Could not check in · Tap to retry'
                : checkedToday
                  ? 'Honoured today · View Sankalpa'
                  : `Day ${Math.min(day, targetDays || day)} of ${targetDays}`}
            </Text>
            <Feather name="chevron-right" size={12} color={theme.dim} style={{ opacity: 0.6 }} />
          </View>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <ProgressRing progress={progress} done={progress >= 1} color={theme.brand} track={theme.ring} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={checkinFailed ? 'Retry check-in' : checkedToday ? 'Sankalpa honoured today' : 'Honour today'}
          accessibilityState={{ disabled: (checkedToday && !checkinFailed) || checkingIn }}
          onPress={() => {
            if (checkinFailed) {
              void handleRetryCheckIn();
            } else {
              void handleCheckIn();
            }
          }}
          disabled={(checkedToday && !checkinFailed) || checkingIn}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: checkedToday ? `${theme.brand}22` : theme.brand,
            borderWidth: checkedToday ? 1 : 0,
            borderColor: `${theme.brand}4d`,
          }}
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color={isDark ? COLORS.darkBg : COLORS.creamBg} />
          ) : (
            <Feather
              name={checkedToday ? 'check-circle' : 'check'}
              size={checkedToday ? 16 : 14}
              color={checkedToday ? theme.brand : isDark ? COLORS.darkBg : COLORS.creamBg}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
