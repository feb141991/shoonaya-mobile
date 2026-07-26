import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { supabase } from '@/lib/supabase';

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

type Status = 'loading' | 'ready' | 'hidden' | 'error';

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

export function SankalpaCard() {
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

  const [status, setStatus] = useState<Status>('loading');
  const [sankalpa, setSankalpa] = useState<SankalpaRow | null>(null);
  const [checkedToday, setCheckedToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Guests (and any other no-session state) have no Sankalpa to
        // fetch — render nothing instead of hitting the API, getting a
        // 401, and landing in a permanent "Couldn't load — Retry" state
        // that can never succeed. Matches QuizSparkCard's sibling pattern.
        setStatus('hidden');
        return;
      }

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

  const today = todayUtcString();
  const day = buildDayNumber(sankalpa.start_date, today);
  const targetDays = sankalpa.target_days ?? 0;
  const progress = targetDays > 0 ? clampProgress(day / targetDays) : 0;

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
            {sankalpa.text}
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
