import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import { getNativeSeriesCardCopy } from '@/lib/observance-series-card-helpers';
import { resolveNativeRoute } from '@/lib/routes';
import {
  SACRED_DAYS_CARD_HEIGHT,
  type SacredDaysObservance,
} from '@/lib/sacred-days-deck';

export type ObservanceEntryLike = SacredDaysObservance;

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
  theme,
  isDark,
  lang = 'en',
}: {
  entry: ObservanceEntryLike;
  theme: Theme;
  isDark: boolean;
  lang?: 'en' | 'hi' | 'pa';
}) {
  const router = useRouter();
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
      accessibilityHint={copy.learnMore}
      onPress={() => router.push(resolveNativeRoute(entry.href) as Href)}
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

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: RADII.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
            borderWidth: 1,
            borderColor: theme.premiumBorder,
          }}
        >
          <SacredIcon name={iconName} fallbackGlyph="sun" size={23} color={accent} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ ...TYPE.label, color: theme.text, flex: 1 }} numberOfLines={1}>
              {entry.name}
            </Text>
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
              <Text style={{ ...TYPE.chip, color: isToday ? ctaTextColor : theme.dim }}>
                {daysBadgeLabel(entry.daysLeft, lang)}
              </Text>
            </View>
          </View>

          <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 4, lineHeight: 16 }} numberOfLines={2}>
            {entry.description ?? entry.monthLabel ?? entry.label}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 }}>
            <Text style={{ ...TYPE.chip, color: accent }}>{copy.learnMore}</Text>
            <Feather name="arrow-right" size={13} color={accent} />
          </View>
        </View>
      </View>
    </PressableSurface>
  );
}
