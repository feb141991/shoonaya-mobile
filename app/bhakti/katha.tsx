import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { apiFetch } from '@/lib/api';
import { COLORS, KATHA_VIEW_ACCENT, RADII, TRADITION_ACCENT, TYPE, themeColor } from '@/lib/constants';

// ── Bhakti Phase 4 — native equivalent of the PWA's
// src/app/(main)/bhakti/katha/KathaClient.tsx. Every katha-card in the
// Bhakti hub links here with a `view` param (puranic/bani/dhamma/jain/
// panchatantra/heroes), which the API's VIEW_FILTERS already understand
// (see /api/bhakti/katha), so this screen always renders a single locked
// view rather than PWA's optional tradition-tab switcher for the
// no-view/all-kathas case — every real entry point in this app supplies a
// view, so that switcher isn't reachable and was left out rather than
// built and never used.

type KathaListItem = {
  id: string;
  tradition: string;
  occasion: string;
  deity?: string;
  title: string;
  preview: string;
  phal: string;
  durationMin: number;
  tags: string[];
  portrait?: string;
};

type ViewKey = 'puranic' | 'bani' | 'dhamma' | 'jain' | 'panchatantra' | 'heroes';

const VIEW_META: Record<ViewKey, { heading: string; sub: string; accent: string }> = {
  puranic: { heading: 'Puranic Tales', sub: 'Ramayana, Mahabharata & the Puranas', accent: KATHA_VIEW_ACCENT.puranic },
  bani: { heading: 'Bani & Sakhis', sub: 'Guru stories, sakhis and kirtan wisdom', accent: KATHA_VIEW_ACCENT.bani },
  dhamma: { heading: 'Dhamma Stories', sub: "Buddha's parables & Jataka tales", accent: KATHA_VIEW_ACCENT.dhamma },
  jain: { heading: 'Jain Kathas', sub: 'Tirthankara stories & moral tales', accent: KATHA_VIEW_ACCENT.jain },
  panchatantra: { heading: 'Panchatantra', sub: 'Ancient animal fables & wisdom tales', accent: KATHA_VIEW_ACCENT.panchatantra },
  heroes: { heading: 'Heroes of Bharat', sub: 'Warriors, saints & unsung legends', accent: KATHA_VIEW_ACCENT.heroes },
};

const TRADITION_LABEL: Record<string, { label: string; color: string }> = {
  hindu: { label: 'Hindu', color: TRADITION_ACCENT.hindu },
  sikh: { label: 'Sikh', color: TRADITION_ACCENT.sikh },
  buddhist: { label: 'Buddhist', color: TRADITION_ACCENT.buddhist },
  jain: { label: 'Jain', color: TRADITION_ACCENT.jain },
  all: { label: 'Universal', color: TRADITION_ACCENT.all },
};

const OCCASION_LABEL: Record<string, string> = {
  ekadashi: 'Ekadashi', purnima: 'Purnima', amavasya: 'Amavasya',
  pradosh: 'Pradosh', chaturthi: 'Chaturthi', shivaratri: 'Shivaratri',
  navratri: 'Navratri', diwali: 'Diwali', holi: 'Holi',
  janmashtami: 'Janmashtami', ramnavami: 'Ram Navami',
  'ganesh-chaturthi': 'Ganesh Chaturthi', 'karva-chauth': 'Karva Chauth',
  teej: 'Teej', gurpurab: 'Gurpurab', baisakhi: 'Baisakhi',
  vesak: 'Vesak', paryushana: 'Paryushana', general: 'General',
};

function isViewKey(value: string | undefined): value is ViewKey {
  return !!value && value in VIEW_META;
}

