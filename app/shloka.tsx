import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

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
  tradition: string | null;
  userName: string;
};

function AmbientBackdrop({ isDark, brand }: { isDark: boolean; brand: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <LinearGradient
        colors={
          isDark
            ? [COLORS.heroBgDark, COLORS.darkBg, COLORS.homeHeroDark]
            : [COLORS.brandAccentLight, COLORS.creamBg, COLORS.homeHeroLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Svg pointerEvents="none" style={{ position: 'absolute', inset: 0 }} viewBox="0 0 360 720">
        <Defs>
          <RadialGradient id="topGlow" cx="50%" cy="18%" r="48%">
            <Stop offset="0%" stopColor={brand} stopOpacity={isDark ? '0.22' : '0.18'} />
            <Stop offset="100%" stopColor={brand} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="lowerGlow" cx="18%" cy="80%" r="46%">
            <Stop offset="0%" stopColor={isDark ? COLORS.creamBg : COLORS.brandEarthLight} stopOpacity={isDark ? '0.08' : '0.10'} />
            <Stop offset="100%" stopColor={isDark ? COLORS.creamBg : COLORS.brandEarthLight} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="180" cy="132" r="210" fill="url(#topGlow)" />
        <Circle cx="64" cy="574" r="175" fill="url(#lowerGlow)" />
        <Circle cx="180" cy="310" r="116" stroke={brand} strokeOpacity="0.08" strokeWidth="1.2" fill="none" />
        <Circle cx="180" cy="310" r="80" stroke={brand} strokeOpacity="0.06" strokeWidth="1" fill="none" />
        <Path d="M42 628 C92 590 130 608 180 628 C232 608 272 590 320 628" stroke={brand} strokeOpacity="0.10" strokeWidth="2.2" fill="none" />
      </Svg>
    </View>
  );
}

export default function ShlokaScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const shareCardRef = useRef<View | null>(null);

  const theme = themeColor(isDark);
  const background = theme.bg;
  const text = theme.text;
  const dim = theme.dim;
  const brand = theme.brand;
  const glass = theme.glass;
  const border = theme.premiumBorder;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sacredText, setSacredText] = useState<SacredText | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [marking, setMarking] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [celebration, setCelebration] = useState<{ streak: number; milestone: boolean; first: boolean } | null>(null);

  const celebrationScale = useRef(new Animated.Value(0.86)).current;
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
      supabase
        .from('profiles')
        .select('timezone, shloka_streak, last_shloka_date, tradition, full_name, username')
        .eq('id', user.id)
        .single(),
    ]);

    if (!summaryResponse.ok) {
      setLoadError(true);
      return;
    }

    const json = (await summaryResponse.json()) as { sacredText?: Partial<SacredText> };
    if (!json.sacredText?.original) {
      setLoadError(true);
      return;
    }

    const row = profileResult.data;
    setSacredText({
      label: json.sacredText.label ?? "Today's Verse",
      icon: json.sacredText.icon ?? '📖',
      original: json.sacredText.original,
      transliteration: json.sacredText.transliteration ?? '',
      meaning: json.sacredText.meaning ?? '',
      source: json.sacredText.source ?? '',
    });
    setProfile({
      userId: user.id,
      timezone: row?.timezone ?? 'UTC',
      shlokaStreak: row?.shloka_streak ?? 0,
      lastShlokaDate: row?.last_shloka_date ?? null,
      tradition: row?.tradition ?? null,
      userName: row?.full_name || row?.username || 'Seeker',
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

    try {
      const response = await apiFetch('/api/native/shloka/read', { method: 'POST' });
      if (!response.ok) {
        throw new Error('save failed');
      }
      const result = (await response.json()) as {
        date?: string;
        streak?: number;
        alreadyRead?: boolean;
        milestone?: boolean;
      };
      const newStreak = result.streak ?? profile.shlokaStreak;
      const completedDate = result.date ?? today;

      setProfile({ ...profile, shlokaStreak: newStreak, lastShlokaDate: completedDate });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setCelebration({ streak: newStreak, milestone: Boolean(result.milestone) || newStreak % 7 === 0, first: newStreak === 1 });
      celebrationScale.setValue(0.86);
      celebrationOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(celebrationScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 70 }),
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } catch {
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

  const shareVerse = useCallback(async () => {
    if (!sacredText || !profile || sharing) return;
    setSharing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));
      await shareCapturedShoonayaCard(shareCardRef, {
        fileName: `shoonaya-shloka-${today ?? 'today'}.png`,
        dialogTitle: "Share today's verse",
        fallbackMessage: `${sacredText.original}\n\n${sacredText.meaning}`,
      });
    } finally {
      setSharing(false);
    }
  }, [profile, sacredText, sharing, today]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: background, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <AmbientBackdrop isDark={isDark} brand={brand} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !sacredText) {
    return (
      <Screen style={{ backgroundColor: background }}>
        <AmbientBackdrop isDark={isDark} brand={brand} />
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="chevron-left" size={16} color={dim} />
            <Text style={{ color: dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
          </Pressable>
          <View style={{ borderRadius: 26, padding: 22, backgroundColor: glass, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 28 }}>
              {"Could not load today's verse"}
            </Text>
            <Text style={{ marginTop: 8, color: dim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              Check your connection and try again.
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                load()
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
              style={{ marginTop: 18, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: brand }}
            >
              <Text style={{ color: isDark ? COLORS.darkBg : COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: background, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
      <AmbientBackdrop isDark={isDark} brand={brand} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 34, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Feather name="chevron-left" size={19} color={text} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share today's verse"
              disabled={sharing}
              onPress={() => { void shareVerse(); }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glass,
                borderWidth: 1,
                borderColor: border,
                opacity: sharing ? 0.65 : 1,
              }}
            >
              {sharing ? <ActivityIndicator color={brand} /> : <Feather name="share-2" size={17} color={text} />}
            </Pressable>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingTop: 8, gap: 8 }}>
          <View style={{ width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: border }}>
            <Text style={{ fontSize: 28 }}>{sacredText.icon}</Text>
          </View>
          <Text style={{ ...TYPE.chip, color: brand, textTransform: 'uppercase', letterSpacing: 2.4 }}>
            {sacredText.label}
          </Text>
          {sacredText.source ? (
            <Text style={{ ...TYPE.caption, color: dim }}>
              {sacredText.source}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            borderRadius: 28,
            paddingVertical: 24,
            paddingHorizontal: 18,
            backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaGlassLight,
            borderWidth: 1,
            borderColor: isDark ? COLORS.homeShlokaGlassBorderDark : COLORS.homeShlokaGlassBorderLight,
            boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
          }}
        >
          <Text
            style={{
              fontFamily: TYPE.shloka.fontFamily,
              fontSize: Math.max(TYPE.shloka.fontSize, 24),
              lineHeight: Math.max(TYPE.shloka.lineHeight, 38),
              letterSpacing: TYPE.shloka.letterSpacing,
              color: text,
              textAlign: 'center',
            }}
          >
            {sacredText.original}
          </Text>
        </View>

        {sacredText.transliteration && sacredText.transliteration !== sacredText.original ? (
          <Text style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 25, fontStyle: 'italic', color: dim, textAlign: 'center' }}>
            {sacredText.transliteration}
          </Text>
        ) : null}

        <View style={{ borderRadius: 24, padding: 16, backgroundColor: glass, borderWidth: 1, borderColor: border }}>
          <Text style={{ ...TYPE.chip, color: brand, textTransform: 'uppercase', letterSpacing: 1.8 }}>
            Meaning
          </Text>
          <Text style={{ marginTop: 8, fontFamily: FONTS.sans, fontSize: 15.5, lineHeight: 25, color: text }}>
            {sacredText.meaning}
          </Text>
        </View>

        {profile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, padding: 14, backgroundColor: glass, borderWidth: 1, borderColor: border }}>
            <View style={{ width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft }}>
              <Feather name="zap" size={18} color={brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.label, color: text }}>
                {profile.shlokaStreak} day{profile.shlokaStreak === 1 ? '' : 's'} sacred text streak
              </Text>
              <Text style={{ marginTop: 2, ...TYPE.caption, color: dim }}>
                {readToday ? 'Marked today. Come back tomorrow.' : 'Read and mark today to keep the rhythm.'}
              </Text>
            </View>
            {readToday ? <Feather name="check-circle" size={20} color={brand} /> : null}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={readToday ? 'Verse already read today' : 'Mark verse as read, earn 5 seva points'}
          disabled={readToday || marking}
          onPress={() => { void markRead(); }}
          style={({ pressed }) => ({
            minHeight: MIN_TOUCH_TARGET + 8,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            backgroundColor: readToday ? glass : brand,
            borderWidth: readToday ? 1 : 0,
            borderColor: border,
            opacity: marking ? 0.7 : pressed && !readToday ? 0.88 : 1,
            transform: [{ scale: pressed && !readToday ? 0.985 : 1 }],
            boxShadow: readToday ? undefined : (isDark ? SHADOWS.md.dark : SHADOWS.md.light),
          })}
        >
          {marking ? (
            <ActivityIndicator color={readToday ? brand : COLORS.ink} />
          ) : (
            <>
              <Feather name={readToday ? 'check-circle' : 'book-open'} size={18} color={readToday ? brand : COLORS.ink} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: readToday ? brand : COLORS.ink }}>
                {readToday ? 'Read today' : 'Mark as read - earn 5 seva points'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -10000,
          top: 0,
          width: 360,
          height: 640,
        }}
      >
        <View collapsable={false}>
          <ShoonayaShareCard
            ref={shareCardRef}
            data={{
              tradition: profile?.tradition ?? 'universal',
              headlineValue: profile?.shlokaStreak ?? 1,
              title: 'Sacred Text Streak',
              subtitle: sacredText.source || sacredText.label,
              caption: sacredText.meaning || sacredText.original,
              userName: profile?.userName,
              date: today ?? undefined,
              footer: 'Shared from Shoonaya',
            }}
          />
        </View>
      </View>

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
              borderRadius: 30,
              paddingVertical: 32,
              paddingHorizontal: 28,
              alignItems: 'center',
              gap: 8,
              backgroundColor: glass,
              borderWidth: 1,
              borderColor: border,
              maxWidth: 330,
              boxShadow: isDark ? SHADOWS.lg.dark : SHADOWS.lg.light,
            }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="zap" size={26} color={brand} />
            </View>
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 28, color: text, textAlign: 'center' }}>
              {celebration.streak}-day streak
            </Text>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>+5 seva points</Text>
            {celebration.milestone ? (
              <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                Milestone reached. Keep the rhythm steady.
              </Text>
            ) : celebration.first ? (
              <Text style={{ marginTop: 4, fontFamily: FONTS.sans, fontSize: 13, color: dim, textAlign: 'center' }}>
                First reading of your streak.
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
