import { useCallback, useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { apiFetch, isFetchCancelled } from '@/lib/api';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { findMoodConfig } from '@/lib/mood-registry';
import { resolveNativeRoute } from '@/lib/routes';
import { isGuestMode } from '@/lib/guestSession';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { IconTile } from '@/components/ui/IconTile';
import { MoodGlyph } from '@/components/mood/MoodGlyph';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';

type CheckinStatus = 'loading' | 'ready' | 'error';

type CheckinResponse = {
  hasLoggedMoodToday?: boolean;
  lastMood?: string | null;
};

type MoodCheckinProps = {
  // Guests get the same card (so the touchpoint is still visible/inviting),
  // but tapping it should open the app's shared sign-in prompt instead of
  // navigating to a page that 401s — mirrors Home's own hero "How are you
  // feeling?" pill, which already does the same isGuest -> setAuthGateVisible
  // check before navigating.
  onGuestTap?: () => void;
};

export function MoodCheckin({ onGuestTap }: MoodCheckinProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const cardBg = 'transparent';
  const border = 'transparent';
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [isGuest, setIsGuest] = useState(false);
  const [hasLoggedMoodToday, setHasLoggedMoodToday] = useState(false);
  const [lastMood, setLastMood] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus('loading');
    const guest = await isGuestMode();
    setIsGuest(guest);
    if (guest) {
      // Skip the fetch entirely -- there's no session to check in with,
      // and hitting the API just to get a 401 would show the wrong
      // ("Couldn't load") error state for what's actually an expected,
      // unauthenticated visitor.
      setStatus('ready');
      return;
    }
    try {
      const response = await apiFetch('/api/mood/checkin');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as CheckinResponse;
      setHasLoggedMoodToday(Boolean(payload.hasLoggedMoodToday));
      setLastMood(payload.lastMood ?? null);
      setStatus('ready');
    } catch (err) {
      if (!isFetchCancelled(err)) setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [loadStatus]);

  const navigateToMood = () => {
    if (isGuest && onGuestTap) {
      onGuestTap();
      return;
    }
    router.push(resolveNativeRoute('/mood', '/(tabs)'));
  };

  const loggedMoodConfig = findMoodConfig(isDark, lastMood);

  if (status === 'loading') {
    return <SkeletonRow style={{ marginTop: 0 }} />;
  }

  if (status === 'error') {
    return (
      <View
        style={{
          borderRadius: 18,
          paddingHorizontal: 0,
          paddingVertical: 10,
          backgroundColor: cardBg,
          borderWidth: 0,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
          Couldn&apos;t load your mood check-in.
        </Text>
        <PressableSurface haptic="selection" accessibilityLabel="Retry loading mood check-in" onPress={loadStatus} style={{ minHeight: 0 }}>
          <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
        </PressableSurface>
      </View>
    );
  }

  // Chrome (bg/border/shadow) lives on a plain outer View with a flat style
  // object — PressableSurface resolves style as an array (base + caller +
  // pressedStyle) via a style-callback function that also bakes in
  // opacity/transform, which was found to silently drop borderColor/
  // boxShadow set on the same node elsewhere in this app (Home Quiz/Sacred
  // Rhythm cards, Sankalpa screen). PressableSurface stays nested inside,
  // purely for press feedback and layout, to avoid the same failure here.
  if (hasLoggedMoodToday && loggedMoodConfig) {
    return (
      <View
        style={{
          borderRadius: 18,
          backgroundColor: cardBg,
          borderWidth: 0,
          borderColor: border,
        }}
      >
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`You logged feeling ${loggedMoodConfig.label} today. Tap to view mood.`}
          onPress={navigateToMood}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: loggedMoodConfig.bg,
              borderWidth: 1,
              borderColor: `${loggedMoodConfig.colour}33`,
            }}
          >
            <MoodGlyph mood={loggedMoodConfig.key} size={22} color={loggedMoodConfig.colour} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: dim }}>
              Today&apos;s mood
            </Text>
            <Text style={{ marginTop: 2, ...TYPE.cardHeading, fontFamily: FONTS.sansSemiBold, color: text }} numberOfLines={1}>
              Feeling {loggedMoodConfig.label}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={dim} />
        </PressableSurface>
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: 18,
        backgroundColor: cardBg,
        borderWidth: 0,
        borderColor: border,
      }}
    >
      <PressableSurface
        haptic="selection"
        accessibilityLabel="Check in with your mood"
        onPress={navigateToMood}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ ...TYPE.chip, letterSpacing: 1.3, textTransform: 'uppercase', color: brand }}>
            How are you feeling?
          </Text>
          <Text style={{ marginTop: 4, ...TYPE.caption, color: dim }}>
            Check in with yourself today.
          </Text>
        </View>
        <IconTile name="mood" fallbackGlyph="smile" size="sm" color={brand} />
      </PressableSurface>
    </View>
  );
}
