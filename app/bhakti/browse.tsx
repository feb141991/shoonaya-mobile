import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, RADII, TYPE, themeColor } from '@/lib/constants';

// ── Bhakti Phase 5 — native equivalent of the PWA's
// src/app/(main)/bhakti/browse/page.tsx "Sacred Library". Backs the hub's
// Stotrams & Hymns / Sacred Chants cards. Fetches the full stotram list
// once (with deityMeta/moodMeta) from GET /api/bhakti/stotram and applies
// the same tradition/deity/type/mood filter PWA's BrowseInner does client-
// side, rather than re-fetching per filter change.

type StotramListItem = {
  id: string;
  title: string;
  titleDevanagari: string;
  deity: string;
  deityEmoji: string;
  tradition: string;
  type: string;
  mood?: string;
  language: string;
  source: string;
  description: string;
  hasAudio: boolean;
  verseCount: number;
};

type DeityMeta = Record<string, { label: string; emoji: string; color: string }>;
type MoodMeta = Record<string, { label: string; emoji: string; desc: string }>;

const TYPE_LABELS: Record<string, string> = {
  mantra: 'Mantra', stotram: 'Stotram', kirtan: 'Kirtan',
  bhajan: 'Bhajan', dhyana: 'Dhyana', simran: 'Simran',
};

const TRADITION_LABELS: Record<string, string> = {
  hindu: 'Hindu', sikh: 'Sikh', buddhist: 'Buddhist', jain: 'Jain', all: 'All',
};

const TRADITION_EMOJI: Record<string, string> = {
  hindu: '🕉️', sikh: '☬', buddhist: '☸️', jain: '🪷',
};

