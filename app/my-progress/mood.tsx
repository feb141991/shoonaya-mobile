import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import { apiFetch } from '@/lib/api';

// Mirrors MoodInsightMetrics returned by GET /api/mood/insights/{weekly,monthly}
// (src/lib/mood/insights.ts on the web repo) — only the fields this screen reads.
type MoodInsightsResponse = {
  totalCheckins: number;
  completedActions: number;
  streak: number;
  mostFrequentMood: string | null;
  preferredActions: { action: string; count: number }[];
};

export default function MoodInsightsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();

  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [metrics, setMetrics] = useState<MoodInsightsResponse | null>(null);
  const [aiReflection, setAiReflection] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (tf: 'weekly' | 'monthly') => {
    try {
      const res = await apiFetch(`/api/mood/insights/${tf}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('[mood] Failed to fetch metrics', e);
    }
  }, []);

  const fetchAiReflection = useCallback(async () => {
    try {
      const res = await apiFetch('/api/mood/reflection-summary');
      if (res.ok) {
        const data = await res.json();
        setAiReflection(data.summary);
      }
    } catch (e) {
      console.error('[mood] Failed to fetch reflection', e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMetrics(timeframe).finally(() => setLoading(false));
  }, [timeframe, fetchMetrics]);

  useEffect(() => {
    if (!aiReflection) {
      fetchAiReflection();
    }
  }, [aiReflection, fetchAiReflection]);

  function StatBox({ icon, label, value, color }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string | number; color: string }) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Text style={{ fontSize: 24, fontFamily: FONTS.serifBold, color: theme.text, marginBottom: 4 }}>{value}</Text>
        <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: theme.dim }}>{label}</Text>
      </View>
    );
  }

  return (
    <Screen 
      style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Mood Insights', onBack: () => router.back() }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? COLORS.homeIconWellDark : COLORS.homeIconWellLight, borderRadius: 24, padding: 4, marginBottom: 24 }}>
          {(['weekly', 'monthly'] as const).map(tf => (
            <PressableSurface
              key={tf}
              haptic="selection"
              onPress={() => setTimeframe(tf)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: timeframe === tf ? theme.brandSoft : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: timeframe === tf ? theme.text : theme.dim, textTransform: 'capitalize' }}>
                {tf}
              </Text>
            </PressableSurface>
          ))}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={theme.brand} />
            <Text style={{ marginTop: 12, fontFamily: FONTS.sans, color: theme.dim }}>Loading insights...</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* AI Reflection Card */}
            <View style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 24,
              padding: 20,
              marginBottom: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <Feather name="moon" size={16} color={theme.brand} />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.brand, textTransform: 'uppercase', letterSpacing: 1 }}>Divine Reflection</Text>
              </View>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 15, color: theme.text, lineHeight: 24 }}>
                {aiReflection || "Your journey is unique. Keep logging your daily moods to unlock deeper spiritual reflections."}
              </Text>
            </View>

            {/* Metrics Grid */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatBox icon="calendar" label="Check-ins" value={metrics?.totalCheckins || 0} color={theme.brand} />
              <StatBox icon="check-circle" label="Actions Completed" value={metrics?.completedActions || 0} color={COLORS.success} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatBox icon="trending-up" label="Day Streak" value={metrics?.streak || 0} color={COLORS.danger} />
              <StatBox icon="activity" label="Frequent Mood" value={metrics?.mostFrequentMood || 'None'} color={COLORS.navy} />
            </View>

            {/* Preferred Actions */}
            {metrics?.preferredActions && metrics.preferredActions.length > 0 && (
              <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20, marginTop: 12 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Top Actions</Text>
                <View style={{ gap: 12 }}>
                  {metrics.preferredActions.map((item, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: theme.text, textTransform: 'capitalize' }}>{item.action}</Text>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: theme.dim }}>{item.count} times</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </Screen>
  );
}
