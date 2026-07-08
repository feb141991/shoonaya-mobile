import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

type LedgerRow = {
  id: string;
  amount: number;
  reason: string;
  source_route: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default function LedgerScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const router = useRouter();

  const h1 = isDark ? '#f5dfa0' : '#1a0a02';
  const muted = isDark ? 'rgba(245,210,130,0.45)' : 'rgba(100,55,10,0.50)';
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;

  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const { data } = await supabase
      .from('karma_ledger')
      .select('id, amount, reason, source_route, metadata, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    setLedger(data || []);
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading) {
    return (
      <Screen style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg }} >
      <View style={{
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: border,
        backgroundColor: isDark ? 'rgba(19,14,8,0.8)' : 'rgba(253,246,236,0.8)',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Feather name="chevron-left" size={20} color={h1} />
        </Pressable>
        <Text style={{ fontFamily: FONTS.serifBold, fontSize: 20, color: h1 }}>Karma Ledger</Text>
      </View>

      <FlatList
        data={ledger}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        ListEmptyComponent={() => (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.sans, color: muted }}>No karma points recorded yet.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cardBg,
            borderColor: border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: '#C5A059' }}>
                {item.amount > 0 ? '+' : ''}{item.amount}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: h1, marginBottom: 4 }}>{item.reason || 'Sadhana'}</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: muted }}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
