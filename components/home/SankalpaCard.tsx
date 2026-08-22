import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
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

    if (coordinatorRef.current) {
      await coordinatorRef.current.load(identity);
    }
  }, [propIdentity, propIsGuest, propUserId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const handleCheckIn = useCallback(async () => {
    if (!sankalpa || checkedToday || checkingIn) return;
    setCheckingIn(true);
    const previous = checkedToday;
    setCheckedToday(true);
    try {
      const response = await apiFetch('/api/sankalpa/checkin', {
        method: 'POST',
        body: JSON.stringify({ sankalpa_id: sankalpa.id }),
      });
      if (!response.ok) throw new Error('check-in-failed');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch {
      setCheckedToday(previous);
    } finally {
      setCheckingIn(false);
    }
  }, [checkedToday, checkingIn, sankalpa]);

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
        opacity: checkedToday ? 0.72 : 1,
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, lineHeight: 19, color: theme.text }} numberOfLines={1}>
            {sankalpaText}
          </Text>
          <Text style={{ marginTop: 1, ...TYPE.caption, color: theme.dim }} numberOfLines={1}>
            {checkedToday ? 'Honoured today' : `Day ${Math.min(day, targetDays || day)} of ${targetDays}`}
          </Text>
        </View>
      </View>

      <ProgressRing progress={progress} done={progress >= 1} color={theme.brand} track={theme.ring} />

      <PressableSurface
        haptic="none"
        accessibilityLabel={checkedToday ? 'Sankalpa honoured today' : 'Mark today honoured'}
        onPress={() => {
          void handleCheckIn();
        }}
        disabled={checkedToday || checkingIn}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checkedToday ? `${theme.brand}22` : theme.brand,
          borderWidth: checkedToday ? 1 : 0,
          borderColor: `${theme.brand}4d`,
          minHeight: 0,
        }}
      >
        <Feather
          name={checkedToday ? 'check-circle' : 'check'}
          size={checkedToday ? 16 : 14}
          color={checkedToday ? theme.brand : isDark ? COLORS.darkBg : COLORS.creamBg}
        />
      </PressableSurface>
    </View>
  );
}
