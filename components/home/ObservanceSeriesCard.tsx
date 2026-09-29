import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import type { ObservanceSeries, ObservanceSeriesChild } from '@/lib/observance-series-contract.generated';
import {
  getNativeSeriesCardChildren,
  getNativeSeriesCardCopy,
  getSafeNativeEditorialCopy,
  getSafeNativeSeriesName,
  nativeCalendarDayDistance,
} from '@/lib/observance-series-card-helpers';
import { resolveSeriesChildSlug } from '@/lib/observance-series-content';
import { resolveNativeRoute } from '@/lib/routes';
import { SACRED_DAYS_CARD_HEIGHT } from '@/lib/sacred-days-deck';

type Theme = {
  card: string;
  border: string;
  premiumBorder: string;
  text: string;
  dim: string;
  brand: string;
};

function daysBadgeLabel(daysLeft: number | undefined | null, lang: 'en' | 'hi' | 'pa'): string {
  const copy = getNativeSeriesCardCopy(lang);
  if (typeof daysLeft !== 'number' || Number.isNaN(daysLeft)) return copy.today;
  if (daysLeft === 0) return copy.today;
  if (daysLeft === 1) return copy.tomorrow;
  return copy.inDays(daysLeft);
}

export function ObservanceSeriesCard({
  series,
  child,
  theme,
  isDark,
  lang = 'en',
  spiritualDate,
}: {
  series: ObservanceSeries;
  child?: ObservanceSeriesChild;
  theme: Theme;
  isDark: boolean;
  lang?: 'en' | 'hi' | 'pa';
  spiritualDate: string;
}) {
  const router = useRouter();
  const targetChildren = getNativeSeriesCardChildren(series);
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  // Falls back to the canonical themeColor() mapping rather than
  // re-deriving isDark ? COLORS.X : COLORS.Y inline, so this can never
  // drift out of sync with that single source of truth.
  const cardTextColor = theme?.text ?? themeColor(isDark).text;
  const cardDimColor = theme?.dim ?? themeColor(isDark).dim;
  const cardBorderColor = theme?.premiumBorder ?? themeColor(isDark).premiumBorder;
  const copy = getNativeSeriesCardCopy(lang);
  const context = { calendarProfile: series.profile.calendar, tradition: series.tradition };
  const seriesName = getSafeNativeSeriesName(series, lang, context);

  if (series.status === 'under_review' || targetChildren.length === 0) {
    return null;
  }

  const activeChild = child ?? targetChildren[0];
  if (!activeChild) return null;

  const totalCount = series.totalDays ?? series.children.length;
  const targetDate = activeChild.civilDate ?? series.startDate;
  const daysLeft = targetDate ? nativeCalendarDayDistance(spiritualDate, targetDate) ?? 0 : 0;
  const isToday = daysLeft === 0;
  const { title, subtitle, description } = getSafeNativeEditorialCopy(activeChild, lang, context);
  const childSlug = resolveSeriesChildSlug({
    name: activeChild.title,
    routeSlug: activeChild.slug || activeChild.routeSlug,
    date: activeChild.civilDate,
    sequence: activeChild.sequence,
  }) || activeChild.slug || activeChild.routeSlug;
  const href = childSlug ? `/festival/${encodeURIComponent(childSlug)}` : null;
  const iconName: SacredIconName = series.mode === 'daily_journey' ? 'vrat' : 'panchang';
  const isConcluded = series.status === 'concluding' || (activeChild.sequence === totalCount && isToday);
  const statusLine = series.status === 'upcoming'
    ? `${copy.begins} ${daysBadgeLabel(daysLeft, lang)}`
    : isConcluded
      ? copy.concludesToday
      : series.mode === 'daily_journey'
        ? `${copy.dayOf(activeChild.sequence, totalCount)}${subtitle ? ` · ${subtitle}` : ''}`
        : copy.dayOf(activeChild.sequence, totalCount);
  const gradient: readonly [string, string] = isDark
    ? [COLORS.navGlassTopDark, COLORS.navGlassBottomDark]
    : [COLORS.navGlassTopLight, COLORS.navGlassBottomLight];
  const badgeTextColor = isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight;

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${seriesName}, ${title}, ${daysBadgeLabel(daysLeft, lang)}${description ? `. ${description}` : ''}`}
      accessibilityHint={href ? copy.learnMore : undefined}
      accessibilityState={{ disabled: !href }}
      disabled={!href}
      onPress={() => {
        if (href) router.push(resolveNativeRoute(href) as Href);
      }}
      style={{
        height: SACRED_DAYS_CARD_HEIGHT,
        borderRadius: RADII.xl,
        borderWidth: 1,
        borderColor: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
        boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
        overflow: 'hidden',
      }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: RADII.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
            borderWidth: 1,
            borderColor: cardBorderColor,
            flexShrink: 0,
          }}
        >
          <SacredIcon name={iconName} fallbackGlyph="sun" size={21} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...TYPE.chip, color: accent }} numberOfLines={1}>{seriesName}</Text>
              <Text style={{ ...TYPE.label, color: cardTextColor, marginTop: 2 }} numberOfLines={1}>{title}</Text>
            </View>
            <View
              style={{
                flexShrink: 0,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: RADII.pill,
                backgroundColor: isToday ? accent : 'transparent',
                borderWidth: isToday ? 0 : 1,
                borderColor: cardBorderColor,
              }}
            >
              <Text style={{ ...TYPE.chip, color: isToday ? badgeTextColor : cardDimColor }}>
                {daysBadgeLabel(daysLeft, lang)}
              </Text>
            </View>
          </View>

          <Text style={{ ...TYPE.caption, color: cardDimColor, marginTop: 2, lineHeight: 15 }} numberOfLines={1}>
            {description ?? statusLine}
          </Text>

          {href ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Text style={{ ...TYPE.chip, color: accent }}>{copy.learnMore}</Text>
              <Feather name="arrow-right" size={13} color={accent} />
            </View>
          ) : null}
        </View>
      </View>
    </PressableSurface>
  );
}
