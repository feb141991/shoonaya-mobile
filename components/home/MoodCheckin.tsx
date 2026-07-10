import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS } from '@/lib/constants';
import { findMoodConfig } from '@/lib/mood-registry';
import { resolveNativeRoute } from '@/lib/routes';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { SkeletonRow } from '@/components/ui/SkeletonLoader';

type CheckinStatus = 'loading' | 'ready' | 'error';

type CheckinResponse = {
  hasLoggedMoodToday?: boolean;
  lastMood?: string | null;
};

export function MoodCheckin() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const [status, setStatus] = useState<CheckinStatus>('loading');
  const [hasLoggedMoodToday, setHasLoggedMoodToday] = useState(false);
  const [lastMood, setLastMood] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await apiFetch('/api/mood/checkin');
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const payload = (await response.json()) as CheckinResponse;
      setHasLoggedMoodToday(Boolean(payload.hasLoggedMoodToday));
      setLastMood(payload.lastMood ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadStatus().catch(() => {});
  }, [loadStatus]);

  const navigateToMood = () => {
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
          padding: 16,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, fontFamily: FONTS.sans, fontSize: 13, color: dim }}>
          Couldn&apos;t load your mood check-in.
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry loading mood check-in" onPress={loadStatus}>
          <Text style={{ color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (hasLoggedMoodToday && loggedMoodConfig) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`You logged feeling ${loggedMoodConfig.label} today. Tap to view mood.`}
        onPress={navigateToMood}
        style={{
          borderRadius: 18,
          padding: 16,
          backgroundColor: cardBg,
          borderWidth: 1,
          borderColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: loggedMoodConfig.bg,
          }}
        >
          <SacredIcon name="mood" fallbackGlyph="smile" size={18} color={loggedMoodConfig.colour} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: dim }}>
            Today&apos;s mood
          </Text>
          <Text style={{ marginTop: 2, fontFamily: FONTS.sansSemiBold, fontSize: 15, color: loggedMoodConfig.colour }}>
            Feeling {loggedMoodConfig.label}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={dim} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check in with your mood"
      onPress={navigateToMood}
      style={{
        borderRadius: 18,
        padding: 16,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: COLORS.brandGold }}>
          How are you feeling?
        </Text>
        <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13, color: text }}>
          Check in with yourself today.
        </Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.borderDark, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="arrow-right" size={18} color={COLORS.brandGold} />
      </View>
    </Pressable>
  );
}
