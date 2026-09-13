import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/ui/Card';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';
import { isGuestMode } from '@/lib/guestSession';
import { AuthGate } from '@/components/ui/AuthGate';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

const TRADITION_EMOJI: Record<Tradition, string> = {
  hindu: '🕉️',
  sikh: '☬',
  buddhist: '☸️',
  jain: '🤲',
};

type DailyQuiz = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string | null;
  fact?: string | null;
  source?: string | null;
  tradition: string;
  date: string;
  daily_quiz_id?: string | null;
};

type TodayResponse = {
  chosen_index: number;
  correct_index: number;
  is_correct: boolean;
  explanation: string | null;
  question: string;
  date: string;
};

type QuizSaveData = {
  success: boolean;
  karma_earned: number;
  streak: number;
  streak_milestone?: string | null;
};

type QuizState = {
  quiz: DailyQuiz | null;
  todayResponse: TodayResponse | null;
  tradition: Tradition;
  timezone: string;
  userName: string;
};

const DEFAULT_STATE: QuizState = {
  quiz: null,
  todayResponse: null,
  tradition: 'hindu',
  timezone: 'UTC',
  userName: 'Seeker',
};

export default function QuizScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = themeColor(isDark);

  const [state, setState] = useState<QuizState>(DEFAULT_STATE);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [saveData, setSaveData] = useState<QuizSaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [authGateVisible, setAuthGateVisible] = useState(false);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const quizAccent = COLORS.tilePurple;
  const quizSoft = isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight;
  const quizBorder = COLORS.tilePurpleBorder;
  const spiritualToday = useMemo(() => spiritualDate(state.timezone), [state.timezone]);

  const loadQuiz = useCallback(async () => {
    const guest = await isGuestMode();
    setIsGuest(guest);

    if (guest) {
      const tradition: Tradition = 'hindu';
      const timezone = 'UTC';
      const userName = 'Atithi Seeker';
      const today = spiritualDate(timezone);
      const quizResponse = await apiFetch(`/api/quiz/daily?tradition=${tradition}&date=${today}&language=en`);
      const quizData = quizResponse.ok ? ((await quizResponse.json()) as DailyQuiz) : null;

      setState({
        timezone,
        userName,
        tradition,
        quiz: quizData,
        todayResponse: null,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('tradition, timezone, full_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const tradition = (profile?.tradition ?? 'hindu') as Tradition;
    const timezone = profile?.timezone ?? 'UTC';
    const userName = profile?.full_name || profile?.username || 'Seeker';
    const today = spiritualDate(timezone);

    const [quizResponse, savedResponse] = await Promise.all([
      apiFetch(`/api/quiz/daily?tradition=${tradition}&date=${today}&language=en`),
      supabase
        .from('quiz_responses')
        .select('chosen_index, correct_index, is_correct, explanation, question, date')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
    ]);

    const quizData = quizResponse.ok ? ((await quizResponse.json()) as DailyQuiz) : null;
    const responseData = savedResponse.data
      ? ({
          chosen_index: savedResponse.data.chosen_index,
          correct_index: savedResponse.data.correct_index,
          is_correct: savedResponse.data.is_correct,
          explanation: savedResponse.data.explanation,
          question: savedResponse.data.question,
          date: savedResponse.data.date,
        } satisfies TodayResponse)
      : null;

    setState({
      quiz: quizData,
      todayResponse: responseData,
      tradition,
      timezone,
      userName,
    });
    setSelectedAnswer(responseData?.chosen_index ?? null);
    setSaveData(null);
  }, [router]);

  useEffect(() => {
    setLoading(true);
    loadQuiz()
      .catch(() => {
        Alert.alert("Could not load today's quiz");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadQuiz]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadQuiz();
    } catch {
      Alert.alert('Could not refresh quiz');
    } finally {
      setRefreshing(false);
    }
  }, [loadQuiz]);

  const answeredToday = Boolean(state.todayResponse) || selectedAnswer !== null;
  const activeQuiz = state.quiz;
  const correctIndex = state.todayResponse?.correct_index ?? activeQuiz?.answerIndex ?? null;
  const isCorrect = correctIndex !== null && selectedAnswer === correctIndex;
  const traditionLabel = state.tradition.charAt(0).toUpperCase() + state.tradition.slice(1);
  const traditionEmoji = TRADITION_EMOJI[state.tradition] ?? '🕉️';

  const handleAnswer = async (index: number) => {
    if (isGuest) {
      setAuthGateVisible(true);
      return;
    }
    if (!activeQuiz || answeredToday || saving) {
      return;
    }

    setSelectedAnswer(index);
    setSaving(true);

    try {
      const response = await apiFetch('/api/quiz/save', {
        method: 'POST',
        body: JSON.stringify({
          question: activeQuiz.question,
          chosen_index: index,
          correct_index: activeQuiz.answerIndex,
          is_correct: index === activeQuiz.answerIndex,
          tradition: state.tradition,
          explanation: activeQuiz.explanation ?? null,
          daily_quiz_id: activeQuiz.daily_quiz_id ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error('save failed');
      }

      const data = (await response.json()) as QuizSaveData;
      setSaveData(data);
      if (index === activeQuiz.answerIndex && data.karma_earned > 0) {
        setShowConfetti(true);
      }
      setState((current) => ({
        ...current,
        todayResponse: {
          chosen_index: index,
          correct_index: activeQuiz.answerIndex,
          is_correct: index === activeQuiz.answerIndex,
          explanation: activeQuiz.explanation ?? null,
          question: activeQuiz.question,
          date: spiritualToday,
        },
      }));
    } catch {
      Alert.alert('Could not save your answer');
      setSelectedAnswer(null);
    } finally {
      setSaving(false);
    }
  };

  const quizShareCardRef = useRef<View>(null);

  const handleShare = async () => {
    if (!answeredToday || !activeQuiz) {
      return;
    }

    const karmaEarned = saveData?.karma_earned ?? (state.todayResponse?.is_correct ? 10 : 2);
    const streak = saveData?.streak ?? 1;
    const pointsText = `${karmaEarned} point${karmaEarned !== 1 ? 's' : ''}`;
    const streakText = `${streak} day${streak !== 1 ? 's' : ''}`;

    await shareCapturedShoonayaCard(quizShareCardRef, {
      fileName: 'shoonaya-quiz-card.png',
      dialogTitle: 'Share Daily Quiz result',
      fallbackMessage: `I completed today's Daily Quiz with Shoonaya! Result: ${isCorrect ? 'Correct' : 'Not this time'}. Earned ${pointsText}. Streak: ${streakText}.`,
    });
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: surface, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="quiz"
          title="Preparing Daily Dharma Quiz"
          subtitle="Testing wisdom across scriptures and timeless traditions..."
          showBack={true}
        />
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: surface }}>
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
      
      {/* Ambient Top Glow Backdrop */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -30,
          alignSelf: 'center',
          width: 320,
          height: 180,
          borderRadius: 160,
          backgroundColor: isDark ? 'rgba(165,148,224,0.08)' : 'rgba(165,148,224,0.12)',
          transform: [{ scaleX: 1.5 }],
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
      >
        {/* Sleek Top Navigation Bar with Cross Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel="Close Daily Quiz"
            haptic="selection"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.glass,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            }}
          >
            <Feather name="x" size={19} color={theme.text} />
          </PressableSurface>

          <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 10 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 18, textAlign: 'center' }}>
              Daily Spark
            </Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
              Jñāna Sadhana · ज्ञान साधना
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: quizSoft,
              borderWidth: 1,
              borderColor: quizBorder,
            }}
          >
            <Feather name="zap" size={13} color={quizAccent} />
            <Text style={{ color: quizAccent, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
              +10 Seva
            </Text>
          </View>
        </View>

        {/* Question Card */}
        {activeQuiz ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 18, overflow: 'hidden' }}>
            <LinearGradient
              colors={isDark ? [COLORS.tilePurpleBgDark, COLORS.cardBgDark] : [COLORS.tilePurpleBgLight, COLORS.cardBgLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: quizSoft,
                    borderWidth: 1,
                    borderColor: quizBorder,
                  }}
                >
                  <Feather name="help-circle" size={22} color={quizAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: quizAccent,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 11,
                      letterSpacing: 1.6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Daily Spark
                  </Text>
                  <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 13 }} numberOfLines={1}>
                    {traditionEmoji} {traditionLabel} · Daily Shastra
                  </Text>
                </View>
              </View>
              {answeredToday ? (
                <View
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    backgroundColor: isCorrect ? COLORS.successBg : COLORS.dangerBg,
                    borderWidth: 1,
                    borderColor: isCorrect ? COLORS.successBorder : COLORS.dangerBorder,
                  }}
                >
                  <Text
                    style={{
                      color: isCorrect ? COLORS.success : COLORS.danger,
                      fontFamily: FONTS.sansSemiBold,
                      fontSize: 12,
                    }}
                  >
                    {isCorrect ? 'Correct · +10' : 'Answered · +2'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: text, ...TYPE.hero, lineHeight: 32 }}>{activeQuiz.question}</Text>
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: quizSoft,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: quizAccent,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                  Question 1 of 1
                </Text>
                {!answeredToday ? (
                  <Text style={{ color: quizAccent, fontFamily: FONTS.sansMedium, fontSize: 11 }}>
                    Earn +10 Karma points
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ gap: 11 }}>
              {activeQuiz.options.map((option, index) => {
                const wasChosen = selectedAnswer === index;
                const isAnswerCorrect = correctIndex === index;
                const showFeedback = answeredToday && correctIndex !== null;

                const letter = String.fromCharCode(65 + index);
                let backgroundColor: string = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
                let borderColor: string = quizBorder;
                let optionText: string = text;
                let letterBg: string = quizSoft;
                let letterColor: string = quizAccent;

                if (showFeedback && isAnswerCorrect) {
                  backgroundColor = COLORS.successBg;
                  borderColor = COLORS.successBorder;
                  optionText = COLORS.success;
                  letterBg = COLORS.success;
                  letterColor = COLORS.creamBg;
                } else if (showFeedback && wasChosen && !isAnswerCorrect) {
                  backgroundColor = COLORS.dangerBg;
                  borderColor = COLORS.dangerBorder;
                  optionText = COLORS.danger;
                  letterBg = COLORS.danger;
                  letterColor = COLORS.creamBg;
                }

                return (
                  <PressableSurface
                    key={`${option}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${option}. ${showFeedback ? (isAnswerCorrect ? 'Correct answer' : (wasChosen ? 'Incorrect answer' : '')) : ''}`}
                    onPress={() => {
                      void handleAnswer(index);
                    }}
                    disabled={answeredToday || saving}
                    haptic="selection"
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor,
                      backgroundColor,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: letterBg,
                      }}
                    >
                      <Text style={{ color: letterColor, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{letter}</Text>
                    </View>
                    <Text style={{ flex: 1, color: optionText, fontFamily: FONTS.sansMedium, fontSize: 15, lineHeight: 21 }}>
                      {option}
                    </Text>
                    {showFeedback && isAnswerCorrect ? (
                      <Feather name="check" size={18} color={COLORS.success} />
                    ) : null}
                    {showFeedback && wasChosen && !isAnswerCorrect ? (
                      <Feather name="x" size={18} color={COLORS.danger} />
                    ) : null}
                  </PressableSurface>
                );
              })}
            </View>

            {answeredToday ? (
              <View
                style={{
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: isCorrect ? COLORS.successBorder : quizBorder,
                  backgroundColor: isCorrect ? COLORS.successBg : quizSoft,
                  padding: 16,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="book-open" size={14} color={isCorrect ? COLORS.success : quizAccent} />
                  <Text style={{ color: isCorrect ? COLORS.success : quizAccent, fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    Today&apos;s Wisdom
                  </Text>
                </View>
                {activeQuiz.fact ? (
                  <Text style={{ color: text, ...TYPE.cardHeading, lineHeight: 24 }}>
                    {activeQuiz.fact}
                  </Text>
                ) : null}
                <Text style={{ color: isCorrect ? COLORS.success : text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  {isCorrect ? 'Sadhu! Your reflection holds true.' : 'The question stays with you. That is the teaching.'}
                </Text>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>
                  {state.todayResponse?.explanation ?? activeQuiz.explanation ?? 'Your answer has been recorded for today.'}
                </Text>
                {activeQuiz.source ? (
                  <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>
                    Source: {activeQuiz.source}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border }}>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>No quiz is available right now.</Text>
          </Card>
        )}

        {/* Post-Answer Result & Score Card */}
        {answeredToday ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 14, overflow: 'hidden' }}>
            <LinearGradient
              colors={isDark ? [COLORS.cardBgDark, COLORS.tilePurpleBgDark] : [COLORS.cardBgLight, COLORS.tilePurpleBgLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCorrect ? COLORS.successBg : quizSoft,
                  borderWidth: 1,
                  borderColor: isCorrect ? COLORS.successBorder : quizBorder,
                }}
              >
                <Feather name={isCorrect ? 'award' : 'book-open'} size={22} color={isCorrect ? COLORS.success : quizAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: text, ...TYPE.title }}>Today&apos;s Sadhana Score</Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 19 }}>
                  {saveData?.karma_earned === 0
                    ? 'Points already claimed for today'
                    : `${saveData?.karma_earned ?? (state.todayResponse?.is_correct ? 10 : 2)} Seva Karma earned`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 12,
                  backgroundColor: quizSoft,
                  borderWidth: 1,
                  borderColor: quizBorder,
                }}
              >
                <Text style={{ color: quizAccent, fontFamily: FONTS.sansSemiBold, fontSize: 18 }}>
                  {saveData?.streak ?? 1}
                </Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Day streak
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 12,
                  backgroundColor: isCorrect ? COLORS.successBg : COLORS.dangerBg,
                  borderWidth: 1,
                  borderColor: isCorrect ? COLORS.successBorder : COLORS.dangerBorder,
                }}
              >
                <Text style={{ color: isCorrect ? COLORS.success : COLORS.danger, fontFamily: FONTS.sansSemiBold, fontSize: 18 }}>
                  {isCorrect ? 'Yes' : 'No'}
                </Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Correct
                </Text>
              </View>
            </View>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Share your quiz result"
              onPress={() => {
                void handleShare();
              }}
              style={{
                marginTop: 2,
                borderRadius: 16,
                backgroundColor: brand,
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Share result</Text>
            </PressableSurface>
          </Card>
        ) : null}

        {/* Sadhana Rewards & Streak Overview Card */}
        <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="award" size={17} color={brand} />
              <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 16 }}>
                Jñāna Sadhana Benefits
              </Text>
            </View>
            <View
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(197,160,89,0.12)' : 'rgba(197,160,89,0.18)',
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 11 }}>Daily Karma</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? COLORS.surfaceSoftDark : COLORS.surfaceSoftLight,
                borderWidth: 1,
                borderColor: isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight,
                gap: 4,
              }}
            >
              <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 17 }}>+10</Text>
              <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Seva Karma</Text>
            </View>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? COLORS.surfaceSoftDark : COLORS.surfaceSoftLight,
                borderWidth: 1,
                borderColor: isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight,
                gap: 4,
              }}
            >
              <Text style={{ color: quizAccent, fontFamily: FONTS.sansSemiBold, fontSize: 17 }}>
                {saveData?.streak ?? (answeredToday ? 1 : 0)}
              </Text>
              <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Day Streak</Text>
            </View>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 16,
                backgroundColor: isDark ? COLORS.surfaceSoftDark : COLORS.surfaceSoftLight,
                borderWidth: 1,
                borderColor: isDark ? COLORS.borderSoftDark : COLORS.borderSoftLight,
                gap: 4,
              }}
            >
              <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }} numberOfLines={1}>
                {traditionLabel}
              </Text>
              <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 11 }}>Tradition</Text>
            </View>
          </View>
        </Card>

        {/* Sacred Scriptural Wisdom & Reflection (Shastra Vichar) */}
        <Card
          tone="auto"
          style={{
            backgroundColor: isDark ? COLORS.homeRaisedDark : COLORS.homeRaisedLight,
            borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
            gap: 10,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? ['rgba(197,160,89,0.12)', 'rgba(28,26,22,0.4)']
                : ['rgba(197,160,89,0.14)', 'rgba(255,253,249,0.8)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="book-open" size={15} color={brand} />
            <Text
              style={{
                color: brand,
                fontFamily: FONTS.sansSemiBold,
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Sacred Reflection · शास्त्र विचार
            </Text>
          </View>
          <Text
            style={{
              color: text,
              fontFamily: FONTS.serifBold,
              fontSize: 16,
              fontStyle: 'italic',
              lineHeight: 24,
            }}
          >
            &ldquo;न हि ज्ञानेन सदृशं पवित्रमिह विद्यते&rdquo;
          </Text>
          <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 13, lineHeight: 20 }}>
            In this world, there is nothing as purifying as knowledge. Daily contemplation on sacred shastra awakens
            inner clarity and steadfast dharma.
          </Text>
          <Text style={{ color: brand, fontFamily: FONTS.sansSemiBold, fontSize: 11, alignSelf: 'flex-end' }}>
            — Shrimad Bhagavad Gita 4.38
          </Text>
        </Card>

        {/* Connected Sadhana Pathways */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: textDim,
              fontFamily: FONTS.sansSemiBold,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 4,
            }}
          >
            Continue Today&apos;s Sadhana
          </Text>

          <View style={{ gap: 10 }}>
            {/* 1. Japa Sadhana */}
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Open Japa Sadhana"
              haptic="selection"
              onPress={() => router.push('/(tabs)/japa')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 20,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? COLORS.homeSoftDark : COLORS.homeSoftLight,
                  borderWidth: 1,
                  borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="disc" size={20} color={brand} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  108 Japa Sadhana
                </Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12 }}>
                  Chant sacred mantras with 3D tactile mala beads
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={textDim} />
            </PressableSurface>

            {/* 2. Dharm Veer */}
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Open Dharm Veer"
              haptic="selection"
              onPress={() => router.push('/dharm-veer')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 20,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight,
                  borderWidth: 1,
                  borderColor: COLORS.tilePurpleBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="shield" size={20} color={COLORS.tilePurple} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  Dharm Veer
                </Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12 }}>
                  Read sacred stories of timeless heroes & defenders
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={textDim} />
            </PressableSurface>

            {/* 3. Virtual Sanctum */}
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel="Open Virtual Sanctum"
              haptic="selection"
              onPress={() => router.push('/tirtha')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 20,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor: border,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: COLORS.sageBg,
                  borderWidth: 1,
                  borderColor: COLORS.sageBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Feather name="sun" size={20} color={COLORS.sage} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: text, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>
                  Virtual Sanctum & Tirtha
                </Text>
                <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12 }}>
                  Enter the Garbhagriha & offer Pushpa Vrishti
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={textDim} />
            </PressableSurface>
          </View>
        </View>
      </ScrollView>

      {answeredToday && activeQuiz ? (
        <View
          pointerEvents="none"
          collapsable={false}
          style={{
            position: 'absolute',
            left: -420,
            top: 0,
            opacity: 0.01,
          }}
        >
          <ShoonayaShareCard
            ref={quizShareCardRef}
            data={{
              tradition: state.tradition,
              headlineValue: isCorrect ? 'Correct' : 'Incorrect',
              title: 'Daily Quiz',
              subtitle: activeQuiz.question,
              caption: (() => {
                const karmaEarned = saveData?.karma_earned ?? (state.todayResponse?.is_correct ? 10 : 2);
                const streak = saveData?.streak ?? 1;
                const pointsText = `${karmaEarned} point${karmaEarned !== 1 ? 's' : ''}`;
                const streakText = `${streak} day${streak !== 1 ? 's' : ''}`;
                return `Earned ${pointsText} · ${streakText} streak!`;
              })(),
              userName: state.userName,
              date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              footer: 'Shared from Shoonaya',
            }}
          />
        </View>
      ) : null}

      <AuthGate
        visible={authGateVisible}
        onClose={() => setAuthGateVisible(false)}
        title="Submit Quiz Answer"
        message="Sign in to save your sadhana quiz responses, streaks and earn Seva."
      />
    </Screen>
  );
}
