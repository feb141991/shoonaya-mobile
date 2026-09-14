import { useEffect, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, themeColor } from '@/lib/constants';

type Stat = { definitionKey: string; title: string; daySequence: number; memberCount: number };

// Self-fetching, same shape as Home's FestivalQuizBanner -- "N members of
// your Mandali completed today's [Festival] quiz". Renders nothing when
// there's nothing to show (no active season, or zero members have answered
// today's day yet), so it costs nothing on ordinary days.
export function FestivalQuizMandaliStat() {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/native/festival-quiz-mandali-stats');
        if (!response.ok) return;
        const data = (await response.json()) as { stats: Stat[] };
        if (!cancelled) setStats(data.stats ?? []);
      } catch {
        // Best-effort -- Mandali must render fine without this.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (stats.length === 0) return null;

  return (
    <View style={{ marginHorizontal: 8, marginTop: 8, gap: 6 }}>
      {stats.map((s) => (
        <View
          key={s.definitionKey}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            borderRadius: 15, borderWidth: 1, borderColor: COLORS.tilePurpleBorder,
            backgroundColor: isDark ? COLORS.tilePurpleBgDark : COLORS.tilePurpleBgLight,
            paddingHorizontal: 12, paddingVertical: 9,
          }}
        >
          <Feather name="users" size={14} color={COLORS.tilePurple} />
          <Text style={{ flex: 1, color: theme.text, fontFamily: FONTS.sans, fontSize: 12.5 }}>
            {s.memberCount} member{s.memberCount === 1 ? '' : 's'} of your Mandali completed Day {s.daySequence} of {s.title}
          </Text>
        </View>
      ))}
    </View>
  );
}
