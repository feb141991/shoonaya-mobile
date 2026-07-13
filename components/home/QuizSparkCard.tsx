import { useCallback, useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredIcon } from '@/components/ui/SacredIcon';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, SHADOWS, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

// Native port of PWA's "Daily Quiz Spark Card" (HomeDashboard's
// SadhanaSection.tsx, immediately below the Dharm Veer card) — self-fetching
// like SankalpaCard.tsx/MoodCheckin.tsx so Home doesn't need to widen
// /api/native/home-summary's contract just for the question preview text.
// Renders nothing once today's quiz has been answered, or if there's no
// quiz configured for the user's tradition today — matching PWA's own
// `quiz && quizAnswered === null` gate exactly (the whole row disappears
// rather than showing a "come back tomorrow" placeholder).

type DailyQuiz = {
  question: string;
  tradition: string;
};

type Status = 'loading' | 'ready' | 'hidden' | 'error';

const TRADITION_LABEL: Record<string, string> = {
  hindu: 'Hindu',
  sikh: 'Sikh',
  buddhist: 'Buddhist',
  jain: 'Jain',
};

export function QuizSparkCard() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<Status>('loading');
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus('hidden');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tradition, timezone')
        .eq('id', user.id)
        .maybeSingle();

      const tradition = profile?.tradition ?? 'hindu';
      const timezone = profile?.timezone ?? 'UTC';
      const today = spiritualDate(timezone);

      const [quizResponse, savedResponse] = await Promise.all([
        apiFetch(`/api/quiz/daily?tradition=${tradition}&date=${today}&language=en`),
        supabase
          .from('quiz_responses')
          .select('date')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
      ]);

      if (savedResponse.data) {
        // Already answered today — matches PWA hiding the card entirely.
        setStatus('hidden');
        return;
      }

      if (!quizResponse.ok) {
        setStatus('hidden');
        return;
      }

      const quizData = (await quizResponse.json()) as Partial<DailyQuiz>;
      if (!quizData.question) {
        setStatus('hidden');
        return;
      }

      setQuiz({ question: quizData.question, tradition });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load().catch(() => setStatus('error'));
  }, [load]);

  if (status === 'loading' || status === 'hidden') {
    return null;
  }

  if (status === 'error') {
    // Quiet failure — a Home row shouldn't surface a retry affordance for a
    // secondary nudge; the full /quiz screen still loads and errors loudly
    // there if the underlying fetch is actually broken.
    return null;
  }

  if (!quiz) return null;

  const title = `${TRADITION_LABEL[quiz.tradition] ?? 'Daily'} Quiz`;

  return (
    <PressableSurface
      haptic="selection"
      accessibilityLabel={`${title}: ${quiz.question}. Tap to play`}
      onPress={() => router.push(resolveNativeRoute('/quiz', '/(tabs)'))}
      style={{
        minHeight: 70,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? COLORS.brandSoftDark : COLORS.brandSoftLight,
        }}
      >
        <SacredIcon name="quiz" fallbackGlyph="help-circle" size={16} color={brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: brand }}>
          {title}
        </Text>
        <Text style={{ marginTop: 3, ...TYPE.label, fontFamily: FONTS.sansSemiBold, color: text }} numberOfLines={1}>
          {quiz.question}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ ...TYPE.micro, fontFamily: FONTS.sansSemiBold, color: brand }}>Play</Text>
        <Feather name="arrow-right" size={14} color={brand} />
      </View>
    </PressableSurface>
  );
}
