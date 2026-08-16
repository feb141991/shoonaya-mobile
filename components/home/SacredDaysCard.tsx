import { Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon, type SacredIconName } from '@/components/ui/SacredIcon';
import { COLORS, RADII, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';

// Mobile's spotlight version of the PWA's VratCarousel/VratCard
// (src/components/home/VratCarousel.tsx) — same 3-day-before window
// (HOME_OBSERVANCE_WINDOW_DAYS), but a single soonest-first card rather
// than a swipeable carousel, matching how BrahmaMuhurtaPrompt/
// FirstWeekGuide are each a one-shot conditional card on this screen.
// Built entirely from this app's own tokens, not ported PWA hex/rgba.

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

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${entry.name}, ${daysBadgeLabel(entry.daysLeft)}${entry.description ? `. ${entry.description}` : ''}. Tap to open`}
      onPress={() => router.push(resolveNativeRoute(entry.href) as Href)}
      style={{
        borderRadius: RADII.xl,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.premiumBorder,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
          borderWidth: 1,
          borderColor: theme.premiumBorder,
        }}
      >
        <SacredIcon name={iconName} fallbackGlyph="sun" size={20} color={accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ ...TYPE.cardHeading, color: theme.text, flexShrink: 1 }} numberOfLines={1}>
            {entry.name}
          </Text>
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: entry.daysLeft === 0 ? accent : 'transparent',
              borderWidth: entry.daysLeft === 0 ? 0 : 1,
              borderColor: theme.premiumBorder,
            }}
          >
            <Text
              style={{
                ...TYPE.chip,
                color: entry.daysLeft === 0 ? (isDark ? COLORS.darkBg : COLORS.creamBg) : theme.dim,
              }}
            >
              {daysBadgeLabel(entry.daysLeft)}
            </Text>
          </View>
        </View>

        {entry.description ? (
          <Text style={{ ...TYPE.caption, marginTop: 4, color: theme.dim }} numberOfLines={2}>
            {entry.description}
          </Text>
        ) : null}
      </View>
    </PressableSurface>
  );
}
