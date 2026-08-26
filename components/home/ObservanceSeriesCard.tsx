import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';
import type {
  ObservanceSeries,
} from '@/lib/observance-series-contract.generated';
import {
  getNativeSeriesCardChildren,
  getNativeSeriesCardCopy,
  getNativeSeriesReviewMessage,
  getSafeNativeSeriesName,
  getSafeNativeEditorialCopy,
  nativeCalendarDayDistance,
} from '@/lib/observance-series-card-helpers';

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
  theme,
  isDark,
  lang = 'en',
  spiritualDate,
}: {
  series: ObservanceSeries;
  theme: Theme;
  isDark: boolean;
  lang?: 'en' | 'hi' | 'pa';
  spiritualDate: string;
}) {
  // Unconditional Hook call at the very top
  const router = useRouter();
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const targetChildren = getNativeSeriesCardChildren(series);
  const activeIdentityKey = series.activeChildOccurrenceIds.join('|');

  useEffect(() => {
    setSelectedChildIndex(0);
  }, [series.seriesKey, activeIdentityKey]);

  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const warning = isDark ? COLORS.warningDark : COLORS.warningLight;
  const copy = getNativeSeriesCardCopy(lang);
  const seriesName = getSafeNativeSeriesName(series, lang, {
    calendarProfile: series.profile.calendar,
    tradition: series.tradition,
  });
  const gradient: readonly [string, string] = isDark
    ? [COLORS.navGlassTopDark, COLORS.navGlassBottomDark]
    : [COLORS.navGlassTopLight, COLORS.navGlassBottomLight];

  // 1. Under-Review / Incomplete Series (Fail-closed state)
  if (series.status === 'under_review' || targetChildren.length === 0) {
    return (
      <View
        style={{
          borderRadius: RADII.xl,
          borderWidth: 1,
          borderColor: isDark ? COLORS.warningBorderDark : COLORS.warningBorderLight,
          borderStyle: 'dashed',
          padding: 14,
          backgroundColor: isDark ? COLORS.cardBgDark : COLORS.cardBgLight,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Feather name="alert-circle" size={20} color={warning} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...TYPE.label, color: warning }}>
              {seriesName}
            </Text>
            <View style={{ backgroundColor: isDark ? COLORS.warningBgDark : COLORS.warningBgLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ ...TYPE.chip, color: warning }}>
                {copy.reviewPending}
              </Text>
            </View>
          </View>
          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>
            {getNativeSeriesReviewMessage(series, lang)}
          </Text>
        </View>
      </View>
    );
  }

  const activeChild = targetChildren[selectedChildIndex] ?? targetChildren[0] ?? series.children[0];
  if (!activeChild) return null;

  const totalCount = series.totalDays ?? series.children.length;
  const targetDate = activeChild.civilDate ?? series.startDate;
  const daysLeft = targetDate ? nativeCalendarDayDistance(spiritualDate, targetDate) ?? 0 : 0;
  const isToday = daysLeft === 0;

  const { title, subtitle, description } = getSafeNativeEditorialCopy(activeChild, lang, {
    calendarProfile: series.profile.calendar,
    tradition: series.tradition,
  });
  const href = activeChild.routeKind === 'vrat' && activeChild.routeSlug
    ? `/vrat/${encodeURIComponent(activeChild.routeSlug)}`
    : activeChild.routeKind === 'festival' && activeChild.routeSlug
      ? `/festival/${encodeURIComponent(activeChild.routeSlug)}`
      : null;
  const iconName: SacredIconName = series.mode === 'daily_journey' ? 'vrat' : 'panchang';

  const isConcluded = series.status === 'concluding' || (activeChild.sequence === totalCount && isToday);
  const statusLine = series.status === 'upcoming'
    ? `${seriesName} · ${copy.begins} ${daysLeft === 0 ? copy.today : daysLeft === 1 ? copy.tomorrow : copy.inDays(daysLeft)}`
    : isConcluded
    ? `${title} · ${copy.concludesToday}`
    : series.mode === 'daily_journey'
      ? `${copy.dayOf(activeChild.sequence, totalCount)} · ${subtitle || title}`
      : `${seriesName} · ${copy.dayOf(activeChild.sequence, totalCount)}`;

  return (
    <View
      style={{
        borderRadius: RADII.xl,
        borderWidth: 1,
        borderColor: isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight,
        boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
        overflow: 'hidden',
      }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Backdrop ambient glow */}
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

      {/* Same-date children select the destination without triggering navigation. */}
      {targetChildren.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.premiumBorder }}>
            {targetChildren.map((child, idx) => {
              const isSelected = idx === selectedChildIndex;
              const childCopy = getSafeNativeEditorialCopy(child, lang, {
                calendarProfile: series.profile.calendar,
                tradition: series.tradition,
              });
              return (
                <Pressable
                  key={child.occurrenceId ?? child.slug}
                  onPress={() => setSelectedChildIndex(idx)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={childCopy.title}
                  hitSlop={4}
                  style={{
                    paddingHorizontal: 10,
                    minHeight: 44,
                    justifyContent: 'center',
                    borderRadius: 999,
                    backgroundColor: isSelected ? (isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight) : 'transparent',
                    borderWidth: 1,
                    borderColor: isSelected ? accent : theme.premiumBorder,
                  }}
                >
                  <Text style={{ ...TYPE.chip, color: isSelected ? accent : theme.dim }}>
                    {childCopy.title}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      )}

      <PressableSurface
        haptic="selection"
        accessibilityLabel={`${seriesName}, ${title}, ${daysBadgeLabel(daysLeft, lang)}${description ? `. ${description}` : ''}`}
        accessibilityState={{ disabled: !href }}
        disabled={!href}
        onPress={() => {
          if (href) router.push(resolveNativeRoute(href) as Href);
        }}
        style={{ padding: 12, minHeight: 62, justifyContent: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
            }}
          >
            <SacredIcon name={iconName} fallbackGlyph="sun" size={18} color={accent} />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Text style={{ ...TYPE.label, color: theme.text, flexShrink: 1 }} numberOfLines={1}>
                  {title}
                </Text>
                <View style={{ backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: accent }}>
                    {seriesName}
                  </Text>
                </View>
              </View>

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
                <Text style={{ ...TYPE.chip, color: isToday ? (isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight) : theme.dim }}>
                  {daysBadgeLabel(daysLeft, lang)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text style={{ ...TYPE.caption, color: theme.dim, flexShrink: 1 }} numberOfLines={1}>
                {statusLine}
              </Text>
              <Text style={{ ...TYPE.caption, color: accent, fontFamily: TYPE.label.fontFamily }}>
                {` · ${copy.learnMore}`}
              </Text>
            </View>
          </View>

          <Feather name="chevron-right" size={16} color={accent} />
        </View>
      </PressableSurface>
    </View>
  );
}
