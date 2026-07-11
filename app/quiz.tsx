import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { Screen } from '@/components/ui/Screen';
import { ShoonayaShareCard } from '@/components/share/ShoonayaShareCard';
import { shareCapturedShoonayaCard } from '@/lib/share-card';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

type Tradition = 'hindu' | 'sikh' | 'buddhist' | 'jain';

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
  const [state, setState] = useState<QuizState>(DEFAULT_STATE);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [saveData, setSaveData] = useState<QuizSaveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const textDim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const surface = isDark ? COLORS.darkBg : COLORS.creamBg;
  const spiritualToday = useMemo(() => spiritualDate(state.timezone), [state.timezone]);

  const loadQuiz = useCallback(async () => {
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

  const handleAnswer = async (index: number) => {
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
      <Screen style={{ backgroundColor: surface }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: surface }}>
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} density="soft" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandGold} />}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Feather name="chevron-left" size={16} color={textDim} />
          <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>Back</Text>
        </Pressable>

        <Text style={{ color: text, ...TYPE.screenTitle }}>Daily Quiz</Text>
        <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
          One question. One clear answer. Come back tomorrow after you finish today&apos;s round.
        </Text>

        {activeQuiz ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 18 }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: COLORS.brandGold,
                  }}
                />
              </View>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>
                Question 1 of 1
              </Text>
            </View>

            <Text style={{ color: text, ...TYPE.hero }}>
              {activeQuiz.question}
            </Text>

            <View style={{ gap: 12 }}>
              {activeQuiz.options.map((option, index) => {
                const wasChosen = selectedAnswer === index;
                const isAnswerCorrect = correctIndex === index;
                const showFeedback = answeredToday && correctIndex !== null;

                let backgroundColor: string = cardBg;
                let borderColor: string = border;
                let optionText: string = text;

                if (showFeedback && isAnswerCorrect) {
                  backgroundColor = COLORS.successBg;
                  borderColor = COLORS.successBorder;
                  optionText = COLORS.success;
                } else if (showFeedback && wasChosen && !isAnswerCorrect) {
                  backgroundColor = COLORS.dangerBg;
                  borderColor = COLORS.dangerBorder;
                  optionText = COLORS.danger;
                }

                return (
                  <Pressable
                    key={`${option}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${option}. ${showFeedback ? (isAnswerCorrect ? 'Correct answer' : (wasChosen ? 'Incorrect answer' : '')) : ''}`}
                    onPress={() => {
                      void handleAnswer(index);
                    }}
                    disabled={answeredToday || saving}
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor,
                      backgroundColor,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <Text style={{ flex: 1, color: optionText, fontFamily: FONTS.sansMedium, fontSize: 15 }}>
                      {option}
                    </Text>
                    {showFeedback && isAnswerCorrect ? (
                      <Feather name="check" size={18} color={COLORS.success} />
                    ) : null}
                    {showFeedback && wasChosen && !isAnswerCorrect ? (
                      <Feather name="x" size={18} color={COLORS.danger} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {answeredToday ? (
              <View
                style={{
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: isCorrect ? COLORS.successBorder : COLORS.dangerBorder,
                  backgroundColor: isCorrect ? COLORS.successBg : COLORS.dangerBg,
                  padding: 16,
                  gap: 10,
                }}
              >
                <Text style={{ color: isCorrect ? COLORS.success : COLORS.danger, fontFamily: FONTS.sansSemiBold, fontSize: 16 }}>
                  {isCorrect ? 'Correct answer' : 'Come back tomorrow'}
                </Text>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>
                  {state.todayResponse?.explanation ?? activeQuiz.explanation ?? 'Your answer has been recorded for today.'}
                </Text>
                {activeQuiz.source ? (
                  <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>{activeQuiz.source}</Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border }}>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>No quiz is available right now.</Text>
          </Card>
        )}

        {answeredToday ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 14 }}>
            <Text style={{ color: text, ...TYPE.title }}>Today&apos;s score</Text>
            {saveData?.karma_earned === 0 ? (
              <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
                Points already claimed for today
              </Text>
            ) : (
              <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
                {saveData?.karma_earned ?? (state.todayResponse?.is_correct ? 10 : 2)} points earned
              </Text>
            )}
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>
              {saveData?.streak ?? 1}-day streak maintained
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share your quiz result"
              onPress={() => {
                void handleShare();
              }}
              style={{
                marginTop: 4,
                borderRadius: 18,
                backgroundColor: COLORS.brandGold,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>Share result</Text>
            </Pressable>
          </Card>
        ) : null}
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
    </Screen>
  );
}
