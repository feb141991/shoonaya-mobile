import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS } from '@/lib/constants';

/**
 * ObservanceCarousel — swipeable card carousel for upcoming sacred days.
 *
 * Native port of the PWA's src/components/home/VratCarousel.tsx, covering
 * both "Vrat/observance carousel" and "Calendar/Upcoming observances" from
 * the task brief in one component, since PWA itself sources both from the
 * same `/api/calendar/upcoming` endpoint and the same observance shape —
 * splitting them into two native components would mean two fetches of the
 * same data for no product benefit.
 *
 * Reuses `/api/calendar/upcoming?days=..&tradition=..&tz=..` verbatim — the
 * exact route app/panchang.tsx already calls from native (confirmed by
 * reading that screen), so this is zero new backend surface.
 *
 * Card tap routing mirrors the same routeKind convention the
 * `/api/native/home-summary` route already uses for its own single-item
 * `panchang.observance.href` (routeKind === 'vrat' ? '/vrat' : '/panchang'),
 * so this carousel's cards resolve the same way the rest of Home's
 * observance surfacing already does — not an invented second convention.
 */

const WINDOW_DAYS = 14;
const MAX_CARDS = 6;

type Observance = {
  date: string;
  slug: string;
  display_name: string;
  emoji: string;
  description: string;
  kind: 'major' | 'vrat' | 'regional';
  tradition: string;
  route_kind: string | null;
  route_slug: string | null;
};

interface Props {
  tradition: string;
  timezone: string;
}

function daysFromNow(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target.getTime() - d.getTime()) / 86400000);
}

function formatObservanceDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

function observanceHref(o: Observance): '/vrat' | '/panchang' {
  return o.route_kind === 'vrat' ? '/vrat' : '/panchang';
}

const CARD_WIDTH = Math.round(Dimensions.get('window').width - 64);
const CARD_GAP = 12;

export function ObservanceCarousel({ tradition, timezone }: Props) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [observances, setObservances] = useState<Observance[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/calendar/upcoming?days=${WINDOW_DAYS}&tradition=${tradition}&tz=${encodeURIComponent(timezone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { observances?: Observance[] } | null) => {
        if (cancelled) return;
        setObservances(payload?.observances ?? []);
      })
      .catch(() => {
        if (!cancelled) setObservances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tradition, timezone]);

  const upcoming = useMemo(() => {
    if (!observances) return [];
    return observances
      .map((o) => ({ o, days: daysFromNow(o.date) }))
      .filter((x) => x.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, MAX_CARDS);
  }, [observances]);

  const onMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    setActiveIndex(idx);
  }, []);

  const scrollToIndex = useCallback(
    (idx: number) => {
      scrollRef.current?.scrollTo({ x: idx * (CARD_WIDTH + CARD_GAP), animated: !reducedMotion });
      setActiveIndex(idx);
    },
    [reducedMotion]
  );

  // Loading and empty states are both silent (no skeleton, no error banner):
  // this is a below-the-fold enrichment section, not a primary action —
  // showing nothing when there's genuinely nothing upcoming (or the fetch is
  // still in flight) is the correct, non-noisy behaviour, matching how the
  // PWA's own VratCarousel returns null when `upcoming.length === 0`.
  if (!observances || upcoming.length === 0) return null;

  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{
              fontFamily: FONTS.sansSemiBold,
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            Sacred Days
          </Text>
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 6,
              paddingVertical: 1,
              backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 10, color: accent }}>{upcoming.length}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ gap: CARD_GAP }}
      >
        {upcoming.map(({ o, days }) => (
          <PressableSurface
            key={`${o.slug}-${o.date}`}
            accessibilityLabel={`${o.display_name}, ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`}
            onPress={() => router.push(observanceHref(o))}
            style={{
              width: CARD_WIDTH,
              minHeight: 116,
              borderRadius: 20,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
              borderWidth: 1,
              borderColor: isDark ? COLORS.borderDark : COLORS.borderLight,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Text style={{ fontSize: 38 }}>{o.emoji}</Text>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontFamily: FONTS.serifBold, fontSize: 15, color: isDark ? COLORS.creamBg : COLORS.ink }}
                numberOfLines={1}
              >
                {o.display_name}
              </Text>
              <Text
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: 10,
                  marginTop: 2,
                  marginBottom: 4,
                  color: isDark ? COLORS.textDimDark : COLORS.textDimLight,
                }}
              >
                {formatObservanceDate(o.date)}
              </Text>
              {o.description ? (
                <Text
                  style={{
                    fontFamily: FONTS.sans,
                    fontSize: 11,
                    lineHeight: 15,
                    color: isDark ? COLORS.textDimDark : COLORS.textDimLight,
                  }}
                  numberOfLines={2}
                >
                  {o.description}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: days === 0 ? accent : isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.sansSemiBold,
                  fontSize: 9,
                  color: days === 0 ? (isDark ? COLORS.darkBg : COLORS.creamBg) : accent,
                }}
              >
                {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days}d`}
              </Text>
            </View>
          </PressableSurface>
        ))}
      </ScrollView>

      {upcoming.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {upcoming.map((_, i) => (
            <PressableSurface
              key={i}
              haptic="selection"
              accessibilityLabel={`Go to card ${i + 1}`}
              hitSlop={8}
              onPress={() => scrollToIndex(i)}
              style={{ minHeight: 0, justifyContent: 'center' }}
            >
              <View
                style={{
                  height: 6,
                  width: i === activeIndex ? 20 : 6,
                  borderRadius: 999,
                  backgroundColor: i === activeIndex ? accent : isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
                }}
              />
            </PressableSurface>
          ))}
        </View>
      ) : null}
    </View>
  );
}
