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
import { useRouter, type Href } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, SHADOWS, SPACING, themeColor } from '@/lib/constants';
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

export default function MoodScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);
  const MOODS = MOODS_CONFIG[isDark ? 'dark' : 'light'] || MOODS_CONFIG.dark;

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

  if (loading && step === 1) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.dim} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text, fontSize: 22, textAlign: 'center' }]}>
            Could not load Mood
          </Text>
          <Text style={[styles.subtitle, { color: theme.dim, textAlign: 'center' }]}>
            Check your connection and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading Mood"
            onPress={() => {
              loadStatus();
            }}
            style={[styles.retryBtn, { borderColor: theme.brand, marginTop: SPACING.xl, paddingHorizontal: SPACING.xxl }]}
          >
            <Text style={[styles.retryText, { color: theme.brand }]}>Retry</Text>
          </Pressable>
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a different mood"
            onPress={startOver}
            style={[styles.retryBtn, { borderColor: theme.brand, marginTop: SPACING.xxl, paddingHorizontal: SPACING.xxl }]}
          >
            <Text style={[styles.retryText, { color: theme.brand }]}>Log a different mood</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View mood insights"
            onPress={() => router.push('/my-progress/mood' as Href)}
            style={{ marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.dim }}>View mood insights</Text>
            <Feather name="arrow-right" size={14} color={theme.dim} />
          </Pressable>
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
          {step === 3 && !showReturn && "Recommendations for you"}
          {step === 3 && showReturn && "How do you feel now?"}
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
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                        },
                      ]}
                      onPress={() => handleAfterMoodPick(mood)}
                    >
                      <View style={[styles.glyphContainer, { backgroundColor: mood.bg, width: 48, height: 48, marginBottom: SPACING.sm }]}>
                        <MoodGlyph mood={mood.key} color={mood.colour} size={28} />
                      </View>
                      <Text style={[styles.moodLabel, { color: theme.text, fontSize: 14 }]}>
                        {mood.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip and finish check-in"
                  onPress={() => {
                    // showReturn is already true here, so finishFlow()'s
                    // own guard (!showReturn) falls through to the real
                    // complete-and-navigate path instead of re-triggering.
                    void finishFlow();
                  }}
                  style={{ marginTop: SPACING.lg, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.dim }}>Skip</Text>
                </Pressable>
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
                  returnRecs.map(rec => (
                    <Pressable key={rec.id} onPress={() => handleReturnRecClick(rec)}>
                      <Card tone="auto" style={[styles.recCard, { borderColor: afterMood.colour, borderWidth: 1 }]}>
                        <Text style={[styles.recTitle, { color: theme.text }]}>{rec.title}</Text>
                        <Text style={[styles.recDesc, { color: theme.dim }]}>{rec.description}</Text>
                      </Card>
                    </Pressable>
                  ))
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done, close mood check-in"
                  onPress={handleReturnDone}
                  style={[styles.finishBtn, { backgroundColor: theme.brand }]}
                >
                  <Text style={[styles.finishBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>Done</Text>
                </Pressable>
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