function badgeLabel(k: KathaListItem): string {
  if (k.tags.includes('heroes')) return 'Hero Legend';
  if (k.tags.includes('panchatantra')) return 'Wisdom Tale';
  return TRADITION_LABEL[k.tradition]?.label ?? k.tradition;
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export default function KathaListScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const view = isViewKey(params.view) ? params.view : 'puranic';
  const meta = VIEW_META[view];
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [kathas, setKathas] = useState<KathaListItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch(`/api/bhakti/katha?view=${view}`);
      if (!response.ok) { setLoadError(true); return; }
      const json = await response.json();
      setKathas(Array.isArray(json?.kathas) ? json.kathas : []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void load(); }, [load]);

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const todayKatha = kathas.length > 0 ? kathas[dayOfYear % kathas.length] : null;
  const weekKathas = kathas.filter((k) => k.id !== todayKatha?.id).slice(0, 5);

  const filtered = kathas.filter((k) => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return (
      k.title.toLowerCase().includes(q) ||
      (k.deity ?? '').toLowerCase().includes(q) ||
      (OCCASION_LABEL[k.occasion] ?? '').toLowerCase().includes(q) ||
      k.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={meta.accent} />
        </View>
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load these stories.</Text>
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
          <>
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <BackButton />
                <PressableSurface
                  haptic="selection"
                  onPress={() => setShowSearch((s) => !s)}
                  accessibilityLabel="Search kathas"
                  style={{ borderRadius: 999 }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card }}>
                    <Feather name="search" size={16} color={showSearch ? meta.accent : theme.dim} />
                  </View>
                </PressableSurface>
              </View>

              <View style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={{ ...TYPE.chip, letterSpacing: 1.6, textTransform: 'uppercase', color: meta.accent }}>
                  {meta.sub}
                </Text>
                <Text style={{ ...TYPE.title, color: theme.text, marginTop: 2 }}>{meta.heading}</Text>
              </View>

              {showSearch && (
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by deity, occasion, title…"
                  placeholderTextColor={theme.dim}
                  autoFocus
                  style={{
                    marginTop: 14,
                    borderRadius: RADII.md,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    color: theme.text,
                    ...TYPE.body,
                  }}
                />
              )}
            </View>

            <View style={{ paddingHorizontal: 20, gap: 20, marginTop: 20 }}>
              {!searchQuery && todayKatha && (
                <PressableSurface
                  haptic="selection"
                  onPress={() => router.push(`/bhakti/katha/${todayKatha.id}` as Href)}
                  accessibilityLabel={`Today's pick, ${todayKatha.title}`}
                  style={{ borderRadius: 22 }}
                >
                  <View
                    style={{
                      borderRadius: 22,
                      padding: 18,
                      backgroundColor: `${meta.accent}12`,
                      borderWidth: 1,
                      borderColor: `${meta.accent}28`,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: `${meta.accent}18`, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Feather name="star" size={11} color={meta.accent} />
                        <Text style={{ ...TYPE.micro, letterSpacing: 1.4, textTransform: 'uppercase', color: meta.accent }}>Today&apos;s Pick</Text>
                      </View>
                      <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>{todayKatha.durationMin} min</Text>
                    </View>
                    <Text style={{ ...TYPE.cardHeading, fontSize: 19, color: theme.text }}>{todayKatha.title}</Text>
                    <Text style={{ ...TYPE.body, color: theme.dim, fontStyle: 'italic' }} numberOfLines={2}>
                      &ldquo;{todayKatha.preview}&rdquo;
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim, borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                          {badgeLabel(todayKatha)}
                        </Text>
                        <Text style={{ ...TYPE.micro, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim, borderWidth: 1, borderColor: theme.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                          {OCCASION_LABEL[todayKatha.occasion] ?? todayKatha.occasion}
                        </Text>
                      </View>
                      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: meta.accent, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="book-open" size={15} color={COLORS.onMediaWhite} />
                      </View>
                    </View>
                  </View>
                </PressableSurface>
              )}

              {!searchQuery && weekKathas.length > 0 && (
                <View style={{ gap: 10 }}>
                  <SectionHeader label="Weekly Sadhana" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {weekKathas.map((k) => (
                      <PressableSurface
                        key={k.id}
                        haptic="selection"
                        onPress={() => router.push(`/bhakti/katha/${k.id}` as Href)}
                        accessibilityLabel={k.title}
                        style={{ borderRadius: RADII.lg }}
                      >
                        <Card tone="auto" style={{ width: 190, height: 150, justifyContent: 'space-between', gap: 8, borderColor: theme.premiumBorder }}>
                          <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: TRADITION_LABEL[k.tradition]?.color ?? meta.accent }}>
                            {badgeLabel(k)}
                          </Text>
                          <Text style={{ ...TYPE.cardHeading, fontSize: 13, color: theme.text, flex: 1 }} numberOfLines={3}>
                            {k.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Feather name="clock" size={11} color={meta.accent} />
                            <Text style={{ ...TYPE.micro, color: theme.dim }}>{k.durationMin} min</Text>
                          </View>
                        </Card>
                      </PressableSurface>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionHeader label={searchQuery ? 'Results' : 'All Stories'} />
                {!searchQuery && <Text style={{ ...TYPE.caption, color: theme.dim }}>{filtered.length} stories</Text>}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 48, alignItems: 'center', gap: 10 }}>
            <Feather name="book-open" size={30} color={theme.dim} />
            <Text style={{ ...TYPE.body, color: theme.dim }}>
              {searchQuery ? 'The archive is silent. Try another keyword.' : 'No stories found.'}
            </Text>
          </View>
        }
        renderItem={({ item: row, index: rowIndex }) =>
          view === 'heroes' ? (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: rowIndex === 0 ? 10 : 12 }}>
              {row.map((k) => (
                <HeroCard key={k.id} katha={k} onPress={() => router.push(`/bhakti/katha/${k.id}` as Href)} theme={theme} />
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: rowIndex === 0 ? 10 : 12 }}>
              {row.map((k) => (
                <KathaCard key={k.id} katha={k} accent={TRADITION_LABEL[k.tradition]?.color ?? meta.accent} onPress={() => router.push(`/bhakti/katha/${k.id}` as Href)} theme={theme} />
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          )
        }
      />
    </Screen>
  );
}

function KathaCard({ katha, accent, onPress, theme }: { katha: KathaListItem; accent: string; onPress: () => void; theme: ReturnType<typeof themeColor> }) {
  return (
    <PressableSurface haptic="selection" onPress={onPress} accessibilityLabel={katha.title} style={{ flex: 1 }}>
      <Card tone="auto" style={{ gap: 8, borderColor: theme.premiumBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: accent, borderWidth: 1, borderColor: `${accent}30`, backgroundColor: `${accent}10`, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            {badgeLabel(katha)}
          </Text>
          <Text style={{ ...TYPE.micro, color: theme.dim }}>{katha.durationMin}m</Text>
        </View>
        <Text style={{ ...TYPE.cardHeading, fontSize: 14, color: theme.text }} numberOfLines={2}>{katha.title}</Text>
        <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>{katha.preview}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Text style={{ ...TYPE.micro, color: theme.dim }}>{OCCASION_LABEL[katha.occasion] ?? katha.occasion}</Text>
          <Feather name="chevron-right" size={13} color={accent} />
        </View>
      </Card>
    </PressableSurface>
  );
}

function HeroCard({ katha, onPress, theme }: { katha: KathaListItem; onPress: () => void; theme: ReturnType<typeof themeColor> }) {
  const trad = TRADITION_LABEL[katha.tradition] ?? TRADITION_LABEL.hindu;
  const [shortName, subtitle] = katha.title.includes('—')
    ? [katha.title.split('—')[0].trim(), katha.title.split('—')[1]?.trim()]
    : [katha.title, null];
  return (
    <PressableSurface haptic="selection" onPress={onPress} accessibilityLabel={katha.title} style={{ flex: 1 }}>
      <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.premiumBorder, backgroundColor: theme.card, overflow: 'hidden' }}>
        <View style={{ aspectRatio: 4 / 3, backgroundColor: `${trad.color}14`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>{katha.portrait ?? '🦁'}</Text>
        </View>
        <View style={{ padding: 10, gap: 4 }}>
          <Text style={{ ...TYPE.cardHeading, fontSize: 13, color: theme.text }} numberOfLines={2}>{shortName}</Text>
          {subtitle ? <Text style={{ ...TYPE.micro, color: theme.dim }} numberOfLines={1}>{subtitle}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Feather name="clock" size={10} color={trad.color} />
            <Text style={{ ...TYPE.micro, color: theme.dim }}>{katha.durationMin} min</Text>
          </View>
        </View>
      </View>
    </PressableSurface>
  );
}
