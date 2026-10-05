import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, KATHA_VIEW_ACCENT, RADII, TRADITION_ACCENT, TYPE, themeColor } from '@/lib/constants';
import { readBhaktiContentCache, writeBhaktiContentCache, bhaktiCacheKeys } from '@/lib/bhaktiContentCache';
import panchatantraExpandedSnapshot from '@/assets/data/panchatantra-expanded-snapshot.json';
import { getPanchatantraArtworkSource, hasDedicatedSceneArtwork } from '@/lib/panchatantraArtwork';

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
  titleHi?: string;
  preview: string;
  phal: string;
  durationMin: number;
  tags: string[];
  portrait?: string;
};

const OFFLINE_PANCHATANTRA_KATHAS: KathaListItem[] = (panchatantraExpandedSnapshot as any[]).map((s) => ({
  id: s.id,
  tradition: 'all',
  occasion: 'general',
  title: s.title,
  titleHi: s.titleHi,
  preview: s.body?.[0]?.slice(0, 140) ?? '',
  phal: s.phal ?? '',
  durationMin: s.durationMin ?? 4,
  tags: ['panchatantra'],
  portrait: s.portrait ?? '📜',
}));

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

function isKathaList(value: unknown): value is KathaListItem[] {
  return Array.isArray(value);
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
    setLoadError(false);

    // Cache-first paint (reliability plan item 6): this view's kathas are
    // the same content for every visitor, so a cache hit shows them
    // instantly and clears `loading` immediately, reserving SacredLoader
    // for a genuine first-ever load with nothing cached yet. A failed
    // background reconcile below must not blow away content already
    // painted from the cache.
    const cacheKey = bhaktiCacheKeys.kathaList(view);
    const cached = await readBhaktiContentCache(cacheKey, isKathaList);
    let hadCache = Boolean(cached);
    if (cached) {
      setKathas(cached);
      setLoading(false);
    } else if (view === 'panchatantra') {
      setKathas(OFFLINE_PANCHATANTRA_KATHAS);
      setLoading(false);
      hadCache = true;
    }

    try {
      const response = await apiFetch(`/api/bhakti/katha?view=${view}`);
      if (!response.ok) {
        if (!hadCache) setLoadError(true);
        return;
      }
      const json = await response.json();
      const kathas: KathaListItem[] = Array.isArray(json?.kathas) ? json.kathas : [];
      setKathas(kathas);
      void writeBhaktiContentCache(cacheKey, kathas);
    } catch {
      if (!hadCache) setLoadError(true);
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
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="bhakti"
          title={meta ? `Opening ${meta.heading}` : 'Opening Sacred Kathas'}
          subtitle={meta?.sub ?? 'Immersing in divine narratives and spiritual inspiration...'}
          showBack={true}
        />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} fallbackHref="/(tabs)/bhakti" handleHardwareBack />
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
        style={{ flex: 1, width: '100%' }}
        data={chunkPairs(filtered)}
        keyExtractor={(row, rowIndex) => row[0]?.id ?? String(rowIndex)}
        contentContainerStyle={{ width: '100%', maxWidth: '100%', paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <View style={{ width: '100%', paddingHorizontal: 20, paddingTop: 16 }}>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <BackButton fallbackHref="/(tabs)/bhakti" handleHardwareBack variant="glass" showLabel={false} />
                <PressableSurface
                  haptic="selection"
                  onPress={() => setShowSearch((s) => !s)}
                  accessibilityLabel="Search kathas"
                  style={{
                    width: 44,
                    height: 44,
                    minHeight: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
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
                <Text style={{ ...TYPE.cardHeading, fontSize: 24, color: theme.text, marginTop: 4 }}>
                  {meta.heading}
                </Text>
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
              {!searchQuery && todayKatha && (() => {
                const todayArtwork = view === 'panchatantra' ? getPanchatantraArtworkSource(todayKatha.id) : null;
                return (
                  <PressableSurface
                    haptic="selection"
                    onPress={() => router.push(`/bhakti/katha/${todayKatha.id}` as Href)}
                    accessibilityLabel={`Today's pick, ${todayKatha.title}`}
                    style={{ borderRadius: 22 }}
                  >
                    <View
                      style={{
                        borderRadius: 22,
                        padding: todayArtwork ? 0 : 18,
                        backgroundColor: `${meta.accent}12`,
                        borderWidth: 1,
                        borderColor: `${meta.accent}28`,
                        overflow: 'hidden',
                        gap: todayArtwork ? 0 : 12,
                      }}
                    >
                      {todayArtwork ? (
                        <View style={{ width: '100%', height: 160, position: 'relative' }}>
                          <Image
                            source={todayArtwork}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            contentPosition="center"
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                          />
                          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                            <Feather name="star" size={11} color="#F59E0B" />
                            <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: '#FDE68A' }}>Today&apos;s Wisdom Fable</Text>
                          </View>
                          <View style={{ position: 'absolute', bottom: 10, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                              <Text style={{ ...TYPE.cardHeading, fontSize: 18, color: '#FFFFFF', fontFamily: FONTS.serifBold }} numberOfLines={1}>{todayKatha.title}</Text>
                              {todayKatha.titleHi ? (
                                <Text style={{ ...TYPE.micro, color: '#FDE68A', fontFamily: FONTS.devanagari }}>{todayKatha.titleHi}</Text>
                              ) : null}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: meta.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                              <Feather name="book-open" size={12} color={COLORS.onMediaWhite} />
                              <Text style={{ ...TYPE.micro, color: '#FFFFFF', fontFamily: FONTS.sansSemiBold }}>Read</Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: `${meta.accent}18`, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Feather name="star" size={11} color={meta.accent} />
                            <Text style={{ ...TYPE.micro, letterSpacing: 1.4, textTransform: 'uppercase', color: meta.accent }}>Today&apos;s Pick</Text>
                          </View>
                          <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>{todayKatha.durationMin} min</Text>
                        </View>
                      )}

                      <View style={{ padding: todayArtwork ? 14 : 0, gap: 8 }}>
                        {!todayArtwork ? (
                          <Text style={{ ...TYPE.cardHeading, fontSize: 19, color: theme.text }}>{todayKatha.title}</Text>
                        ) : null}
                        <Text style={{ ...TYPE.body, color: theme.dim, fontStyle: 'italic' }} numberOfLines={2}>
                          &ldquo;{todayKatha.preview}&rdquo;
                        </Text>
                        {!todayArtwork ? (
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
                        ) : null}
                      </View>
                    </View>
                  </PressableSurface>
                );
              })()}

              {!searchQuery && weekKathas.length > 0 && (
                <View style={{ gap: 10, overflow: 'hidden' }}>
                  <SectionHeader label="Weekly Sadhana" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
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
          </View>
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
          ) : view === 'panchatantra' ? (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: rowIndex === 0 ? 10 : 12 }}>
              {row.map((k) => (
                <PanchatantraCard key={k.id} katha={k} onPress={() => router.push(`/bhakti/katha/${k.id}` as Href)} theme={theme} />
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

function PanchatantraCard({
  katha,
  onPress,
  theme,
}: {
  katha: KathaListItem;
  onPress: () => void;
  theme: ReturnType<typeof themeColor>;
}) {
  const isDark = useColorScheme() === 'dark';
  const artwork = getPanchatantraArtworkSource(katha.id);
  const isDedicated = hasDedicatedSceneArtwork(katha.id);

  return (
    <PressableSurface
      haptic="selection"
      onPress={onPress}
      accessibilityLabel={`Read storybook, ${katha.title}`}
      style={{ flex: 1 }}
    >
      <View
        style={{
          borderRadius: RADII.lg,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(197,160,89,0.25)' : 'rgba(216,138,28,0.22)',
          backgroundColor: isDark ? '#14100C' : '#FAF6EE',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 5,
          elevation: 3,
        }}
      >
        {/* Cover Stage */}
        <View
          style={{
            aspectRatio: 16 / 10,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: isDark ? '#1E1610' : '#2A1810',
          }}
        >
          {artwork ? (
            <Image
              source={artwork}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="center"
              transition={200}
            />
          ) : (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#18120C' : '#26180E',
                padding: 8,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(216,138,28,0.4)',
                  backgroundColor: 'rgba(216,138,28,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>{katha.portrait ?? '📜'}</Text>
              </View>
              <Text
                style={{
                  ...TYPE.micro,
                  color: '#D88A1C',
                  marginTop: 6,
                  letterSpacing: 1,
                  fontFamily: FONTS.devanagariBold,
                }}
              >
                पञ्चतन्त्र
              </Text>
            </View>
          )}

          {/* Vignette bottom gradient into card */}
          <LinearGradient
            colors={['transparent', isDark ? 'rgba(20,16,12,0.7)' : 'rgba(250,246,238,0.7)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 }}
            pointerEvents="none"
          />

          {/* Badge: Storybook vs 6 Scenes */}
          <View
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              backgroundColor: isDedicated ? 'rgba(180,83,9,0.9)' : 'rgba(0,0,0,0.65)',
              borderRadius: RADII.pill,
              paddingHorizontal: 7,
              paddingVertical: 2.5,
              borderWidth: 1,
              borderColor: isDedicated ? 'rgba(251,191,36,0.6)' : 'rgba(255,255,255,0.2)',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 9,
                fontFamily: FONTS.sansSemiBold,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {isDedicated ? '★ Storybook' : '6 Scenes'}
            </Text>
          </View>
        </View>

        {/* Narrative info */}
        <View style={{ padding: 10, gap: 4 }}>
          <Text
            style={{
              ...TYPE.cardHeading,
              fontSize: 13,
              fontFamily: FONTS.serifBold,
              color: isDark ? '#F5EBE1' : '#2A1A10',
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {katha.title}
          </Text>

          {katha.phal ? (
            <Text
              style={{
                ...TYPE.micro,
                color: isDark ? 'rgba(212,175,55,0.85)' : '#92400E',
                fontStyle: 'italic',
                lineHeight: 14,
              }}
              numberOfLines={2}
            >
              &ldquo;{katha.phal}&rdquo;
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 2,
              paddingTop: 6,
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(197,160,89,0.15)' : 'rgba(216,138,28,0.15)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="clock" size={10} color="#C87850" />
              <Text style={{ ...TYPE.micro, color: theme.dim }}>{katha.durationMin} min</Text>
            </View>
            <Feather name="arrow-right" size={12} color="#C87850" />
          </View>
        </View>
      </View>
    </PressableSurface>
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
