import { ActivityIndicator, Text, View } from 'react-native';

import { COLORS, FONTS, TYPE } from '@/lib/constants';
import { formatDuration } from '@/lib/japaPresentation';
import type { JapaCompletionStats } from '@/hooks/useJapaCompletionInsight';

type Theme = {
  brand: string;
};

type JapaCompletionDetailsProps = {
  stats: JapaCompletionStats;
  insight: string | null;
  insightLoading: boolean;
  text: string;
  dim: string;
  theme: Theme;
  isDark: boolean;
};

export function JapaCompletionDetails({
  stats,
  insight,
  insightLoading,
  text,
  dim,
  theme,
  isDark,
}: JapaCompletionDetailsProps) {
  return (
    <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        <Metric label="Rounds" value={stats.rounds} dim={dim} text={text} isDark={isDark} />
        <Metric label="Beads" value={stats.beads} dim={dim} text={text} isDark={isDark} />
        <Metric label="Duration" value={formatDuration(stats.durationSecs)} dim={dim} text={text} isDark={isDark} />
      </View>

      <View
        style={{
          alignSelf: 'stretch',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: isDark ? COLORS.homeBorderSoftDark : COLORS.homeBorderSoftLight,
          backgroundColor: isDark ? COLORS.homeShlokaGlassDark : COLORS.homeShlokaSurfaceLight,
          padding: 14,
          gap: 8,
        }}
      >
        <Text style={{ ...TYPE.section, color: theme.brand }}>Dharma Mitra</Text>
        {insightLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color={theme.brand} size="small" />
            <Text style={{ ...TYPE.caption, color: dim }}>Receiving insight...</Text>
          </View>
        ) : (
          <Text style={{ ...TYPE.caption, color: text }}>
            {insight ?? `${stats.rounds} mala${stats.rounds > 1 ? 's' : ''} completed. Let the vibration of ${stats.mantraName} stay in your breath as you return to the day.`}
          </Text>
        )}
      </View>
    </>
  );
}

function Metric({
  label,
  value,
  dim,
  text,
  isDark,
}: {
  label: string;
  value: string | number;
  dim: string;
  text: string;
  isDark: boolean;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 16, padding: 12, alignItems: 'center' }}>
      <Text style={{ fontFamily: FONTS.sans, fontSize: 10, color: dim, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: text, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
