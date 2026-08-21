import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, SHADOWS, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';

// Mobile's spotlight version of the PWA's VratCarousel/VratCard
// (src/components/home/VratCarousel.tsx) — same 3-day-before window
// (HOME_OBSERVANCE_WINDOW_DAYS), but a single soonest-first card rather
// than a swipeable carousel, matching how BrahmaMuhurtaPrompt/
// FirstWeekGuide are each a one-shot conditional card on this screen.
// Gradient + glow + "Learn more" pill mirror the Sadhana CTA card's
// (index.tsx) premium-accent treatment and the japa.tsx/nav backdrop-glow
// convention, not ported PWA hex/rgba.

type ObservanceEntryLike = {
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

function daysBadgeLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `in ${daysLeft}d`;
}

export function SacredDaysCard({ entry, theme, isDark }: { entry: ObservanceEntryLike; theme: Theme; isDark: boolean }) {
  const router = useRouter();
  const accent = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const iconName = ROUTE_ICON[entry.routeKind] ?? 'panchang';
  const isToday = entry.daysLeft === 0;

  // Same "premium accent" gradient pair as the Sadhana CTA card
  // (index.tsx's sadhanaCtaGradient) — this card sits in the same list,
  // so it should read as the same visual tier, not a plainer sibling.
  const gradient: readonly [string, string] = isDark
    ? ['rgba(38,28,18,0.96)', 'rgba(24,18,13,0.94)']
    : ['rgba(255,248,234,0.96)', 'rgba(250,236,211,0.88)'];
  const ctaTextColor = isDark ? COLORS.darkBg : COLORS.creamBg;

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${entry.name}, ${daysBadgeLabel(entry.daysLeft)}${entry.description ? `. ${entry.description}` : ''}. Tap to open`}
      onPress={() => router.push(resolveNativeRoute(entry.href) as Href)}
      style={{
        borderRadius: RADII.xl,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(197,160,89,0.22)' : 'rgba(205,166,92,0.28)',
        boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
        overflow: 'hidden',
      }}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* Off-edge glow bubble — same backdrop-bleed pattern as index.tsx's
          own hero glows (theme.brandSoft-style circle, pointerEvents none,
          absolutely positioned, bleeding off the corner). */}
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
            backgroundColor: isDark ? 'rgba(197,160,89,0.16)' : 'rgba(217,178,105,0.18)',
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
                {daysBadgeLabel(entry.daysLeft)}
              </Text>
            </View>
          </View>

          {/* Compact hook -- reads as an invitation to tap, without the
              weight of a full separate CTA pill/row. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Text style={{ ...TYPE.caption, color: theme.dim, flexShrink: 1 }} numberOfLines={1}>
              {entry.description ?? (isToday ? 'Observed today' : entry.monthLabel ?? 'Sacred day')}
            </Text>
            <Text style={{ ...TYPE.caption, color: accent, fontFamily: TYPE.label.fontFamily }}>
              {' · Learn more'}
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color={accent} />
      </View>
    </PressableSurface>
  );
}