function PillRow({
  title, items, active, onSelect, accent, theme,
}: {
  title: string;
  items: { id: string; label: string; emoji?: string }[];
  active: string;
  onSelect: (id: string) => void;
  accent: string;
  theme: ReturnType<typeof themeColor>;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.dim }}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {[{ id: 'all', label: 'All', emoji: '✨' }, ...items].map((item) => {
          const isActive = active === item.id;
          return (
            <PressableSurface key={item.id} haptic="selection" onPress={() => onSelect(item.id)} style={{ borderRadius: 999 }}>
              <View
                style={{
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  backgroundColor: isActive ? `${accent}20` : theme.card,
                  borderWidth: 1,
                  borderColor: isActive ? `${accent}50` : theme.border,
                }}
              >
                <Text style={{ ...TYPE.caption, color: isActive ? accent : theme.dim, fontWeight: isActive ? '700' : '500' }}>
                  {item.emoji ? `${item.emoji} ` : ''}{item.label}
                </Text>
              </View>
            </PressableSurface>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function BrowseScreen() {
  const params = useLocalSearchParams<{ tradition?: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);
  const amber = COLORS.brandGold;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [all, setAll] = useState<StotramListItem[]>([]);
  const [deityMeta, setDeityMeta] = useState<DeityMeta>({});
  const [moodMeta, setMoodMeta] = useState<MoodMeta>({});

  const [tradition, setTradition] = useState(params.tradition ?? 'all');
  const [deity, setDeity] = useState('all');
  const [mood, setMood] = useState('all');
  const [type, setType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch('/api/bhakti/stotram?limit=200');
      if (!response.ok) { setLoadError(true); return; }
      const json = await response.json();
      setAll(Array.isArray(json?.stotrams) ? json.stotrams : []);
      setDeityMeta(json?.deityMeta ?? {});
      setMoodMeta(json?.moodMeta ?? {});
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = all.filter((s) => {
    const traditionOk = tradition === 'all' || s.tradition === tradition || s.tradition === 'all';
    const deityOk = deity === 'all' || s.deity === deity || s.deity === 'universal';
    const moodOk = mood === 'all' || s.mood === mood;
    const typeOk = type === 'all' || s.type === type;
    return traditionOk && deityOk && moodOk && typeOk;
  });

  const deityItems = Object.entries(deityMeta).map(([id, m]) => ({ id, label: m.label, emoji: m.emoji }));
  const moodItems = Object.entries(moodMeta).map(([id, m]) => ({ id, label: m.label, emoji: m.emoji }));
  const traditionItems = Object.entries(TRADITION_LABELS)
    .filter(([id]) => id !== 'all')
    .map(([id, label]) => ({ id, label, emoji: TRADITION_EMOJI[id] ?? '✨' }));
  const typeItems = Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }));

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={amber} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load the sacred library.</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 4 }}>
              <BackButton style={{ marginBottom: 8 }} />
              <Text style={{ ...TYPE.title, color: theme.text }}>Sacred Library</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim }}>
                {tradition === 'sikh' ? 'Banis, kirtans & simran'
                  : tradition === 'buddhist' ? 'Sutras, chants & dhamma'
                  : tradition === 'jain' ? 'Stotrams, mantras & bhajans'
                  : 'Mantras, stotrams & bhajans'}
              </Text>
            </View>

            <View style={{ marginHorizontal: 20, marginTop: 18, borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 16, gap: 14 }}>
              <PillRow title="Tradition" items={traditionItems} active={tradition} onSelect={setTradition} accent={amber} theme={theme} />
              <PillRow title="Deity" items={deityItems} active={deity} onSelect={setDeity} accent={amber} theme={theme} />
              <PillRow title="Type" items={typeItems} active={type} onSelect={setType} accent={amber} theme={theme} />
              <PillRow title="Mood" items={moodItems} active={mood} onSelect={setMood} accent={amber} theme={theme} />
            </View>

            <Text style={{ ...TYPE.caption, color: theme.dim, paddingHorizontal: 20, marginTop: 18 }}>
              {filtered.length} track{filtered.length !== 1 ? 's' : ''}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, paddingBottom: 48, paddingHorizontal: 20, gap: 10 }}>
            <Text style={{ fontSize: 30 }}>🙏</Text>
            <Text style={{ ...TYPE.body, color: theme.dim }}>No tracks match these filters</Text>
            <PressableSurface haptic="selection" onPress={() => { setDeity('all'); setMood('all'); setType('all'); }}>
              <Text style={{ ...TYPE.caption, color: amber, fontWeight: '700' }}>Clear filters</Text>
            </PressableSurface>
          </View>
        }
        renderItem={({ item: s }) => {
          const dm = deityMeta[s.deity] ?? deityMeta.universal ?? { label: s.deity, emoji: '', color: amber };
          return (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 12,
                borderRadius: RADII.lg,
                borderWidth: 1,
                borderColor: `${dm.color}22`,
                backgroundColor: theme.card,
                padding: 14,
                paddingLeft: 16,
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: dm.color, opacity: 0.7 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{s.deityEmoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...TYPE.body, fontWeight: '700', color: theme.text }}>{s.title}</Text>
                      <Text style={{ ...TYPE.caption, color: dm.color, marginTop: 1 }}>{s.titleDevanagari}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: dm.color, backgroundColor: `${dm.color}18`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        {TYPE_LABELS[s.type] ?? s.type}
                      </Text>
                      {s.verseCount > 1 ? <Text style={{ ...TYPE.micro, color: theme.dim }}>{s.verseCount} verses</Text> : null}
                    </View>
                  </View>

                  <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 4 }} numberOfLines={2}>{s.description}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <PressableSurface haptic="selection" onPress={() => router.push(`/bhakti/stotram/${s.id}` as Href)} style={{ borderRadius: 999 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: `${dm.color}18`, borderWidth: 1, borderColor: `${dm.color}30` }}>
                        <Feather name="book-open" size={11} color={dm.color} />
                        <Text style={{ ...TYPE.caption, color: dm.color, fontWeight: '700' }}>Read</Text>
                      </View>
                    </PressableSurface>
                    {s.hasAudio ? (
                      <PressableSurface haptic="selection" onPress={() => router.push(`/bhakti/stotram/${s.id}` as Href)} style={{ borderRadius: 999 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: `${amber}12`, borderWidth: 1, borderColor: `${amber}30` }}>
                          <Feather name="play" size={11} color={amber} />
                          <Text style={{ ...TYPE.caption, color: amber, fontWeight: '700' }}>Listen</Text>
                        </View>
                      </PressableSurface>
                    ) : null}
                    <Text style={{ ...TYPE.micro, color: theme.dim, marginLeft: 'auto' }}>
                      {TRADITION_LABELS[s.tradition] ?? s.tradition}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
