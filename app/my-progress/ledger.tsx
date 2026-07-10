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
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

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
  const [loadError, setLoadError] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const loadData = useCallback(async () => {
    setLoadError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    let res: Response;
    try {
      res = await apiFetch('/api/native/karma-ledger');
    } catch {
      setLoadError(true);
      return;
    }
    if (!res.ok) {
      setLoadError(true);
      return;
    }

    const payload = (await res.json()) as { ledger: LedgerRow[] };
    setLedger(payload.ledger || []);
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  if (loading) {
    return (
      <Screen style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.brandGold} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'Karma Ledger', onBack: () => router.back() }}
      >
        <EmptyState
          icon="alert-circle"
          title="Couldn't load your ledger"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
        />
      </Screen>
    );
  }

  return (
    <Screen 
      style={{ flex: 1, backgroundColor: isDark ? COLORS.darkBg : COLORS.creamBg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Karma Ledger', onBack: () => router.back() }}
    >
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
