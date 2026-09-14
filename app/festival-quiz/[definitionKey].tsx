import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { ConfettiOverlay } from '@/components/ui/ConfettiOverlay';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE, themeColor } from '@/lib/constants';

// Multi-day "Event Arena" quiz journey -- distinct from app/quiz.tsx's
// single daily question (Model A / dedicated deck, per product decision).
// Reuses that screen's exact choice-UI/feedback visual pattern (letter
// badges, green/red answer states, explanation card) for consistency, on
// top of a day-strip driven by the panchang-resolved series instead of a
// single "today" question.

type SeasonDay = {
  daySequence: number;
  title: string;
  civilDate: string | null;
  unlocked: boolean;
  answered: { isCorrect: boolean; chosenOptionIdx: number } | null;
  question: { text: string; options: string[]; explanation: string | null; source: string | null } | null;
};

type Season = {
  definitionKey: string;
  title: string;
  status: string;
  currentDay: number | null;
  totalDays: number | null;
  year: number;
  days: SeasonDay[];
};

export default function FestivalQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ definitionKey: string }>();
  const definitionKey = Array.isArray(params.definitionKey) ? params.definitionKey[0] : params.definitionKey;
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const { text, dim: textDim, card: cardBg, border } = theme;

  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<Season | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Same "quiz" identity accent as app/quiz.tsx (the Daily Spark), for
  // visual consistency across the two quiz surfaces.
  const quizAccent = COLORS.tilePurple;
  const quizSoft = isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight;
  const quizBorder = COLORS.tilePurpleBorder;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/native/festival-quiz-seasons');
      if (!response.ok) throw new Error('failed');
      const data = (await response.json()) as { seasons: Season[] };
      const found = data.seasons.find((s) => s.definitionKey === definitionKey) ?? null;
      setSeason(found);
      if (found) {
        // Default to the current/first unlocked, unanswered day; fall back
        // to the last unlocked day (catch-up: everything unlocked has
        // already been answered).
        const nextUp = found.days.find((d) => d.unlocked && !d.answered);
        const lastUnlocked = [...found.days].reverse().find((d) => d.unlocked);
        setSelectedDay((nextUp ?? lastUnlocked ?? found.days[0])?.daySequence ?? null);
      }
    } catch {
      Alert.alert('Could not load this season', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [definitionKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeDay = useMemo(() => season?.days.find((d) => d.daySequence === selectedDay) ?? null, [season, selectedDay]);
  const answeredToday = Boolean(activeDay?.answered);

  const handleAnswer = async (index: number) => {
    if (!season || !activeDay || !activeDay.question || answeredToday || saving) return;
    setSelectedAnswer(index);
    setSaving(true);
    try {
      const response = await apiFetch('/api/native/festival-quiz/answer', {
        method: 'POST',
        body: JSON.stringify({
          definitionKey: season.definitionKey,
          daySequence: activeDay.daySequence,
          chosenOptionIdx: index,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      const data = (await response.json()) as { isCorrect: boolean; correctOptionIdx: number; explanation: string | null; karmaEarned: number; badgeAwarded: boolean };
      setSeason((prev) => prev && {
        ...prev,
        days: prev.days.map((d) => d.daySequence === activeDay.daySequence
          ? { ...d, answered: { isCorrect: data.isCorrect, chosenOptionIdx: index }, question: { ...d.question!, explanation: data.explanation ?? d.question!.explanation } }
          : d),
      });
      if (data.isCorrect && data.karmaEarned > 0) setShowConfetti(true);
      if (data.badgeAwarded) {
        setTimeout(() => Alert.alert('Journey Complete! 🏆', `You've completed every day of ${season.title}. A completion seal has been added to your profile.`), 600);
      }
    } catch {
      Alert.alert('Could not save your answer');
      setSelectedAnswer(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader icon="quiz" title="Preparing your journey" subtitle="Gathering today's wisdom..." showBack fallbackHref="/(tabs)" />
      </Screen>
    );
  }

  if (!season) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ color: text, ...TYPE.cardHeading }}>Season not found</Text>
          <PressableSurface onPress={() => router.back()} style={{ minHeight: 0 }}>
            <Text style={{ color: theme.brand, fontFamily: FONTS.sansSemiBold }}>Go back</Text>
          </PressableSurface>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ConfettiOverlay show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 48, gap: 18 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <PressableSurface
            haptic="selection"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.glass, alignItems: 'center', justifyContent: 'center', boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light }}
          >
            <Feather name="x" size={19} color={theme.text} />
          </PressableSurface>
          <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 10 }}>
            <Text style={{ color: text, fontFamily: FONTS.serifBold, fontSize: 18, textAlign: 'center' }}>{season.title}</Text>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 12, textAlign: 'center' }}>
              Day {season.currentDay ?? '–'} of {season.totalDays ?? season.days.length}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
          {season.days.map((d) => {
            const isSelected = d.daySequence === selectedDay;
            const bg = d.answered
              ? (d.answered.isCorrect ? COLORS.successBg : COLORS.dangerBg)
              : d.unlocked ? quizSoft : theme.cardSoft;
            const fg = d.answered ? (d.answered.isCorrect ? COLORS.success : COLORS.danger) : d.unlocked ? quizAccent : textDim;
            return (
              <PressableSurface
                key={d.daySequence}
                haptic="selection"
                disabled={!d.unlocked}
                onPress={() => { setSelectedDay(d.daySequence); setSelectedAnswer(null); }}
                style={{
                  width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: bg,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? quizAccent : theme.premiumBorder,
                  opacity: d.unlocked ? 1 : 0.5,
                }}
              >
                {!d.unlocked ? (
                  <Feather name="lock" size={14} color={textDim} />
                ) : d.answered ? (
                  <Feather name={d.answered.isCorrect ? 'check' : 'x'} size={16} color={fg} />
                ) : (
                  <Text style={{ color: fg, fontFamily: FONTS.sansSemiBold, fontSize: 15 }}>{d.daySequence}</Text>
                )}
              </PressableSurface>
            );
          })}
        </ScrollView>

        {activeDay?.unlocked && activeDay.question ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, gap: 18 }}>
            <View>
              <Text style={{ color: textDim, fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                {activeDay.title}
              </Text>
              <Text style={{ color: text, ...TYPE.cardHeading, marginTop: 6 }}>{activeDay.question.text}</Text>
            </View>

            <View style={{ gap: 11 }}>
              {activeDay.question.options.map((option, index) => {
                const wasChosen = activeDay.answered ? activeDay.answered.chosenOptionIdx === index : selectedAnswer === index;
                const showFeedback = Boolean(activeDay.answered);
                const isThisCorrect = showFeedback && activeDay.answered!.isCorrect && wasChosen;
                const isThisWrong = showFeedback && !activeDay.answered!.isCorrect && wasChosen;
                const letter = String.fromCharCode(65 + index);

                let backgroundColor: string = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
                let borderColor: string = quizBorder;
                let optionText: string = text;
                let letterBg: string = quizSoft;
                let letterColor: string = quizAccent;
                if (isThisCorrect) {
                  backgroundColor = COLORS.successBg; borderColor = COLORS.successBorder; optionText = COLORS.success; letterBg = COLORS.success; letterColor = COLORS.creamBg;
                } else if (isThisWrong) {
                  backgroundColor = COLORS.dangerBg; borderColor = COLORS.dangerBorder; optionText = COLORS.danger; letterBg = COLORS.danger; letterColor = COLORS.creamBg;
                }

                return (
                  <PressableSurface
                    key={`${option}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={option}
                    onPress={() => void handleAnswer(index)}
                    disabled={answeredToday || saving}
                    haptic="selection"
                    style={{ borderRadius: 18, borderWidth: 1, borderColor, backgroundColor, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: letterBg }}>
                      <Text style={{ color: letterColor, fontFamily: FONTS.sansSemiBold, fontSize: 13 }}>{letter}</Text>
                    </View>
                    <Text style={{ flex: 1, color: optionText, fontFamily: FONTS.sansMedium, fontSize: 15, lineHeight: 21 }}>{option}</Text>
                    {isThisCorrect ? <Feather name="check" size={18} color={COLORS.success} /> : null}
                    {isThisWrong ? <Feather name="x" size={18} color={COLORS.danger} /> : null}
                  </PressableSurface>
                );
              })}
            </View>

            {activeDay.answered ? (
              <View style={{ borderRadius: 20, borderWidth: 1, borderColor: activeDay.answered.isCorrect ? COLORS.successBorder : quizBorder, backgroundColor: activeDay.answered.isCorrect ? COLORS.successBg : quizSoft, padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="book-open" size={14} color={activeDay.answered.isCorrect ? COLORS.success : quizAccent} />
                  <Text style={{ color: activeDay.answered.isCorrect ? COLORS.success : quizAccent, fontFamily: FONTS.sansSemiBold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    {activeDay.title}
                  </Text>
                </View>
                <Text style={{ color: text, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 22 }}>
                  {activeDay.question.explanation ?? 'Your answer has been recorded.'}
                </Text>
                {activeDay.question.source ? (
                  <Text style={{ color: textDim, fontFamily: FONTS.sansMedium, fontSize: 12 }}>Source: {activeDay.question.source}</Text>
                ) : null}
              </View>
            ) : null}
          </Card>
        ) : activeDay && !activeDay.unlocked ? (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border, alignItems: 'center', gap: 8, paddingVertical: 28 }}>
            <Feather name="lock" size={20} color={textDim} />
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14, textAlign: 'center' }}>
              Day {activeDay.daySequence} unlocks on {activeDay.civilDate ?? 'a future date'}.
            </Text>
          </Card>
        ) : (
          <Card tone="auto" style={{ backgroundColor: cardBg, borderColor: border }}>
            <Text style={{ color: textDim, fontFamily: FONTS.sans, fontSize: 14 }}>No question available for this day yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
