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
  useWindowDimensions,
  View,
  StyleSheet,
  Linking
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { MotionView } from '@/components/ui/Motion';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, SPACING, TYPE, themeColor } from '@/lib/constants';
import { MOODS_CONFIG, findMoodConfig, type MoodConfig } from '@/lib/mood-registry';
import { MoodGlyph } from '@/components/mood/MoodGlyph';
import { resolveNativeRoute } from '@/lib/routes';
import {
  fetchMoodStatus,
  startMoodCheckin,
  fetchRecommendations,
  trackDiscoverAction,
  completeMoodSession,
  type Recommendation,
  type MoodStatus
} from '@/lib/mood';

const TIME_OPTIONS = [
  { key: 'short',  label: 'Just 5 minutes',       desc: 'A quick, focused practice',     emoji: '⚡' },
  { key: 'medium', label: 'About 15 minutes',      desc: 'A meaningful session',           emoji: '🕐' },
  { key: 'open',   label: 'I have all the time',   desc: 'Deep immersion today',           emoji: '∞' },
] as const;

const RECOMMENDATION_TIME: Record<string, string> = {
  stotram: '3min',
  katha: '5min',
  dhyana: '10min',
  discover: '5min',
  japa: '8min',
  pathshala: '5min',
  nitya: '10min',
};

const RECOMMENDATION_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  stotram: 'music',
  katha: 'book-open',
  dhyana: 'circle',
  discover: 'compass',
  japa: 'repeat',
  pathshala: 'layers',
  nitya: 'sunrise',
  darshan: 'radio',
  mandali: 'users',
  seva: 'heart',
};

const FIXED_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'fixed-darshan',
    title: 'Live Darshan',
    description: 'Witness sacred aarti live',
    href: '/live-darshan',
    type: 'darshan',
    duration: 'Live',
  },
  {
    id: 'fixed-mandali',
    title: 'Talk to Sangat',
    description: 'Share with your community',
    href: '/mandali',
    type: 'mandali',
    duration: 'Community',
  },
  {
    id: 'fixed-seva',
    title: 'Do Seva',
    description: 'Turn your mood into service',
    href: '/seva',
    type: 'seva',
    duration: 'Seva',
  },
];

const QUICK_CHIPS = [
  { label: 'Japa', href: '/japa' },
  { label: 'Nitya Karma', href: '/nitya-karma' },
  { label: 'Panchang', href: '/panchang' },
  { label: 'Live Darshan', href: '/live-darshan' },
] as const;

const FEATURED_ITEMS = [
  { title: 'Pathshala', desc: 'Study with a calm lesson', href: '/(tabs)/pathshala', icon: 'layers' },
] as const;

