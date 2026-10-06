import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getNativeSeriesCardCopy } from '@/lib/observance-series-card-helpers';
import { resolveSeriesChildHref } from '@/lib/observance-series-content';
import { resolveNativeRoute } from '@/lib/routes';
import {
  pickSacredDayLocalizedText,
  SACRED_DAYS_CARD_HEIGHT,
  type SacredDaysObservance,
} from '@/lib/sacred-days-deck';
import { lookupVratData } from '@/lib/vrat-data';
import { lookupFestivalContent } from '@/lib/festival-content.generated';
import { resolveFestivalText } from '@/lib/festival-content-helpers';

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

function daysBadgeLabel(daysLeft: number | undefined | null, lang: 'en' | 'hi' | 'pa'): string {
  const copy = getNativeSeriesCardCopy(lang);
  if (typeof daysLeft !== 'number' || Number.isNaN(daysLeft)) return copy.today;
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
  // Falls back to the canonical themeColor() mapping rather than
  // re-deriving isDark ? COLORS.X : COLORS.Y inline, so this can never
  // drift out of sync with that single source of truth.
  const cardTextColor = theme?.text ?? themeColor(isDark).text;
  const cardDimColor = theme?.dim ?? themeColor(isDark).dim;
  const cardBorderColor = theme?.premiumBorder ?? themeColor(isDark).premiumBorder;
  const iconName = ROUTE_ICON[entry.routeKind] ?? 'panchang';
  const isToday = entry.daysLeft === 0;
  const copy = getNativeSeriesCardCopy(lang);

  const matchedVrat = entry.routeKind === 'vrat' || !entry.routeKind
    ? (lookupVratData(entry.routeSlug) || lookupVratData(entry.name))
    : null;
  const matchedFestival = entry.routeKind === 'festival' || !entry.routeKind
    ? (lookupFestivalContent(entry.routeSlug) || lookupFestivalContent(entry.name))
    : null;

  const fallbackLocalName = lang === 'hi'
    ? (matchedVrat?.nameLocal ?? (matchedFestival ? resolveFestivalText(matchedFestival.name, 'hi') : undefined))
    : (lang === 'pa'
        ? (matchedFestival ? resolveFestivalText(matchedFestival.name, 'pa') : undefined)
        : undefined);

  const rawDisplayName = lang === 'en'
    ? entry.name
    : (pickSacredDayLocalizedText(entry.name, entry.nameLocal, entry.namePa, lang) || fallbackLocalName || entry.name);
  const displayName = rawDisplayName || entry.label || 'Sacred Day';

  const entryLocalDesc = lang === 'en'
    ? entry.description
    : (lang === 'pa'
        ? (entry.descriptionPa || entry.descriptionLocal)
        : entry.descriptionLocal);

  const fallbackLocalDesc = lang === 'hi'
    ? (matchedVrat?.taglineLocal || matchedVrat?.significanceLocal || (matchedFestival ? (resolveFestivalText(matchedFestival.tagline, 'hi') || resolveFestivalText(matchedFestival.significance, 'hi')) : undefined))
    : (lang === 'pa'
        ? (matchedFestival ? (resolveFestivalText(matchedFestival.tagline, 'pa') || resolveFestivalText(matchedFestival.significance, 'pa')) : undefined)
        : undefined);

  const displayDescription = lang === 'en'
    ? entry.description
    : (entryLocalDesc || fallbackLocalDesc || entry.description);
  const gradient: readonly [string, string] = isDark
    ? [COLORS.navGlassTopDark, COLORS.navGlassBottomDark]
    : [COLORS.navGlassTopLight, COLORS.navGlassBottomLight];
  const ctaTextColor = isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight;
  const resolvedHref = resolveSeriesChildHref({
    href: entry.href,
    routeSlug: entry.routeSlug,
    name: entry.name,
  }) || entry.href;

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${displayName}, ${daysBadgeLabel(entry.daysLeft, lang)}${displayDescription ? `. ${displayDescription}` : ''}`}
      accessibilityHint={copy.learnMore}
      onPress={() => router.push(resolveNativeRoute(resolvedHref) as Href)}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...TYPE.label, color: cardTextColor }} numberOfLines={1}>
                {displayName}
              </Text>
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
              <Text style={{ ...TYPE.chip, color: isToday ? ctaTextColor : cardDimColor }}>
                {daysBadgeLabel(entry.daysLeft, lang)}
              </Text>
            </View>
          </View>

          <Text style={{ ...TYPE.caption, color: cardDimColor, marginTop: 2, lineHeight: 15 }} numberOfLines={2}>
            {displayDescription ?? entry.monthLabel ?? entry.label}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Text style={{ ...TYPE.chip, color: accent }}>{copy.learnMore}</Text>
            <Feather name="arrow-right" size={13} color={accent} />
          </View>
        </View>
      </View>
    </PressableSurface>
  );
}
