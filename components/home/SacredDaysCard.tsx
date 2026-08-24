import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';
import { ObservanceSeriesCard } from './ObservanceSeriesCard';
import type { ObservanceSeries } from '@/lib/observance-series-contract.generated';
import {
  getNativeSeriesCardChildren,
  getNativeSeriesCardCopy,
  getNativeSeriesCardDayDistance,
} from '@/lib/observance-series-card-helpers';

export type ObservanceEntryLike = {
  name: string;
  emoji: string | null;
  daysLeft: number;
  routeKind: string;
  routeSlug: string;
  href: string;
  label: string;
  monthLabel?: string | null;
  description?: string | null;
};

type Theme = {
  card: string;
  border: string;
  premiumBorder: string;
  text: string;
  dim: string;
  brand: string;
};

const ROUTE_ICON: Partial<Record<string, SacredIconName>> = {
  vrat: 'vrat',
  festival: 'panchang',
};

function daysBadgeLabel(daysLeft: number, lang: 'en' | 'hi' | 'pa'): string {
  const copy = getNativeSeriesCardCopy(lang);
  if (daysLeft === 0) return copy.today;
  if (daysLeft === 1) return copy.tomorrow;
  return copy.inDays(daysLeft);
}

export function SacredDaysCard({
  entry,
  series,
  theme,
  isDark,
  lang = 'en',
  spiritualDate,
}: {
  entry?: ObservanceEntryLike | null;
  series?: ObservanceSeries[] | null;
  theme: Theme;
  isDark: boolean;
  lang?: 'en' | 'hi' | 'pa';
  spiritualDate: string;
}) {
  // CRITICAL: Hooks called unconditionally before ANY branching
  const router = useRouter();

  // Keep the Native spotlight aligned with Home's established three-day
  // window and let the nearest resolved observance win.
  const relevantSeries = (series ?? [])
    .map(candidate => ({
      candidate,
      days: getNativeSeriesCardDayDistance(candidate, spiritualDate),
    }))
    .filter(({ candidate, days }) =>
      days !== null
      && days >= 0
      && days <= 3
      && (candidate.status === 'under_review' || getNativeSeriesCardChildren(candidate).length > 0),
    )
    .sort((a, b) => a.days! - b.days!);
  const publishableSeries = relevantSeries.find(({ candidate }) => candidate.status !== 'under_review');
  const reviewSeries = relevantSeries.find(({ candidate }) => candidate.status === 'under_review');
  const shouldPreferSeries = Boolean(
    publishableSeries
    && (!entry || publishableSeries.days! <= entry.daysLeft),
  );
  const activeSeries = shouldPreferSeries
    ? publishableSeries!.candidate
    : (!entry ? reviewSeries?.candidate ?? null : null);

  if (activeSeries) {
    return (
      <ObservanceSeriesCard
        series={activeSeries}
        theme={theme}
        isDark={isDark}
        lang={lang}
        spiritualDate={spiritualDate}
      />
    );
  }

  // 2. Fallback to single-observance spotlight card if present
  if (!entry) return null;

  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const iconName = ROUTE_ICON[entry.routeKind] ?? 'panchang';
  const isToday = entry.daysLeft === 0;
  const copy = getNativeSeriesCardCopy(lang);

  const gradient: readonly [string, string] = isDark
    ? [COLORS.navGlassTopDark, COLORS.navGlassBottomDark]
    : [COLORS.navGlassTopLight, COLORS.navGlassBottomLight];
  const ctaTextColor = isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight;

  return (
    <PressableSurface
      haptic="selection"
        accessibilityLabel={`${entry.name}, ${daysBadgeLabel(entry.daysLeft, lang)}${entry.description ? `. ${entry.description}` : ''}`}
      onPress={() => router.push(resolveNativeRoute(entry.href) as Href)}
      style={{
        borderRadius: RADII.xl,
        borderWidth: 1,
        borderColor: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
        boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
        overflow: 'hidden',
      }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: isDark ? COLORS.navGlowGoldDark : COLORS.navGlowGoldLight,
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
          }}
        >
          <SacredIcon name={iconName} fallbackGlyph="sun" size={17} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ ...TYPE.label, color: theme.text, flexShrink: 1 }} numberOfLines={1}>
              {entry.name}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: isToday ? accent : 'transparent',
                borderWidth: isToday ? 0 : 1,
                borderColor: theme.premiumBorder,
              }}
            >
              <Text style={{ ...TYPE.chip, color: isToday ? ctaTextColor : theme.dim }}>
              {daysBadgeLabel(entry.daysLeft, lang)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Text style={{ ...TYPE.caption, color: theme.dim, flexShrink: 1 }} numberOfLines={1}>
              {entry.description ?? (isToday ? 'Observed today' : entry.monthLabel ?? 'Sacred day')}
            </Text>
            <Text style={{ ...TYPE.caption, color: accent, fontFamily: TYPE.label.fontFamily }}>
              {` · ${copy.learnMore}`}
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={accent} />
      </View>
    </PressableSurface>
  );
}
