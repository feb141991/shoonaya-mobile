import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Card } from '@/components/ui/Card';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, TYPE } from '@/lib/constants';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

// Native's shloka detail screen — reached from Home's shloka panel tap.
// Ports PWA's markShlokaRead() (src/app/(main)/home/sections/HeroSection.tsx)
// as directly as the native/web split allows:
//   - Shloka content comes from the same canonical source Home's panel
//     already uses (GET /api/native/home-summary's `sacredText`), refetched
//     here rather than duplicated, so this screen can never show a
//     different verse than the one Home just displayed.
//   - The streak/seva write is DIRECT Supabase (profiles.shloka_streak /
//     last_shloka_date, then the same `increment_period_seva` RPC PWA
//     calls, with PWA's identical direct-column fallback if the RPC isn't
//     reachable) — there is no REST route for this on web either, so this
//     mirrors web's own approach rather than inventing a new API contract
//     (same precedent as native's notification inbox and dharm-veer
//     screens this session).
//   - "Celebration" is a haptic + an animated success card (streak count,
//     milestone/first-day badge) built from primitives already in this
//     app (Animated, expo-haptics) — no confetti library was added; that's
//     flagged as optional future polish, not faked here.
export default function ShlokaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const background = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const iconWell = isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  type SacredText = {
    label: string;
    icon: string;
    original: string;
    transliteration: string;
    meaning: string;
    source: string;
  };

  type ProfileState = {
    userId: string;
    timezone: string;
    shlokaStreak: number;
    lastShlokaDate: string | null;
  };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sacredText, setSacredText] = useState<SacredText | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [marking, setMarking] = useState(false);
  const [celebration, setCelebration] = useState<{ streak: number; milestone: boolean; first: boolean } | null>(null);

  const celebrationScale = useRef(new Animated.Value(0.85)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoadError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const [summaryResponse, profileResult] = await Promise.all([
      apiFetch('/api/native/home-summary'),
      supabase.from('profiles').select('timezone, shloka_streak, last_shloka_date').eq('id', user.id).single(),
    ]);

    if (!summaryResponse.ok) {
      setLoadError(true);
      return;
    }

    const json = await summaryResponse.json();
    if (!json?.sacredText?.original) {
      setLoadError(true);
      return;
    }

    setSacredText(json.sacredText as SacredText);
    setProfile({
      userId: user.id,
      timezone: profileResult.data?.timezone ?? 'UTC',
      shlokaStreak: profileResult.data?.shloka_streak ?? 0,
      lastShlokaDate: profileResult.data?.last_shloka_date ?? null,
    });
  }, [router]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [load]);

  const today = profile ? spiritualDate(profile.timezone) : null;
  const readToday = Boolean(profile && today && profile.lastShlokaDate === today);

  const markRead = useCallback(async () => {
    if (!profile || !today || readToday || marking) return;

    setMarking(true);
    const previousProfile = profile;

    const yesterdayObj = new Date(`${today}T12:00:00Z`);
    yesterdayObj.setUTCDate(yesterdayObj.getUTCDate() - 1);
    const yesterday = yesterdayObj.toISOString().slice(0, 10);
    const newStreak = profile.lastShlokaDate === yesterday ? profile.shlokaStreak + 1 : 1;

    setProfile({ ...profile, shlokaStreak: newStreak, lastShlokaDate: today });

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ shloka_streak: newStreak, last_shloka_date: today })
        .eq('id', profile.userId);
      if (profileError) throw profileError;

      try {
        const { error: rpcError } = await supabase.rpc('increment_period_seva', {
          p_user_id: profile.userId,
          p_points: 5,
        });
        if (rpcError) throw rpcError;
      } catch {
        // Same fallback PWA's markShlokaRead uses if the RPC isn't reachable
        // — a direct read-then-write on the three seva columns.
        const { data } = await supabase
          .from('profiles')
          .select('seva_score, weekly_seva, monthly_seva')
          .eq('id', profile.userId)
          .single();
        if (data) {
          await supabase
            .from('profiles')
            .update({
              seva_score: (data.seva_score ?? 0) + 5,
              weekly_seva: (data.weekly_seva ?? 0) + 5,
              monthly_seva: (data.monthly_seva ?? 0) + 5,
            })
            .eq('id', profile.userId);
        }
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setCelebration({ streak: newStreak, milestone: newStreak % 7 === 0, first: newStreak === 1 });
      celebrationScale.setValue(0.85);
      celebrationOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(celebrationScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 60 }),
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } catch {
      // Revert the optimistic update — an honest "didn't save, try again"
      // beats a streak badge that looks marked but silently isn't.
      setProfile(previousProfile);
      Alert.alert("Could not save today's reading", 'Check your connection and try again.');
    } finally {
      setMarking(false);
    }
  }, [profile, today, readToday, marking, celebrationScale, celebrationOpacity]);

  const dismissCelebration = useCallback(() => {
    Animated.timing(celebrationOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setCelebration(null);
    });
  }, [celebrationOpacity]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !sacredText) {
    return (
      <Screen style={{ backgroundColor: background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={dim} />
            <Text style={{ color: dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>
          <Card style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 26 }}>Could not load today&apos;s verse</Text>
            <Text style={{ color: dim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                load()
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
              style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: brand }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="chevron-left" size={16} color={dim} />
          <Text style={{ color: dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Card style={{ backgroundColor: cardBg, borderColor: border, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 34 }}>{sacredText.icon}</Text>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', color: brand }}>
            {sacredText.label}
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontFamily: TYPE.shloka.fontFamily,
              fontSize: TYPE.shloka.fontSize,
              lineHeight: TYPE.shloka.lineHeight,
              letterSpacing: TYPE.shloka.letterSpacing,
              color: text,
              textAlign: 'center',
            }}
          >
            {sacredText.original}
          </Text>
          {sacredText.transliteration ? (
            <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 14, fontStyle: 'italic', color: dim, textAlign: 'center' }}>
              {sacredText.transliteration}
            </Text>
          ) : null}
          <Text style={{ marginTop: 14, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 23, color: text, textAlign: 'center' }}>
            {sacredText.meaning}
          </Text>
          {sacredText.source ? (
            <Text style={{ marginTop: 10, fontFamily: FONTS.sansSemiBold, fontSize: 12, color: dim }}>
              — {sacredText.source}
            </Text>
          ) : null}
        </Card>

        {profile ? (
          <Card style={{ backgroundColor: cardBg, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: iconWell }}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>
                {profile.shlokaStreak} day{profile.shlokaStreak === 1 ? '' : 's'} streak
              </Text>
              <Text style={{ marginTop: 1, fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
                {readToday ? 'Read today — come back tomorrow' : 'Mark today’s verse as read to keep it going'}
              </Text>
            </View>
          </Card>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={readToday ? 'Verse already read today' : 'Mark verse as read, earn 5 seva points'}
          disabled={readToday || marking}
          onPress={() => {
            void markRead();
          }}
          style={{
            minHeight: MIN_TOUCH_TARGET + 6,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            backgroundColor: readToday ? cardBg : brand,
            borderWidth: readToday ? 1 : 0,
            borderColor: border,
            opacity: marking ? 0.7 : 1,
          }}
        >
          {marking ? (
            <ActivityIndicator color={readToday ? brand : COLORS.ink} />
          ) : (
            <>
              <Feather name={readToday ? 'check-circle' : 'book-open'} size={18} color={readToday ? brand : COLORS.ink} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: readToday ? brand : COLORS.ink }}>
                {readToday ? 'Read today' : 'Mark as read — earn 5 seva points'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {celebration ? (
        <Animated.View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.celebrationScrim,
            opacity: celebrationOpacity,
          }}
        >
          <ConfettiOverlay show={Boolean(celebration)} density={celebration.milestone ? 'full' : 'soft'} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss celebration"
            onPress={dismissCelebration}
            style={{ position: 'absolute', inset: 0 }}
          />
          <Animated.View
            style={{
              transform: [{ scale: celebrationScale }],
              borderRadius: 28,
              paddingVertical: 32,
              paddingHorizontal: 28,
              alignItems: 'center',
              gap: 8,
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: border,
              maxWidth: 320,
            }}
          >
            <Text style={{ fontSize: 44 }}>🔥</Text>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text, textAlign: 'center' }}>
              {celebration.streak}-day streak!
            </Text>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>+5 seva points</Text>
            {celebration.milestone ? (
              <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                🏅 {celebration.streak}-day milestone!
              </Text>
            ) : celebration.first ? (
              <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                First reading of your streak! 🌱
              </Text>
            ) : null}
            <Pressable
              onPress={dismissCelebration}
              style={{ marginTop: 12, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: brand }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.ink }}>Continue</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}
    </Screen>
  );
}
