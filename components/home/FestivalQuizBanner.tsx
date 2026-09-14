import { useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, themeColor } from '@/lib/constants';

const UPCOMING_WINDOW_DAYS = 7;

type SeasonSummary = {
  definitionKey: string;
  title: string;
  currentDay: number | null;
  totalDays: number | null;
  daysUntilStart: number | null;
  days: Array<{ unlocked: boolean; answered: unknown }>;
};

// Self-fetching "Event Arena" entry point -- same self-fetch-when-not-given-
// props shape as QuizSparkCard, but this banner has no meaningful props to
// receive from Home (it's independent of home-summary's own payload,
// deliberately, so it doesn't grow that endpoint further). Renders nothing
// when there's no active *or upcoming* season, so it costs nothing visually
// on ordinary days.
export function FestivalQuizBanner() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [season, setSeason] = useState<SeasonSummary | null>(null);
  const [mode, setMode] = useState<'live' | 'upcoming'>('live');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/native/festival-quiz-seasons');
        if (!response.ok) return;
        const data = (await response.json()) as { seasons: SeasonSummary[] };
        if (cancelled) return;
        const live = data.seasons.find((s) => s.days.some((d) => d.unlocked));
        if (live) {
          setSeason(live);
          setMode('live');
          return;
        }
        // A locked "starts in N days" teaser, once within a week of Day 1 --
        // gives seekers a heads-up the season exists before it's actually
        // playable, per product direction.
        const upcoming = data.seasons.find((s) => s.daysUntilStart !== null && s.daysUntilStart <= UPCOMING_WINDOW_DAYS);
        setSeason(upcoming ?? null);
        setMode('upcoming');
      } catch {
        // Best-effort -- an empty Home screen must never depend on this.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!season) return null;

  if (mode === 'upcoming') {
    return (
      <PressableSurface haptic="selection" onPress={() => router.push(`/festival-quiz/${season.definitionKey}` as any)} style={{ minHeight: 0 }}>
        <Card tone="auto" style={{ backgroundColor: theme.cardSoft, borderColor: theme.premiumBorder, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.85 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.glass }}>
            <Feather name="lock" size={16} color={theme.dim} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontFamily: FONTS.sansSemiBold, fontSize: 14 }}>{season.title}</Text>
            <Text style={{ color: theme.dim, fontFamily: FONTS.sans, fontSize: 12, marginTop: 2 }}>
              {season.daysUntilStart === 0 ? 'Starts today' : season.daysUntilStart === 1 ? 'Starts tomorrow' : `Starts in ${season.daysUntilStart} days`}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={theme.dim} />
        </Card>
      </PressableSurface>
    );
  }

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
