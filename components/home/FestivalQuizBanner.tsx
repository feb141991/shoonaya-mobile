import { useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, themeColor } from '@/lib/constants';

type SeasonSummary = {
  definitionKey: string;
  title: string;
  currentDay: number | null;
  totalDays: number | null;
  days: Array<{ unlocked: boolean; answered: unknown }>;
};

// Self-fetching "Event Arena" entry point -- same self-fetch-when-not-given-
// props shape as QuizSparkCard, but this banner has no meaningful props to
// receive from Home (it's independent of home-summary's own payload,
// deliberately, so it doesn't grow that endpoint further). Renders nothing
// when there's no active season, so it costs nothing visually on ordinary
// days.
export function FestivalQuizBanner() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [season, setSeason] = useState<SeasonSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/native/festival-quiz-seasons');
        if (!response.ok) return;
        const data = (await response.json()) as { seasons: SeasonSummary[] };
        if (cancelled) return;
        const withUnlockedDay = data.seasons.find((s) => s.days.some((d) => d.unlocked));
        setSeason(withUnlockedDay ?? null);
      } catch {
        // Best-effort -- an empty Home screen must never depend on this.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!season) return null;

  const unansweredCount = season.days.filter((d) => d.unlocked && !d.answered).length;

  return (
    <PressableSurface
      haptic="selection"
      onPress={() => router.push(`/festival-quiz/${season.definitionKey}` as any)}
      style={{ minHeight: 0 }}
    >
      <Card tone="auto" style={{ backgroundColor: isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight, borderColor: COLORS.tilePurpleBorder, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.tilePurple }}>
          <Feather name="award" size={18} color={COLORS.creamBg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{season.title}</Text>
          <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
            Day {season.currentDay ?? '–'} of {season.totalDays ?? season.days.length} is live
            {unansweredCount > 0 ? ` · ${unansweredCount} to answer` : ''}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.tilePurple} />
      </Card>
    </PressableSurface>
  );
}
