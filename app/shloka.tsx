import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { BackButton } from '@/components/ui/BackButton';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';

const GUEST_SHLOKAS: Record<string, SacredText> = {
  hindu: {
    label: "Gita 2.47",
    icon: "📖",
    original: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    transliteration: "karmaṇy-evādhikāras te mā phaleṣu kadācena\nmā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi",
    meaning: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself to be the cause of the results of your activities, nor be attached to inactive duty.",
    source: "Bhagavad Gita",
  },
  sikh: {
    label: "Guru Nanak",
    icon: "📖",
    original: "ੴ सतिनामु करता पुरखु निरभउ निरवैरु\nअकाल मूरति अजूनी सैभं गुर प्रसादि ॥",
    transliteration: "ik-ōankār satinām karatā purakh nirabhau niravair\nakāl mūrat ajūnī saibhan gur prasād",
    meaning: "There is only one God, His name is Truth. He is the Creator, without fear, without enmity. He is immortal, unborn, self-existent, realized by the Guru's grace.",
    source: "Guru Granth Sahib",
  },
  buddhist: {
    label: "Dhammapada 1",
    icon: "📖",
    original: "मनोपुब्बङ्गमा धम्मा मनोसेट्ठा मनोमया।\nमनसा चे पदुट्ठेन भासति वा करोति वा।\nततो नं दुक्खमन्वेति चक्कं व वहतो पदं॥",
    transliteration: "manopubbaṅgamā dhammā manoseṭṭhā manomayā\nmanasā ce paduṭṭhena bhāsati vā karoti vā\ntato naṁ dukkhamanveti cakkaṁ va vahato padaṁ",
    meaning: "Mind precedes all mental states. Mind is their chief; they are mind-made. If with an impure mind a person speaks or acts, suffering follows him like the wheel that follows the foot of the ox.",
    source: "Dhammapada",
  },
  jain: {
    label: "Namokar Mantra",
    icon: "📖",
    original: "णमो अरिहंताणं णमो सिद्धाणं णमो आयरियाणं।\nणमो उवज्झायाणं णमो लोए सव्वसाहूणं॥",
    transliteration: "ṇamō arihantāṇaṁ ṇamō siddhāṇaṁ ṇamō āyariyāṇaṁ\nṇamō uvajjhāyāṇaṁ ṇamō lōē savvasāhūṇaṁ",
    meaning: "Obeisance to the Arihants, Obeisance to the Siddhas, Obeisance to the Acharyas. Obeisance to the Upadhyayas, Obeisance to all the Sadhus in the world.",
    source: "Sacred Mantra",
  },
};

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

  // Entrance + icon-glow motion — brings this page in line with the PWA
  // shloka modal (motion.div fade/slide/scale entrance, SacredGlowIcon
  // pulse on the icon wells), which this screen previously had none of.
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);
  const verseOpacity = useRef(new Animated.Value(0)).current;
  const verseTranslate = useRef(new Animated.Value(14)).current;
  const iconPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      const tradition = 'hindu';
      const fallback = GUEST_SHLOKAS[tradition] || GUEST_SHLOKAS.hindu;
      setSacredText(fallback);
      setProfile({
        userId: 'guest',
        timezone: 'UTC',
        shlokaStreak: 0,
        lastShlokaDate: null,
        tradition,
        userName: 'Atithi Seeker',
      });
      return;
    }

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

  // Verse-card entrance, once per loaded verse. Skipped under reduced
  // motion (card just renders at its final position/opacity).
  useEffect(() => {
    if (!sacredText) return;
    if (reducedMotion) {
      verseOpacity.setValue(1);
      verseTranslate.setValue(0);
      return;
    }
    verseOpacity.setValue(0);
    verseTranslate.setValue(14);
    Animated.parallel([
      Animated.timing(verseOpacity, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.spring(verseTranslate, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start();
  }, [sacredText, reducedMotion, verseOpacity, verseTranslate]);

  // Slow, continuous glow pulse behind the header icon well — mirrors the
  // PWA's SacredGlowIcon `animated` variant. Never starts under reduced
  // motion rather than starting and immediately being stopped.
  useEffect(() => {
    if (reducedMotion || !sacredText) return;
    iconPulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 0, duration: 1900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, sacredText, iconPulse]);

  const today = profile ? spiritualDate(profile.timezone) : null;
  const readToday = Boolean(profile && today && profile.lastShlokaDate === today);

  const markRead = useCallback(async () => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    if (!profile || !today || readToday || marking) return;

    setMarking(true);
    const previousProfile = profile;

    try {
      const response = await apiFetch('/api/native/shloka/read', { method: 'POST' });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`save failed (${response.status}): ${body.slice(0, 300)}`);
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
    } catch (err) {
      setProfile(previousProfile);
      console.error('markRead failed:', err);
      const message = err instanceof Error ? err.message : '';
      const isAuthError = message.includes('(401)') || message.includes('(403)');
      Alert.alert(
        "Could not save today's reading",
        isAuthError
          ? 'Your session expired. Please sign out and back in, then try again.'
          : 'Check your connection and try again.'
      );
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
          <BackButton variant="glass" />
          <View style={{ borderRadius: 26, padding: 22, backgroundColor: glass, borderWidth: 1, borderColor: border }}>
            <Text style={{ ...TYPE.hero, color: text }}>
              {"Could not load today's verse"}
            </Text>
            <Text style={{ marginTop: 8, color: dim, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 24 }}>
              Check your connection and try again.
            </Text>
            <PressableSurface
              haptic="selection"
              onPress={() => {
                setLoading(true);
                load()
                  .catch(() => setLoadError(true))
                  .finally(() => setLoading(false));
              }}
              style={{ marginTop: 18, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: brand }}
            >
              <Text style={{ color: isDark ? COLORS.darkBg : COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>Retry</Text>
            </PressableSurface>
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
          <PressableSurface
            haptic="selection"
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
          </PressableSurface>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PressableSurface
              haptic="selection"
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
              }}
            >
              {sharing ? <ActivityIndicator color={brand} /> : <Feather name="share-2" size={17} color={text} />}
            </PressableSurface>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingTop: 8, gap: 8 }}>
          <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 62,
                height: 62,
                borderRadius: 31,
                backgroundColor: brand,
                opacity: iconPulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.30] }),
                transform: [{ scale: iconPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
              }}
            />
            <View style={{ width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.brandSoft, borderWidth: 1, borderColor: border }}>
              <Text style={{ fontSize: 28 }}>{sacredText.icon}</Text>
            </View>
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

        <Animated.View
          style={{
            opacity: verseOpacity,
            transform: [{ translateY: verseTranslate }],
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
        </Animated.View>

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

        <PressableSurface
          accessibilityLabel={readToday ? 'Verse already read today' : 'Mark verse as read, earn 5 seva points'}
          disabled={readToday || marking}
          onPress={() => { void markRead(); }}
        >
          {readToday ? (
            <View
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                backgroundColor: glass,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Feather name="check-circle" size={18} color={brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: brand }}>Read today</Text>
            </View>
          ) : (
            // Warm gold gradient + tuned glow shadow — was a flat solid
            // `brand` fill, which read noticeably flatter than the PWA's
            // radiant gold CTA (rgba(250,199,117,0.90) with a matching
            // rgba(239,159,39,0.20) shadow bloom).
            <LinearGradient
              colors={isDark ? [COLORS.brandGoldDark, COLORS.brandGoldLight] : [COLORS.brandGoldLight, COLORS.brandGoldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                boxShadow: isDark ? '0 14px 30px rgba(197,160,89,0.28)' : '0 14px 30px rgba(216,138,28,0.30)',
              }}
            >
              {marking ? (
                <ActivityIndicator color={COLORS.ink} />
              ) : (
                <>
                  <Feather name="book-open" size={18} color={COLORS.ink} />
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: COLORS.ink }}>
                    Mark as read - earn 5 seva points
                  </Text>
                </>
              )}
            </LinearGradient>
          )}
        </PressableSurface>

        {readToday ? (
          <PressableSurface
            haptic="selection"
            accessibilityLabel="Share today's shloka"
            disabled={sharing}
            onPress={() => { void shareVerse(); }}
            style={{
              minHeight: MIN_TOUCH_TARGET + 6,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: border,
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            {sharing ? <ActivityIndicator color={brand} /> : <Feather name="share-2" size={17} color={brand} />}
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: brand }}>
              Share today's shloka
            </Text>
          </PressableSurface>
        ) : null}
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
              layout: 'sacredText',
              headlineValue: sacredText.original,
              title: "Today's Shloka",
              subtitle: sacredText.label,
              source: sacredText.source,
              caption: sacredText.meaning,
              userName: profile?.userName,
              date: today ?? undefined,
              footer: `${profile?.shlokaStreak ?? 1}-day sacred text streak`,
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
            <Text style={{ ...TYPE.hero, color: text, textAlign: 'center' }}>
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
            <PressableSurface
              haptic="selection"
              disabled={sharing}
              onPress={() => { void shareVerse(); }}
              style={{ marginTop: 12, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: theme.card, borderWidth: 1, borderColor: border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {sharing ? <ActivityIndicator color={brand} /> : <Feather name="share-2" size={15} color={brand} />}
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: brand }}>Share shloka</Text>
              </View>
            </PressableSurface>
            <PressableSurface
              haptic="selection"
              onPress={dismissCelebration}
              style={{ marginTop: 4, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: brand }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, color: COLORS.ink }}>Continue</Text>
            </PressableSurface>
          </Animated.View>
        </Animated.View>
      ) : null}

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Mark as Read"
        message="Sign in to save your sadhana read streak and earn Seva."
      />
    </Screen>
  );
}
