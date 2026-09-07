import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import type { ObservanceSeries, ObservanceSeriesChild } from '@/lib/observance-series-contract.generated';
import {
  getNativeSeriesCardChildren,
  getNativeSeriesCardCopy,
  getNativeSeriesReviewMessage,
  getSafeNativeEditorialCopy,
  getSafeNativeSeriesName,
  nativeCalendarDayDistance,
} from '@/lib/observance-series-card-helpers';
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

function daysBadgeLabel(daysLeft: number, lang: 'en' | 'hi' | 'pa'): string {
  const copy = getNativeSeriesCardCopy(lang);
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
  const warning = isDark ? COLORS.warningDark : COLORS.warningLight;
  const copy = getNativeSeriesCardCopy(lang);
  const context = { calendarProfile: series.profile.calendar, tradition: series.tradition };
  const seriesName = getSafeNativeSeriesName(series, lang, context);

  if (series.status === 'under_review' || targetChildren.length === 0) {
    const reviewMessage = getNativeSeriesReviewMessage(series, lang);
    return (
      <View
        accessibilityLabel={`${seriesName}. ${copy.reviewPending}. ${reviewMessage}`}
        style={{
          height: SACRED_DAYS_CARD_HEIGHT,
          borderRadius: RADII.xl,
          borderWidth: 1,
          borderColor: isDark ? COLORS.warningBorderDark : COLORS.warningBorderLight,
          borderStyle: 'dashed',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: theme.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Feather name="alert-circle" size={20} color={warning} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...TYPE.label, color: theme.text }} numberOfLines={1}>{seriesName}</Text>
          <Text style={{ ...TYPE.chip, color: warning, marginTop: 3 }}>{copy.reviewPending}</Text>
          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 4, lineHeight: 16 }} numberOfLines={2}>
            {reviewMessage}
          </Text>
        </View>
      </View>
    );
  }

  const activeChild = child ?? targetChildren[0];
  if (!activeChild) return null;

  const totalCount = series.totalDays ?? series.children.length;
  const targetDate = activeChild.civilDate ?? series.startDate;
  const daysLeft = targetDate ? nativeCalendarDayDistance(spiritualDate, targetDate) ?? 0 : 0;
  const isToday = daysLeft === 0;
  const { title, subtitle, description } = getSafeNativeEditorialCopy(activeChild, lang, context);
  const href = activeChild.routeKind === 'vrat' && activeChild.routeSlug
    ? `/vrat/${encodeURIComponent(activeChild.routeSlug)}`
    : activeChild.routeKind === 'festival' && activeChild.routeSlug
      ? `/festival/${encodeURIComponent(activeChild.routeSlug)}`
      : null;
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
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: RADII.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
          }}
        >
          <SacredIcon name={iconName} fallbackGlyph="sun" size={21} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...TYPE.chip, color: accent }} numberOfLines={1}>{seriesName}</Text>
              <Text style={{ ...TYPE.label, color: theme.text, marginTop: 2 }} numberOfLines={1}>{title}</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: RADII.pill,
                backgroundColor: isToday ? accent : 'transparent',
                borderWidth: isToday ? 0 : 1,
                borderColor: theme.premiumBorder,
              }}
            >
              <Text style={{ ...TYPE.chip, color: isToday ? badgeTextColor : theme.dim }}>
                {daysBadgeLabel(daysLeft, lang)}
              </Text>
            </View>
          </View>

          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 3, lineHeight: 15 }} numberOfLines={2}>
            {description ?? statusLine}
          </Text>

          {href ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
              <Text style={{ ...TYPE.chip, color: accent }}>{copy.learnMore}</Text>
              <Feather name="arrow-right" size={13} color={accent} />
            </View>
          ) : null}
        </View>
      </View>
    </PressableSurface>
  );
}
