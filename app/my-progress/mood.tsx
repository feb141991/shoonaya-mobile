import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
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

  const h1 = isDark ? '#f5dfa0' : '#1a0a02';
  const muted = isDark ? 'rgba(245,210,130,0.45)' : 'rgba(100,55,10,0.50)';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

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
      <View style={{ flex: 1, backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 16, padding: 16 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: `${color}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Text style={{ fontSize: 24, fontFamily: FONTS.serifBold, color: h1, marginBottom: 4 }}>{value}</Text>
        <Text style={{ fontSize: 11, fontFamily: FONTS.sans, color: muted }}>{label}</Text>
      </View>
    );
  }

  return (
    <Screen 
      style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Mood Insights', onBack: () => router.back() }}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Toggle */}
        <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 24, padding: 4, marginBottom: 24 }}>
          {(['weekly', 'monthly'] as const).map(tf => (
            <Pressable
              key={tf}
              onPress={() => setTimeframe(tf)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: timeframe === tf ? (isDark ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.12)') : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: timeframe === tf ? h1 : muted, textTransform: 'capitalize' }}>
                {tf}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.brandGold} />
            <Text style={{ marginTop: 12, fontFamily: FONTS.sans, color: muted }}>Loading insights...</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {/* AI Reflection Card */}
            <View style={{
              backgroundColor: cardBg,
              borderColor: border,
              borderWidth: 1,
              borderRadius: 24,
              padding: 20,
              marginBottom: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <Feather name="moon" size={16} color="#C5A059" />
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: '#C5A059', textTransform: 'uppercase', letterSpacing: 1 }}>Divine Reflection</Text>
              </View>
              <Text style={{ fontFamily: FONTS.serif, fontSize: 15, color: h1, lineHeight: 24 }}>
                {aiReflection || "Your journey is unique. Keep logging your daily moods to unlock deeper spiritual reflections."}
              </Text>
            </View>

            {/* Metrics Grid */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatBox icon="calendar" label="Check-ins" value={metrics?.totalCheckins || 0} color="#C5A059" />
              <StatBox icon="check-circle" label="Actions Completed" value={metrics?.completedActions || 0} color="#10B981" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatBox icon="trending-up" label="Day Streak" value={metrics?.streak || 0} color="#EF4444" />
              <StatBox icon="activity" label="Frequent Mood" value={metrics?.mostFrequentMood || 'None'} color="#8B5CF6" />
            </View>

            {/* Preferred Actions */}
            {metrics?.preferredActions && metrics.preferredActions.length > 0 && (
              <View style={{ backgroundColor: cardBg, borderColor: border, borderWidth: 1, borderRadius: 24, padding: 20, marginTop: 12 }}>
                <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Top Actions</Text>
                <View style={{ gap: 12 }}>
                  {metrics.preferredActions.map((item, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 14, color: h1, textTransform: 'capitalize' }}>{item.action}</Text>
                      <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: muted }}>{item.count} times</Text>
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
