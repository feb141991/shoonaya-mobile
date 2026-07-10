import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';

/**
 * SankalpaCard — self-contained Home row for the active Sankalpa.
 *
 * Native port of the PWA's src/components/home/SankalpaBanner.tsx, following
 * the same self-fetching pattern MoodCheckin.tsx already established on this
 * screen (own loading/error state, own apiFetch calls) rather than reading
 * from /api/native/home-summary's `sankalpa` field — that field has no
 * "checked in today" flag, and duplicating a second Sankalpa summary shape
 * into home-summary just to add one boolean was less consistent with this
 * repo's existing convention than giving Home a self-contained card, same as
 * mood.
 *
 * Refetches on every screen focus (not just mount) so a check-in or
 * completion made on the full /sankalpa screen is reflected on Home the
 * moment the user navigates back — no app restart required.
 *
 * Matches PWA behaviour: Home offers Set + Check-in only. PWA's own
 * SankalpaBanner accepts an onComplete prop but never renders a control that
 * calls it (confirmed by reading the component) — completion in PWA only
 * happens from the fuller My Progress page. Native mirrors that: "Mark
 * complete" lives on the /sankalpa screen, not here.
 */

type SankalpaRow = {
  id: string;
  text: string;
  start_date: string;
  target_days: number | null;
};

type Status = 'loading' | 'ready' | 'error';

function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDayNumber(startDate: string, today: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ProgressRing({ progress, done, color, track }: { progress: number; done: boolean; color: string; track: string }) {
  const size = 30;
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={2.5} />
        {done || clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${clamped * circumference} ${circumference}`}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      {done ? <Feather name="check" size={13} color={color} /> : null}
    </View>
  );
}

export function SankalpaCard() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(
    () => ({
      soft: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
      card: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
      border: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
      text: isDark ? COLORS.creamBg : COLORS.ink,
      dim: isDark ? COLORS.textDimDark : COLORS.textDimLight,
      brand: isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight,
      ring: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
    }),
    [isDark]
  );

  const [status, setStatus] = useState<Status>('loading');
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(null);
  const [checkedToday, setCheckedToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await apiFetch('/api/sankalpa');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as { sankalpa: SankalpaRow | null };
      setSankalpa(payload.sankalpa ?? null);

      if (payload.sankalpa) {
        const checkinRes = await apiFetch(`/api/sankalpa/checkin?sankalpa_id=${encodeURIComponent(payload.sankalpa.id)}`);
        if (checkinRes.ok) {
          const checkinPayload = (await checkinRes.json()) as { checkins?: string[] };
          setCheckedToday((checkinPayload.checkins ?? []).includes(todayUtcString()));
        } else {
          setCheckedToday(false);
        }
      } else {
        setCheckedToday(false);
      }
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // useFocusEffect alone covers both the initial mount (Home is focused
  // immediately on first render) and every subsequent return to Home — e.g.
  // after the user checks in or completes on the full /sankalpa screen and
  // navigates back — without a redundant extra fetch from a separate
  // mount-only useEffect.
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
          minHeight: 72,
          borderRadius: 18,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: theme.dim }}>
          Couldn&apos;t load your Sankalpa.
        </Text>
        <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
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
          minHeight: 72,
          borderRadius: 18,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.soft,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <Feather name="sun" size={19} color={theme.brand} />
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.text }}>
            Set your Sankalpa for this month
          </Text>
        </View>
        <Feather name="arrow-right" size={20} color={theme.brand} />
      </Pressable>
    );
  }

  const today = todayUtcString();
  const day = buildDayNumber(sankalpa.start_date, today);
  const targetDays = sankalpa.target_days ?? 0;
  const progress = targetDays > 0 ? clampProgress(day / targetDays) : 0;

  return (
    <View
      style={{
        minHeight: 72,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.soft,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sankalpa, day ${day} of ${targetDays}. Open Sankalpa.`}
        onPress={() => router.push('/sankalpa')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}
      >
        <Feather name="sun" size={19} color={theme.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.text }} numberOfLines={1}>
            {sankalpa.text}
          </Text>
          <Text style={{ marginTop: 3, fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
            Day {Math.min(day, targetDays || day)} of {targetDays}
          </Text>
        </View>
      </Pressable>

      <ProgressRing progress={progress} done={progress >= 1} color={theme.brand} track={theme.ring} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={checkedToday ? 'Sankalpa honoured today' : 'Mark today honoured'}
        onPress={() => {
          void handleCheckIn();
        }}
        disabled={checkedToday || checkingIn}
        hitSlop={6}
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
        <Feather
          name={checkedToday ? 'check-circle' : 'check'}
          size={checkedToday ? 18 : 16}
          color={checkedToday ? theme.brand : isDark ? COLORS.darkBg : COLORS.creamBg}
        />
      </Pressable>
    </View>
  );
}
