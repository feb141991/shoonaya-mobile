import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS, FONTS, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { isGuestMode, setGuestMode } from '@/lib/guestSession';

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

  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const loadData = useCallback(async () => {
    setLoadError(false);

    if (await isGuestMode()) {
      setIsGuest(true);
      return;
    }

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
      <Screen style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (isGuest) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
        header={{ title: 'Karma Ledger', onBack: () => router.back() }}
      >
        <EmptyState
          icon="list"
          title="Sign in to see your ledger"
          subtitle="Your karma history is saved to your account."
          ctaLabel="Sign in"
          onCta={() => {
            void setGuestMode(false).then(() => router.replace('/(auth)/login'));
          }}
        />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen
        style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
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
      style={{ flex: 1, backgroundColor: theme.bg, paddingHorizontal: 0, paddingBottom: 0 }}
      header={{ title: 'Karma Ledger', onBack: () => router.back() }}
    >
      <FlatList
        data={ledger}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        ListEmptyComponent={() => (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.sans, color: theme.dim }}>No karma points recorded yet.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: theme.brand }}>
                {item.amount > 0 ? '+' : ''}{item.amount}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: theme.text, marginBottom: 4 }}>{item.reason || 'Sadhana'}</Text>
              <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: theme.dim }}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
