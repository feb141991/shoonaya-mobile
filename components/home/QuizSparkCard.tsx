import { useCallback, useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { IconTile } from '@/components/ui/IconTile';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, SHADOWS, TYPE } from '@/lib/constants';
import { resolveNativeRoute } from '@/lib/routes';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

// Native port of PWA's compact "Daily Quiz Spark Card" (HomeDashboard's
// SadhanaSection.tsx, immediately below the Dharm Veer card). Unlike PWA's
// modal card, native keeps this as a persistent route entry: /quiz owns the
// completed/error state, so Home should not make the feature disappear.

type DailyQuiz = {
  question: string;
  tradition: string;
};

type QuizStats = {
  streak?: number;
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
  // Outer card border matches the same premiumBorder every other Home card
  // (Dharm Veer, Sankalpa, Sacred Rhythm) uses, so this row reads as part of
  // the same card family rather than a one-off. The icon well uses the same
  // coral/peach tint as Dharm Veer's well (COLORS.tileCoral, the literal
  // value dharmVeerColor resolves to) so the two "hero" rows share one
  // unified accent family instead of each inventing its own; the icon well
  // itself is sized "lg" (56px) per lib/icons.ts's own reserved "hero cards
  // — Quiz, Dincharya" comment.
  const border = isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<Status>('loading');
  const [quiz, setQuiz] = useState<DailyQuiz | null>(null);
  const [quizStreak, setQuizStreak] = useState(0);

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

      const [quizResponse, statsResponse, savedResponse] = await Promise.all([
        apiFetch(`/api/quiz/daily?tradition=${tradition}&date=${today}&language=en`),
        apiFetch('/api/quiz/stats').catch(() => null),
        supabase
          .from('quiz_responses')
          .select('question')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
      ]);

      if (statsResponse?.ok) {
        const stats = (await statsResponse.json()) as QuizStats;
        setQuizStreak(stats.streak ?? 0);
      }

      const quizData = quizResponse.ok ? ((await quizResponse.json()) as Partial<DailyQuiz>) : null;
      const previewQuestion =
        quizData?.question ||
        savedResponse.data?.question ||
        "Answer today's dharmic question";

      setQuiz({ question: previewQuestion, tradition });
      setStatus('ready');
    } catch {
      setQuiz({ question: "Answer today's dharmic question", tradition: 'hindu' });
      setStatus('ready');
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
    // Card chrome (bg/border/shadow) lives on a plain View with a flat
    // style object — same pattern Dharm Veer's Pressable uses. PressableSurface
    // resolves its style as an array (base + caller + pressedStyle) via a
    // style-callback function; on this RN build that array form was silently
    // dropping boxShadow/borderColor here (and on the Sacred Rhythm card,
    // which had the same structure), even though the values were correct —
    // that's why the card looked borderless/shadowless despite the code
    // having border/shadow set. Moving the chrome to a flat-object View and
    // keeping PressableSurface purely for press feedback/layout fixes it.
    <View
      style={{
        width: '100%',
        borderRadius: 22,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: border,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
      }}
    >
      <PressableSurface
        haptic="selection"
        accessibilityLabel={`${title}: ${quiz.question}. Tap to play`}
        onPress={() => router.push(resolveNativeRoute('/quiz', '/(tabs)'))}
        style={{
          minHeight: 70,
          paddingHorizontal: 16,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
          <IconTile name="quiz" fallbackGlyph="help-circle" size="md" color={brand} accent={COLORS.tileCoral} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: 'uppercase', color: brand }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ marginTop: 3, ...TYPE.cardHeading, color: text }} numberOfLines={1}>
              {quiz.question}
            </Text>
            <Text style={{ marginTop: 2, ...TYPE.caption, color: isDark ? COLORS.textDimDark : COLORS.textDimLight }} numberOfLines={1}>
              Test your dharmic memory
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {quizStreak > 1 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Feather name="zap" size={12} color={brand} />
              <Text style={{ ...TYPE.chip, color: brand }}>{quizStreak}</Text>
            </View>
          ) : null}
          <Text style={{ ...TYPE.chip, color: brand }}>
            Play
          </Text>
          <Feather name="chevron-right" size={18} color={brand} />
        </View>
      </PressableSurface>
    </View>
  );
}
