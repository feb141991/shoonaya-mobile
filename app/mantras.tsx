import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, TYPE, themeColor } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// ── Bhakti Phase 7 — native equivalent of the PWA's
// src/app/(main)/mantras/MantrasClient.tsx. Route is a top-level /mantras
// (not nested under /bhakti) to match the PWA's own route shape.
// Premium mantras aren't hidden — tapping one shows a paywall nudge, same
// as PWA's toast, via a plain Alert since the app doesn't have a shared
// toast component yet.

type Mantra = {
  id: string;
  tradition: string;
  deity?: string;
  nameEn: string;
  nameLocal: string;
  tags: string[];
  isPremium: boolean;
};

type TabType = 'all' | 'tradition' | 'others';

const AMBER = COLORS.brandGold;

export default function MantrasScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [tradition, setTradition] = useState('hindu');
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [{ data: { user } }, mantrasRes] = await Promise.all([
        supabase.auth.getUser(),
        apiFetch('/api/bhakti/mantras'),
      ]);
      if (!mantrasRes.ok) { setLoadError(true); return; }
      const json = await mantrasRes.json();
      setMantras(Array.isArray(json?.mantras) ? json.mantras : []);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tradition, is_pro')
          .eq('id', user.id)
          .single();
        setTradition(profile?.tradition ?? 'hindu');
        setIsPro(profile?.is_pro ?? false);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const displayTradition = tradition.charAt(0).toUpperCase() + tradition.slice(1);

  const filtered = mantras.filter((m) => {
    if (activeTab === 'tradition') return m.tradition === tradition || m.tradition === 'all';
    if (activeTab === 'others') return m.tradition !== tradition && m.tradition !== 'all';
    return true;
  });

  const handleCardPress = (mantra: Mantra) => {
    if (mantra.isPremium && !isPro) {
      Alert.alert('Unlock with Zenith 🔒', 'This mantra is part of the premium collection.');
      return;
    }
    // PWA deep-links straight into a specific mala session
    // (`/bhakti/mala?mantraId=X`). Native's Japa Mala flow has its own
    // curated JAPA_MANTRAS set (lib/traditions.ts) with its own id space —
    // a different, smaller content model than this screen's `data/
    // mantras.ts` list — and its picker doesn't accept a preselect param,
    // so there's no route that can honor a specific mantraId yet. Routing
    // into Japa itself (rather than a 404) until the two mantra sets are
    // reconciled.
    router.push('/japa' as Href);
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={AMBER} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load mantras.</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <FlatList
        data={chunkPairs(filtered)}
        keyExtractor={(row, rowIndex) => row[0]?.id ?? String(rowIndex)}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <BackButton showLabel={false} />
              <Text style={{ ...TYPE.title, color: theme.text }}>Mantras</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(['all', 'tradition', 'others'] as TabType[]).map((tab) => {
                const isActive = activeTab === tab;
                const label = tab === 'all' ? 'All' : tab === 'tradition' ? displayTradition : 'Others';
                return (
                  <PressableSurface key={tab} haptic="selection" onPress={() => setActiveTab(tab)} style={{ borderRadius: 999 }}>
                    <View
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: isActive ? AMBER : theme.card,
                        borderWidth: 1,
                        borderColor: isActive ? AMBER : theme.border,
                      }}
                    >
                      <Text style={{ ...TYPE.caption, fontWeight: '700', color: isActive ? COLORS.ink : theme.dim }}>{label}</Text>
                    </View>
                  </PressableSurface>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item: row, index: rowIndex }) => (
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: rowIndex === 0 ? 16 : 12 }}>
            {row.map((mantra) => {
              const isLocked = mantra.isPremium && !isPro;
              return (
                <PressableSurface key={mantra.id} haptic="selection" onPress={() => handleCardPress(mantra)} style={{ flex: 1 }}>
                  <Card tone="auto" style={{ gap: 10, borderColor: theme.premiumBorder, opacity: isLocked ? 0.7 : 1 }}>
                    <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: theme.text }}>{mantra.nameEn}</Text>
                    <Text style={{ ...TYPE.caption, color: AMBER }}>{mantra.nameLocal}</Text>
                    {mantra.deity ? (
                      <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim }}>{mantra.deity}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {mantra.tags.slice(0, 3).map((tag) => (
                        <Text
                          key={tag}
                          style={{ ...TYPE.micro, letterSpacing: 0.6, textTransform: 'uppercase', color: AMBER, backgroundColor: `${AMBER}18`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}
                        >
                          {tag}
                        </Text>
                      ))}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Feather name={isLocked ? 'lock' : 'chevron-right'} size={16} color={isLocked ? AMBER : theme.dim} />
                    </View>
                  </Card>
                </PressableSurface>
              );
            })}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        )}
      />
    </Screen>
  );
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}
