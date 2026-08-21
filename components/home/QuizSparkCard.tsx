import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from "expo-router";

import { IconTile } from "@/components/ui/IconTile";
import { apiFetch } from "@/lib/api";
import { COLORS, SHADOWS, TYPE } from "@/lib/constants";
import { resolveNativeRoute } from "@/lib/routes";
import { spiritualDate } from "@/lib/spiritualDate";
import { supabase } from "@/lib/supabase";

type DailyQuiz = {
  question: string;
  tradition: string;
};

type QuizStats = {
  streak?: number;
};

type Status = "loading" | "ready" | "hidden" | "error";

const TRADITION_LABEL: Record<string, string> = {
  hindu: "Hindu",
  sikh: "Sikh",
  buddhist: "Buddhist",
  jain: "Jain",
};

export type QuizSparkCardProps = {
  tradition?: string;
  quizDone?: boolean;
  quizStreak?: number;
  question?: string;
  userId?: string;
  timezone?: string;
};

export function QuizSparkCard({
  tradition: propTradition,
  quizDone: propQuizDone,
  quizStreak: propQuizStreak,
  question: propQuestion,
  userId: propUserId,
  timezone: propTimezone,
}: QuizSparkCardProps = {}) {
  const router = useRouter();
  const isDark = useColorScheme() === "dark";
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.premiumBorderDark : COLORS.premiumBorderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  const [status, setStatus] = useState<Status>(propTradition !== undefined ? "ready" : "loading");
  const [quiz, setQuiz] = useState<DailyQuiz | null>(
    propTradition ? { question: propQuestion || "Answer today's dharmic question", tradition: propTradition } : null
  );
  const [quizStreak, setQuizStreak] = useState(propQuizStreak ?? 0);
  const [quizDone, setQuizDone] = useState(propQuizDone ?? false);

  // Sync props when updated from parent
  useEffect(() => {
    if (propTradition !== undefined) {
      setQuiz({ question: propQuestion || "Answer today's dharmic question", tradition: propTradition });
      if (propQuizDone !== undefined) setQuizDone(propQuizDone);
      if (propQuizStreak !== undefined) setQuizStreak(propQuizStreak);
      setStatus("ready");
    }
  }, [propTradition, propQuizDone, propQuizStreak, propQuestion]);

  const load = useCallback(async () => {
    // Skip self-fetching if parent already provided complete data
    if (propTradition !== undefined && propQuizDone !== undefined) {
      return;
    }

    setStatus("loading");
    try {
      let uid = propUserId;
      let userTradition = propTradition;
      let userTimezone = propTimezone;

      if (!uid) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          setStatus("hidden");
          return;
        }
        uid = sessionData.session.user.id;
      }

      if (!userTradition || !userTimezone) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tradition, timezone")
          .eq("id", uid)
          .maybeSingle();

        userTradition = profile?.tradition ?? "hindu";
        userTimezone = profile?.timezone ?? "UTC";
      }

      const effectiveTradition = userTradition ?? "hindu";
      const effectiveTimezone = userTimezone ?? "UTC";
      const today = spiritualDate(effectiveTimezone);

      const [quizResponse, statsResponse, savedResponse] = await Promise.all([
        apiFetch(`/api/quiz/daily?tradition=${effectiveTradition}&date=${today}&language=en`),
        apiFetch("/api/quiz/stats").catch(() => null),
        supabase
          .from("quiz_responses")
          .select("question")
          .eq("user_id", uid)
          .eq("date", today)
          .maybeSingle(),
      ]);

      if (statsResponse?.ok) {
        const stats = (await statsResponse.json()) as QuizStats;
        setQuizStreak(stats.streak ?? 0);
      }

      const quizData = quizResponse.ok ? ((await quizResponse.json()) as Partial<DailyQuiz>) : null;
      const completedToday = Boolean(savedResponse.data);
      const previewQuestion =
        quizData?.question ||
        savedResponse.data?.question ||
        "Answer today's dharmic question";

      setQuiz({ question: previewQuestion, tradition: effectiveTradition });
      setQuizDone(completedToday);
      setStatus("ready");
    } catch {
      setQuiz({ question: "Answer today's dharmic question", tradition: propTradition ?? "hindu" });
      setQuizDone(false);
      setStatus("ready");
    }
  }, [propTradition, propQuizDone, propUserId, propTimezone]);

  useEffect(() => {
    if (propTradition === undefined) {
      load().catch(() => setStatus("error"));
    }
  }, [load, propTradition]);

  if (status === "loading" || status === "hidden") {
    return null;
  }

  if (status === "error" || !quiz) {
    return null;
  }

  const title = `${TRADITION_LABEL[quiz.tradition] ?? "Daily"} Quiz`;
  const previewTitle = "Answer today's dharmic question";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${quizDone ? "completed today" : quiz.question}. Tap to ${quizDone ? "review" : "play"}`}
      onPress={() => router.push(resolveNativeRoute("/quiz", "/(tabs)"))}
      style={{
        minHeight: 70,
        width: "100%",
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        backgroundColor: quizDone ? (isDark ? COLORS.selectionWellDark : COLORS.brandSoftLight) : cardBg,
        borderWidth: 1,
        borderColor: border,
        boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        opacity: quizDone ? 0.72 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
        <IconTile name="quiz" fallbackGlyph="help-circle" size="md" color={brand} accent={COLORS.tileCoral} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...TYPE.chip, letterSpacing: 1.25, textTransform: "uppercase", color: brand }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ marginTop: 3, ...TYPE.cardHeading, color: text }} numberOfLines={1}>
            {previewTitle}
          </Text>
          <Text style={{ marginTop: 2, ...TYPE.caption, color: isDark ? COLORS.textDimDark : COLORS.textDimLight }} numberOfLines={1}>
            {quizDone ? "Completed today" : "Test your dharmic memory"}
          </Text>
        </View>
      </View>
      {quizDone ? (
        <Feather name="check-circle" size={20} color={brand} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {quizStreak > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Feather name="zap" size={12} color={brand} />
              <Text style={{ ...TYPE.chip, color: brand }}>{quizStreak}</Text>
            </View>
          ) : null}
          <Text style={{ ...TYPE.chip, color: brand }}>
            Play
          </Text>
          <Feather name="chevron-right" size={18} color={brand} />
        </View>
      )}
    </Pressable>
  );
}
