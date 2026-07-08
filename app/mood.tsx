import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  StyleSheet,
  Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, SHADOWS, SPACING, themeColor } from '@/lib/constants';
import { MOODS_CONFIG, type MoodConfig } from '@/lib/mood-registry';
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

export default function MoodScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const MOODS = MOODS_CONFIG[isDark ? 'dark' : 'light'] || MOODS_CONFIG.dark;

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Mood, 2: Time, 3: Recommendations, 4: Done
  const [selectedMood, setSelectedMood] = useState<MoodConfig | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [checkinId, setCheckinId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [fetchingRecs, setFetchingRecs] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [moodStatus, setMoodStatus] = useState<MoodStatus | null>(null);
  const recommendationItems = Array.isArray(recommendations) ? recommendations : [];

  useEffect(() => {
    async function init() {
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
      }
      setLoading(false);
    }
    init();
  }, [MOODS]);

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

  const handleRecClick = async (rec: Recommendation) => {
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
    setLoading(true);
    if (checkinId) {
      await completeMoodSession(checkinId);
    }
    router.replace('/');
  };

  if (loading && step === 1) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (step === 4) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.dim} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text }]}>
            You checked in today.
          </Text>
          <Text style={[styles.subtitle, { color: theme.dim }]}>
            Return tomorrow for another reflection.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => {
            if (step === 3) setStep(2);
            else if (step === 2) setStep(1);
            else router.back();
          }} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.dim} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {step === 1 && "How are you feeling?"}
          {step === 2 && "How much time do you have?"}
          {step === 3 && "Recommendations for you"}
        </Text>

        {step === 1 && (
          <View style={styles.grid}>
            {MOODS.map(mood => (
              <Pressable
                key={mood.key}
                style={[
                  styles.moodCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                  },
                ]}
                onPress={() => handleMoodSelect(mood)}
              >
                <View style={[styles.glyphContainer, { backgroundColor: mood.bg }]}>
                  <MoodGlyph mood={mood.key} color={mood.colour} size={40} />
                </View>
                <Text style={[styles.moodLabel, { color: theme.text }]}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.list}>
            {TIME_OPTIONS.map(opt => (
              <Pressable key={opt.key} onPress={() => handleTimeSelect(opt.key)}>
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
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.list}>
            {fetchingRecs ? (
              <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
            ) : recommendationError ? (
              <Card tone="auto" style={styles.errorCard}>
                <Text style={[styles.recTitle, { color: theme.text }]}>Could not load recommendations</Text>
                <Text style={[styles.recDesc, { color: theme.dim }]}>
                  {recommendationError}
                </Text>
                <Pressable
                  style={[styles.retryBtn, { borderColor: theme.brand }]}
                  onPress={() => selectedTime && handleTimeSelect(selectedTime)}
                >
                  <Text style={[styles.retryText, { color: theme.brand }]}>Try again</Text>
                </Pressable>
              </Card>
            ) : recommendationItems.length === 0 ? (
              <Text style={[styles.subtitle, { color: theme.dim, textAlign: 'center', marginTop: 40 }]}>
                No recommendations found for this mood right now.
              </Text>
            ) : (
              recommendationItems.map(rec => (
                <Pressable key={rec.id} onPress={() => handleRecClick(rec)}>
                  <Card tone="auto" style={[styles.recCard, { borderColor: selectedMood?.colour, borderWidth: 1 }]}>
                    <Text style={[styles.recTitle, { color: theme.text }]}>
                      {rec.title}
                    </Text>
                    <Text style={[styles.recDesc, { color: theme.dim }]}>
                      {rec.description}
                    </Text>
                    <View style={styles.recMeta}>
                      <Text style={[styles.recMetaText, { color: selectedMood?.colour }]}>
                        {rec.type.toUpperCase()}
                      </Text>
                      {rec.duration && (
                        <Text style={[styles.recMetaText, { color: theme.dim }]}>
                          • {rec.duration}
                        </Text>
                      )}
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
            
            {!fetchingRecs && (
              <Pressable style={[styles.finishBtn, { backgroundColor: theme.brand }]} onPress={finishFlow}>
                <Text style={[styles.finishBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>Finish Check-in</Text>
              </Pressable>
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
    paddingBottom: SPACING.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: 28,
    marginBottom: SPACING.xxl,
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  moodCard: {
    width: '46%',
    margin: '2%',
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  moodLabel: {
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
  },
  list: {
    flexDirection: 'column',
    gap: SPACING.md,
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
    fontSize: 18,
    marginBottom: 4,
  },
  timeDesc: {
    fontFamily: FONTS.sans,
    fontSize: 14,
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