export default function MoodScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const { width: windowWidth } = useWindowDimensions();
  const moodCardWidth = Math.floor((Math.min(windowWidth, 430) - 72) / 3);
  const MOODS = MOODS_CONFIG[isDark ? 'dark' : 'light'] || MOODS_CONFIG.dark;
  const entrance = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(false);

  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Mood, 2: Time, 3: Recommendations, 4: Done
  const [selectedMood, setSelectedMood] = useState<MoodConfig | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [fetchingRecs, setFetchingRecs] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [moodStatus, setMoodStatus] = useState<MoodStatus | null>(null);
  const recommendationItems = Array.isArray(recommendations) ? recommendations : [];

  // "Mood Return" — tracks whether the user has actually opened a
  // recommendation this session. If they instead try to finish the
  // check-in without picking anything, finishFlow() shows an inline
  // "how do you feel now?" prompt first, matching the PWA's MoodReturn.tsx
  // (which triggers on the same condition: sheet closed from the
  // recommendations step, a checkin exists, and no action was clicked).
  const [actionClicked, setActionClicked] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [afterMood, setAfterMood] = useState<MoodConfig | null>(null);
  const [returnRecs, setReturnRecs] = useState<Recommendation[]>([]);
  const [returnRecsLoading, setReturnRecsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReducedMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    entrance.setValue(reducedMotion ? 1 : 0);
    if (reducedMotion) return;
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion, step]);

  useEffect(() => {
    if (reducedMotion) {
      shimmer.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, shimmer]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setInitError(false);
    const status = await fetchMoodStatus();
    if (status) {
      setMoodStatus(status);
      if (status.hasCompletedToday) {
        setStep(4);
      } else if (status.openSession && status.openSession.before_mood) {
        const m = MOODS.find(x => x.key === status.openSession!.before_mood);
        if (m) {
          setSelectedMood(m);
          setCheckinId(status.openSession.id);
          setStep(2);
        }
      }
    } else {
      setInitError(true);
    }
    setLoading(false);
  }, [MOODS]);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startOver = useCallback(() => {
    setStep(1);
    setSelectedMood(null);
    setSelectedTime(null);
    setCheckinId(null);
    setRecommendations([]);
    setRecommendationError(null);
    setActionClicked(false);
    setShowReturn(false);
    setAfterMood(null);
    setReturnRecs([]);
  }, []);

  const handleMoodSelect = async (mood: MoodConfig) => {
    setSelectedMood(mood);
    setLoading(true);
    const id = await startMoodCheckin(mood.key);
    if (id) {
      setCheckinId(id);
      setStep(2);
    }
    setLoading(false);
  };

  const handleTimeSelect = async (timeKey: string) => {
    setSelectedTime(timeKey);
    setStep(3);
    setFetchingRecs(true);
    setRecommendationError(null);
    const recs = await fetchRecommendations(selectedMood!.key, timeKey, checkinId!);
    if (recs.length === 0) {
      setRecommendationError('Recommendations could not be loaded. Please try again.');
    }
    setRecommendations(recs);
    setFetchingRecs(false);
  };

  const handleMoodOnly = async () => {
    if (!selectedMood) return;
    setLoading(true);
    try {
      let id = checkinId;
      if (!id) {
        id = await startMoodCheckin(selectedMood.key);
        if (id) setCheckinId(id);
      }

      if (!id) {
        Alert.alert('Could not save mood', 'Check your connection and try again.');
        return;
      }

      const saved = await completeMoodSession(id, 'mood_only');
      if (!saved) {
        Alert.alert('Could not save mood', 'Check your connection and try again.');
        return;
      }

      setMoodStatus({
        hasCompletedToday: true,
        hasDismissedToday: false,
        openSession: null,
        lastCompletedMood: selectedMood.key,
        hasLoggedMoodToday: true,
        lastMood: selectedMood.key,
      });
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleRecClick = async (rec: Recommendation) => {
    setActionClicked(true);
    if (checkinId) {
      trackDiscoverAction(checkinId, 'click', rec.type).catch(() => {});
    }
    if (rec.href.startsWith('/')) {
      router.push(resolveNativeRoute(rec.href, '/(tabs)'));
    } else {
      Linking.openURL(rec.href).catch(() => {});
    }
  };

  const finishFlow = async () => {
    // Mood Return — only fires from the recommendations step, only once,
    // and only if the user never actually clicked a recommendation this
    // session. Preserves the pre-existing behaviour otherwise (immediate
    // complete + navigate home).
    if (step === 3 && checkinId && !actionClicked && !showReturn) {
      setShowReturn(true);
      return;
    }

    setLoading(true);
    if (checkinId) {
      await completeMoodSession(checkinId);
    }
    router.replace('/');
  };

  const handleAfterMoodPick = async (mood: MoodConfig) => {
    setAfterMood(mood);
    if (checkinId) {
      completeMoodSession(checkinId, undefined, mood.key).catch(() => {});
    }
    setReturnRecsLoading(true);
    const recs = await fetchRecommendations(mood.key);
    setReturnRecs(recs.slice(0, 3));
    setReturnRecsLoading(false);
  };

  const handleReturnDone = () => {
    router.replace('/');
  };

  const handleReturnRecClick = (rec: Recommendation) => {
    if (rec.href.startsWith('/')) {
      router.push(resolveNativeRoute(rec.href, '/(tabs)'));
    } else {
      Linking.openURL(rec.href).catch(() => {});
    }
  };

  const renderRecommendationCard = (rec: Recommendation, index: number, compact = false) => {
    const activeMoodForCard = compact ? afterMood ?? selectedMood : selectedMood ?? afterMood;
    const accent = activeMoodForCard?.colour ?? theme.brand;
    const soft = activeMoodForCard?.bg ?? theme.brandSoft;
    const icon = RECOMMENDATION_ICON[rec.type] ?? 'sparkles';
    const time = rec.duration ?? RECOMMENDATION_TIME[rec.type] ?? '5 min';

    return (
      <View
        key={`${rec.id}-${index}`}
        style={{
          width: compact ? 168 : 154,
          borderRadius: 22,
          borderWidth: 1,
          overflow: 'hidden',
          backgroundColor: soft,
          borderColor: `${accent}26`,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        }}
      >
        <PressableSurface
          haptic="selection"
          accessibilityLabel={`Open ${rec.title}`}
          onPress={() => compact ? handleReturnRecClick(rec) : handleRecClick(rec)}
          style={{ minHeight: 178, padding: SPACING.md }}
        >
          <View style={[styles.pathIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
            <Feather name={icon} size={16} color={accent} />
          </View>
          <Text style={[styles.pathBadge, { color: accent }]} numberOfLines={1}>
            {time}
          </Text>
          <Text style={[styles.pathTitle, { color: theme.text }]} numberOfLines={2}>
            {rec.title}
          </Text>
          <Text style={[styles.pathDesc, { color: theme.dim }]} numberOfLines={2}>
            {rec.description}
          </Text>
          <Text style={[styles.pathAction, { color: accent }]} numberOfLines={1}>
            Open →
          </Text>
        </PressableSurface>
      </View>
    );
  };

  // Full-width row variant for the main step-3 recommendations list — gold
  // led (theme.brand), not mood-tinted, so this page reads as the same
  // "app DNA" gold used across Home (Begin Japa, Begin Today's Sadhana,
  // IconTile wells) rather than turning purple/blue/etc. depending on which
  // mood was picked. The compact horizontal-rail card above (used only by
  // the separate "how do you feel now?" return flow) is left as-is.
  const renderRecommendationRow = (rec: Recommendation, index: number) => {
    const icon = RECOMMENDATION_ICON[rec.type] ?? 'sparkles';
    const time = rec.duration ?? RECOMMENDATION_TIME[rec.type] ?? '5 min';

    return (
      <MotionView key={`${rec.id}-${index}`} animationKey={`rec-${rec.id}`} delay={80 + index * 60} distance={10}>
        <PressableSurface haptic="selection" accessibilityLabel={`Open ${rec.title}`} onPress={() => handleRecClick(rec)}>
          <Card tone="auto" style={styles.timeCard}>
            <View style={[styles.pathIcon, { width: 40, height: 40, borderRadius: 20, marginBottom: 0, marginRight: SPACING.lg, backgroundColor: `${theme.brand}26`, borderColor: `${theme.brand}47` }]}>
              <Feather name={icon} size={18} color={theme.brand} />
            </View>
            <View style={styles.timeTextContainer}>
              <Text style={[styles.timeTitle, { color: theme.text }]} numberOfLines={1}>
                {rec.title}
              </Text>
              <Text style={[styles.timeDesc, { color: theme.dim }]} numberOfLines={1}>
                {rec.description}
              </Text>
            </View>
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 11, color: theme.brand, textTransform: 'uppercase', letterSpacing: 0.6, marginRight: SPACING.md }}>
              {time}
            </Text>
            <Feather name="chevron-right" size={17} color={theme.dim} />
          </Card>
        </PressableSurface>
      </MotionView>
    );
  };

  const renderBackButton = (onPress?: () => void) => (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      onPress={onPress ?? (() => router.back())}
      style={[
        styles.backButton,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        },
      ]}
    >
      <Feather name="chevron-left" size={23} color={theme.text} />
    </Pressable>
  );

  if (loading && step === 1) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={styles.headerRow}>
          {renderBackButton()}
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (initError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={styles.headerRow}>
          {renderBackButton()}
        </View>
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text, fontSize: 22, textAlign: 'center' }]}>
            Could not load Mood
          </Text>
          <Text style={[styles.subtitle, { color: theme.dim, textAlign: 'center' }]}>
            Check your connection and try again.
          </Text>
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.brand, marginTop: SPACING.xl }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Retry loading Mood"
              onPress={() => {
                loadStatus();
              }}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl }}
            >
              <Text style={[styles.retryText, { color: theme.brand }]}>Retry</Text>
            </PressableSurface>
          </View>
        </View>
      </Screen>
    );
  }

  if (step === 4) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={styles.headerRow}>
          {renderBackButton()}
        </View>
        <View style={styles.center}>
          {moodStatus?.lastMood ? (
            <View style={[styles.glyphContainer, { backgroundColor: findMoodConfig(isDark, moodStatus.lastMood)?.bg ?? theme.card, marginBottom: SPACING.lg }]}>
              <MoodGlyph mood={moodStatus.lastMood} color={findMoodConfig(isDark, moodStatus.lastMood)?.colour ?? theme.brand} size={40} />
            </View>
          ) : null}
          <Text
            style={[styles.title, { color: theme.text, fontSize: 22, textAlign: 'center', marginBottom: SPACING.sm }]}
            accessibilityLabel={
              moodStatus?.lastMood
                ? `You felt ${findMoodConfig(isDark, moodStatus.lastMood)?.label ?? moodStatus.lastMood} today. You can log a different mood.`
                : 'You checked in today. You can log a different mood.'
            }
          >
            {moodStatus?.lastMood
              ? `You felt ${findMoodConfig(isDark, moodStatus.lastMood)?.label ?? moodStatus.lastMood} today`
              : 'You checked in today.'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.dim, textAlign: 'center' }]}>
            Return tomorrow for another reflection.
          </Text>

          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.brand, marginTop: SPACING.xxl }}>
            <PressableSurface
              haptic="selection"
              accessibilityLabel="Log a different mood"
              onPress={startOver}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl }}
            >
              <Text style={[styles.retryText, { color: theme.brand }]}>Log a different mood</Text>
            </PressableSurface>
          </View>

          <PressableSurface
            haptic="selection"
            accessibilityLabel="View mood insights"
            onPress={() => router.push('/my-progress/mood' as Href)}
            style={{ marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.dim }}>View mood insights</Text>
            <Feather name="arrow-right" size={14} color={theme.dim} />
          </PressableSurface>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          {renderBackButton(() => {
            if (step === 3) setStep(2);
            else if (step === 2) setStep(1);
            else router.back();
          })}
          {step !== 1 ? (
            <View style={{ borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }}>
              <PressableSurface
                haptic="selection"
                accessibilityLabel="Restart mood check-in"
                onPress={startOver}
                style={{ minHeight: 38, paddingHorizontal: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Feather name="rotate-ccw" size={13} color={theme.dim} />
                <Text style={[styles.resetText, { color: theme.dim }]}>Change mood</Text>
              </PressableSurface>
            </View>
          ) : null}
        </View>

        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          }}
        >
          <Text style={[styles.eyebrow, { color: theme.dim }]}>Mood-based guidance</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {step === 1 && "How are you feeling?"}
            {step === 2 && "How much time do you have?"}
            {step === 3 && !showReturn && "Recommendations for you"}
            {step === 3 && showReturn && "How do you feel now?"}
          </Text>
          {step === 1 ? (
            <Text style={[styles.subtitle, { color: theme.dim, marginTop: -SPACING.lg, marginBottom: SPACING.xl }]}>
              Pick what&apos;s closest to your state right now.
            </Text>
          ) : null}
        </Animated.View>

        {step === 1 && (
          <Animated.View
            style={[
              styles.grid,
              {
                opacity: entrance,
                transform: [
                  {
                    scale: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {MOODS.map(mood => (
              <Pressable
                key={mood.key}
                accessibilityRole="button"
                accessibilityLabel={`I feel ${mood.label}`}
                style={[
                  styles.moodCard,
                  {
                    width: moodCardWidth,
                    backgroundColor: isDark ? 'rgba(255, 248, 225, 0.05)' : COLORS.homeRaisedLight,
                    borderColor: isDark ? `${mood.colour}30` : COLORS.homeBorderSoftLight,
                    boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
                  },
                ]}
                onPress={() => handleMoodSelect(mood)}
              >
                <View pointerEvents="none" style={[styles.moodGlow, { backgroundColor: isDark ? mood.bg : 'rgba(216,138,28,0.10)' }]} />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.moodGlint,
                    {
                      opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] }),
                      transform: [
                        {
                          translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-80, 90],
                          }),
                        },
                        { rotate: '18deg' },
                      ],
                    },
                  ]}
                />
                <View pointerEvents="none" style={[styles.sparkle, styles.sparkleOne, { backgroundColor: mood.colour }]} />
                <View pointerEvents="none" style={[styles.sparkle, styles.sparkleTwo, { backgroundColor: mood.colour }]} />
                <View style={[styles.glyphContainer, { backgroundColor: mood.bg, borderColor: `${mood.colour}33` }]}>
                  <MoodGlyph mood={mood.key} color={mood.colour} size={30} />
                </View>
                <Text style={[styles.moodLabel, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}

            <View style={styles.belowFold}>
              <Text style={[styles.sectionEyebrow, { color: theme.dim }]}>Quick explore</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {QUICK_CHIPS.map((chip) => (
                  <Pressable
                    key={chip.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${chip.label}`}
                    onPress={() => router.push(resolveNativeRoute(chip.href, '/(tabs)'))}
                    style={[
                      styles.quickChip,
                      {
                        backgroundColor: isDark ? theme.brandSoft : 'rgba(216,138,28,0.12)',
                        borderColor: isDark ? theme.border : COLORS.homeBorderSoftLight,
                      },
                    ]}
                  >
                    <Text style={[styles.quickChipText, { color: theme.brand }]}>{chip.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.sectionEyebrow, { color: theme.dim, marginTop: SPACING.lg }]}>Featured</Text>
              <View style={styles.featureGrid}>
                {FEATURED_ITEMS.map((item) => (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    onPress={() => router.push(resolveNativeRoute(item.href, '/(tabs)'))}
                    style={[
                      styles.featureCard,
                      {
                        backgroundColor: isDark ? COLORS.cardBgDark : COLORS.homeRaisedLight,
                        borderColor: isDark ? theme.border : COLORS.homeBorderSoftLight,
                        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                      },
                    ]}
                  >
                    <View pointerEvents="none" style={[styles.featureGlow, { backgroundColor: theme.brandSoft }]} />
                    <Feather name={item.icon as keyof typeof Feather.glyphMap} size={24} color={theme.brand} />
                    <Text style={[styles.featureTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.featureDesc, { color: theme.dim }]}>{item.desc}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <View style={styles.list}>
            {selectedMood ? (
              <MotionView animationKey={`mood-${selectedMood.key}`} distance={10}>
                <View style={styles.selectedMoodWrap}>
                  <View
                    style={[
                      styles.selectedMoodIcon,
                      { backgroundColor: selectedMood.bg, borderColor: `${selectedMood.colour}35` },
                    ]}
                  >
                    <MoodGlyph mood={selectedMood.key} color={selectedMood.colour} size={36} />
                  </View>
                  <Text style={[styles.selectedMoodLabel, { color: theme.dim }]}>You&apos;re feeling</Text>
                  <Text style={[styles.selectedMoodTitle, { color: selectedMood.colour }]}>{selectedMood.label}</Text>
                </View>
              </MotionView>
            ) : null}
            {TIME_OPTIONS.map((opt, index) => (
              <MotionView key={opt.key} animationKey={`time-${opt.key}`} delay={80 + index * 60} distance={10}>
                <PressableSurface haptic="selection" onPress={() => handleTimeSelect(opt.key)}>
                  <Card tone="auto" style={styles.timeCard}>
                    <Text style={styles.timeEmoji}>{opt.emoji}</Text>
                    <View style={styles.timeTextContainer}>
                      <Text style={[styles.timeTitle, { color: theme.text }]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.timeDesc, { color: theme.dim }]}>
                        {opt.desc}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={17} color={theme.dim} />
                  </Card>
                </PressableSurface>
              </MotionView>
            ))}
            <MotionView animationKey="mood-only" delay={80 + TIME_OPTIONS.length * 60} distance={10}>
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  backgroundColor: selectedMood?.bg ?? theme.card,
                  borderColor: selectedMood?.colour ?? theme.premiumBorder,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="Save mood without recommendations"
                  onPress={handleMoodOnly}
                  disabled={loading}
                  style={{
                    minHeight: MIN_TOUCH_TARGET,
                    padding: SPACING.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACING.md,
                  }}
                >
                  <View style={[styles.moodOnlyIcon, { backgroundColor: `${selectedMood?.colour ?? theme.brand}18` }]}>
                    <Feather name="check" size={16} color={selectedMood?.colour ?? theme.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.moodOnlyTitle, { color: theme.text }]}>Just set my mood</Text>
                    <Text style={[styles.moodOnlyDesc, { color: theme.dim }]}>Save today&apos;s mood without recommendations</Text>
                  </View>
                  {loading ? <ActivityIndicator size="small" color={selectedMood?.colour ?? theme.brand} /> : null}
                </PressableSurface>
              </View>
            </MotionView>
          </View>
        )}

        {step === 3 && showReturn && (
          <View style={styles.list}>
            {!afterMood ? (
              <>
                <Text style={[styles.subtitle, { color: theme.dim, marginBottom: SPACING.md }]}>
                  Before you go — how do you feel now, compared to when you started?
                </Text>
                <View style={styles.grid}>
                  {MOODS.map(mood => (
                    <Pressable
                      key={mood.key}
                      accessibilityRole="button"
                      accessibilityLabel={`I feel ${mood.label} now`}
                      style={[
                        styles.moodCard,
                        {
                          width: moodCardWidth,
                          backgroundColor: isDark ? 'rgba(255, 248, 225, 0.05)' : COLORS.homeRaisedLight,
                          borderColor: isDark ? theme.border : COLORS.homeBorderSoftLight,
                          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                        },
                      ]}
                      onPress={() => handleAfterMoodPick(mood)}
                    >
                        <View style={[styles.glyphContainer, { backgroundColor: mood.bg, borderColor: `${mood.colour}33`, width: 52, height: 52, borderRadius: 26, marginBottom: SPACING.sm }]}>
                        <MoodGlyph mood={mood.key} color={mood.colour} size={26} />
                      </View>
                      <Text style={[styles.moodLabel, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.84}>
                        {mood.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <PressableSurface
                  haptic="selection"
                  accessibilityLabel="Skip and finish check-in"
                  onPress={() => {
                    // showReturn is already true here, so finishFlow()'s
                    // own guard (!showReturn) falls through to the real
                    // complete-and-navigate path instead of re-triggering.
                    void finishFlow();
                  }}
                  style={{ marginTop: SPACING.lg, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.dim }}>Skip</Text>
                </PressableSurface>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.md }}>
                  <View style={[styles.glyphContainer, { backgroundColor: afterMood.bg, width: 36, height: 36 }]}>
                    <MoodGlyph mood={afterMood.key} color={afterMood.colour} size={20} />
                  </View>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: afterMood.colour, flex: 1 }}>
                    {afterMood.label} — explore for this
                  </Text>
                </View>

                {returnRecsLoading ? (
                  <ActivityIndicator size="small" color={theme.brand} style={{ marginVertical: SPACING.lg }} />
                ) : returnRecs.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathRail}>
                    {returnRecs.map((rec, index) => renderRecommendationCard(rec, index, true))}
                  </ScrollView>
                ) : null}

                <View style={{ borderRadius: 12, backgroundColor: theme.brand, marginTop: SPACING.xxl }}>
                  <PressableSurface
                    accessibilityLabel="Done, close mood check-in"
                    onPress={handleReturnDone}
                    style={{ padding: SPACING.lg, alignItems: 'center' }}
                  >
                    <Text style={[styles.finishBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>Done</Text>
                  </PressableSurface>
                </View>
              </>
            )}
          </View>
        )}

        {step === 3 && !showReturn && (
          <View style={styles.list}>
            {fetchingRecs ? (
              <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
            ) : recommendationError ? (
              <Card tone="auto" style={styles.errorCard}>
                <Text style={[styles.recTitle, { color: theme.text }]}>Could not load recommendations</Text>
                <Text style={[styles.recDesc, { color: theme.dim }]}>
                  {recommendationError}
                </Text>
                <View style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.brand, marginTop: SPACING.sm }}>
                  <PressableSurface
                    haptic="selection"
                    style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => selectedTime && handleTimeSelect(selectedTime)}
                  >
                    <Text style={[styles.retryText, { color: theme.brand }]}>Try again</Text>
                  </PressableSurface>
                </View>
              </Card>
            ) : recommendationItems.length === 0 ? (
              <Text style={[styles.subtitle, { color: theme.dim, textAlign: 'center', marginTop: 40 }]}>
                No recommendations found for this mood right now.
              </Text>
            ) : (
              <>
                <MotionView animationKey="path-intro" distance={10}>
                  <View style={styles.pathIntro}>
                    {selectedMood ? (
                      <View style={[styles.glyphContainer, { backgroundColor: selectedMood.bg, width: 46, height: 46, borderRadius: 23, marginBottom: 0 }]}>
                        <MoodGlyph mood={selectedMood.key} color={selectedMood.colour} size={23} />
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pathIntroTitle, { color: theme.text }]}>A small path for this mood</Text>
                      <Text style={[styles.pathIntroDesc, { color: theme.dim }]}>Choose one practice, or finish after simply naming the mood.</Text>
                    </View>
                  </View>
                </MotionView>
                <View style={{ gap: SPACING.md, marginTop: SPACING.sm }}>
                  {[...recommendationItems.slice(0, 4), ...FIXED_RECOMMENDATIONS].map((rec, index) => renderRecommendationRow(rec, index))}
                </View>
              </>
            )}

            {!fetchingRecs && (
              <MotionView animationKey="finish-checkin" delay={80 + ([...recommendationItems.slice(0, 4), ...FIXED_RECOMMENDATIONS].length) * 60} distance={10}>
                <View style={{ borderRadius: 12, backgroundColor: theme.brand, marginTop: SPACING.xxl }}>
                  <PressableSurface style={{ padding: SPACING.lg, alignItems: 'center' }} onPress={finishFlow}>
                    <Text style={[styles.finishBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>Finish Check-in</Text>
                  </PressableSurface>
                </View>
              </MotionView>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.xxl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetPill: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetText: {
    ...TYPE.caption,
    fontFamily: FONTS.sansSemiBold,
  },
  title: {
    ...TYPE.screenTitle,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  eyebrow: {
    ...TYPE.chip,
    textTransform: 'uppercase',
    letterSpacing: 2.1,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SPACING.sm,
  },
  moodCard: {
    minHeight: 116,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glyphContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  moodLabel: {
    ...TYPE.caption,
    fontFamily: FONTS.sansSemiBold,
    textAlign: 'center',
    maxWidth: '100%',
  },
  moodGlow: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    top: -46,
    left: -46,
    opacity: 0.58,
  },
  moodGlint: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 26,
    backgroundColor: COLORS.brandAccentLight,
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.48,
  },
  sparkleOne: {
    top: 22,
    right: 22,
  },
  sparkleTwo: {
    bottom: 26,
    right: 28,
  },
  belowFold: {
    width: '100%',
    marginTop: SPACING.xl,
  },
  sectionEyebrow: {
    ...TYPE.chip,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  quickChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    ...TYPE.caption,
    fontFamily: FONTS.sansSemiBold,
  },
  featureGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  featureCard: {
    flex: 1,
    minHeight: 118,
    borderRadius: 21,
    borderWidth: 1,
    padding: SPACING.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  featureGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    top: -28,
    right: -20,
    opacity: 0.8,
  },
  featureTitle: {
    ...TYPE.body,
    fontFamily: FONTS.sansSemiBold,
    marginTop: SPACING.md,
  },
  featureDesc: {
    ...TYPE.caption,
    marginTop: 2,
  },
  list: {
    flexDirection: 'column',
    gap: SPACING.md,
  },
  selectedMoodWrap: {
    alignItems: 'center',
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.lg,
  },
  selectedMoodIcon: {
    width: 64,
    height: 64,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  selectedMoodLabel: {
    ...TYPE.caption,
    fontFamily: FONTS.sansMedium,
    marginBottom: 2,
  },
  selectedMoodTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 24,
    lineHeight: 30,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  timeEmoji: {
    fontSize: 32,
    marginRight: SPACING.lg,
  },
  timeTextContainer: {
    flex: 1,
  },
  timeTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  timeDesc: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  moodOnlyButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 18,
    borderWidth: 1,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  moodOnlyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodOnlyTitle: {
    ...TYPE.body,
    fontFamily: FONTS.sansSemiBold,
  },
  moodOnlyDesc: {
    ...TYPE.caption,
    marginTop: 2,
  },
  pathIntro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  pathIntroTitle: {
    ...TYPE.body,
    fontFamily: FONTS.sansSemiBold,
  },
  pathIntroDesc: {
    ...TYPE.caption,
    marginTop: 2,
  },
  pathRail: {
    gap: SPACING.md,
    paddingRight: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
  pathCard: {
    minHeight: 178,
    borderRadius: 22,
    borderWidth: 1,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  pathIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  pathBadge: {
    ...TYPE.chip,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: SPACING.xs,
  },
  pathTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 4,
  },
  pathDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  pathAction: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    marginTop: SPACING.sm,
  },
  recCard: {
    padding: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  recTitle: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 18,
    marginBottom: SPACING.xs,
  },
  recDesc: {
    fontFamily: FONTS.sans,
    fontSize: 15,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  recMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recMetaText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  errorCard: {
    padding: SPACING.xl,
  },
  retryBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  retryText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
  },
  finishBtn: {
    marginTop: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 16,
  }
});
