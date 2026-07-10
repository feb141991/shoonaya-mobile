import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';

/**
 * BrahmaMuhurtaPrompt — sunrise-aware japa reminder.
 *
 * Native port of the PWA's src/components/home/BrahmaMuhurtaCard.tsx. Reuses
 * the exact same source data: `panchang.brahmaMuhurta` / `panchang.sunrise`,
 * both already computed client-side in app/(tabs)/index.tsx via
 * `calculatePanchang()` from `@sangam/panchang-engine` (same package + same
 * call the PWA's own HomeDashboard makes) — so no API change was needed to
 * ship this card.
 *
 * Simplified vs. PWA for native:
 * - No "Remind me" local-notification scheduling. PWA schedules a browser
 *   Notification via a setTimeout; native's push layer is OneSignal
 *   (server-driven), not a local-notification API already wired into this
 *   screen, and bolting one on is out of scope for a below-fold parity pass.
 *   Only the CTA + dismiss remain.
 * - Dismiss state persisted via AsyncStorage (native's equivalent of the
 *   PWA's localStorage), keyed per calendar date so it resets daily.
 */

type Phase = 'upcoming' | 'active' | null;

interface Props {
  brahmaMuhurta: string; // "4:45 AM – 5:30 AM"
  sunrise: string; // "6:21 AM"
  japaAlreadyDoneToday: boolean;
}

function parseTimeToday(t: string): Date | null {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}

function fmtCountdown(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

const DISMISS_KEY_PREFIX = 'shoonaya-brahma-dismissed-';

function todayKey(): string {
  return DISMISS_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

export function BrahmaMuhurtaPrompt({ brahmaMuhurta, sunrise, japaAlreadyDoneToday }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [phase, setPhase] = useState<Phase>(null);
  const [countdown, setCountdown] = useState('');
  const [dismissed, setDismissed] = useState(true); // start hidden until AsyncStorage check resolves
  const [checked, setChecked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(todayKey())
      .then((value) => {
        if (cancelled) return;
        if (value || japaAlreadyDoneToday) {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [japaAlreadyDoneToday]);

  useEffect(() => {
    if (!checked || dismissed) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    function tick() {
      const now = Date.now();
      const [startStr, endStr] = brahmaMuhurta.split('–').map((s) => s.trim());
      const start = parseTimeToday(startStr);
      const end = parseTimeToday(endStr ?? sunrise);
      if (!start || !end) {
        setPhase(null);
        return;
      }

      const msToStart = start.getTime() - now;
      const msToEnd = end.getTime() - now;

      if (msToEnd < 0) {
        setPhase(null);
      } else if (msToStart <= 0 && msToEnd > 0) {
        setPhase('active');
        setCountdown(`${fmtCountdown(msToEnd)} remaining`);
      } else if (msToStart > 0 && msToStart <= 45 * 60_000) {
        setPhase('upcoming');
        setCountdown(fmtCountdown(msToStart));
      } else {
        setPhase(null);
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checked, dismissed, brahmaMuhurta, sunrise]);

  const dismiss = useCallback(() => {
    void AsyncStorage.setItem(todayKey(), '1');
    setDismissed(true);
  }, []);

  if (!checked || dismissed || !phase || japaAlreadyDoneToday) return null;

  const isActive = phase === 'active';

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: isDark ? `${accent}14` : `${accent}0f`,
          borderWidth: 1,
          borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
            }}
          >
            <Feather name="sunrise" size={16} color={accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: FONTS.sansSemiBold,
                fontSize: 14,
                color: isDark ? COLORS.creamBg : COLORS.ink,
              }}
            >
              {isActive ? 'Brahma Muhurta — sacred window open' : `Brahma Muhurta in ${countdown}`}
            </Text>
            <Text
              style={{
                fontFamily: FONTS.sans,
                fontSize: 11,
                marginTop: 2,
                color: isDark ? COLORS.textDimDark : COLORS.textDimLight,
              }}
            >
              {isActive
                ? `${brahmaMuhurta} · ${countdown} · Optimal japa time`
                : `${brahmaMuhurta} · Ideal for mantra and meditation`}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss Brahma Muhurta reminder"
            hitSlop={10}
            onPress={dismiss}
            style={{
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              marginTop: -10,
              marginRight: -10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather name="x" size={14} color={isDark ? COLORS.textDimDark : COLORS.textDimLight} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Begin Japa"
          onPress={() => router.push('/japa')}
          style={{
            marginTop: 12,
            minHeight: MIN_TOUCH_TARGET,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
              Begin Japa
            </Text>
            <Feather name="chevron-right" size={14} color={isDark ? COLORS.darkBg : COLORS.creamBg} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
