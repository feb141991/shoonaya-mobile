import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import type { SacredIconName } from '@/components/ui/SacredIcon';
import { IconTile } from '@/components/ui/IconTile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Surface } from '@/components/ui/Surface';
import { COLORS, RADII, TYPE, themeColor } from '@/lib/constants';
import { navScrollHandler } from '@/lib/navScrollBus';
import { supabase } from '@/lib/supabase';

const TRADITION_HERO: Record<string, { greeting: string; sub: string }> = {
  hindu:    { greeting: 'Jai Sri Ram 🙏',           sub: 'Bhakti, Kathas & Sacred Practice' },
  sikh:     { greeting: 'Waheguru Ji Ka Khalsa ☬',  sub: 'Bani, Sakhis & Naam Simran'       },
  buddhist: { greeting: 'Namo Buddhaya ☸️',          sub: 'Dhamma Stories & Sacred Chants'   },
  jain:     { greeting: 'Jai Jinendra 🤲',           sub: 'Kathas, Stotrams & Simran'        },
};

// ── "Your Practice" — every card here is a real, already-built native
// route. Kept deliberately separate from CONTENT_CARDS below (which is
// still coming-soon placeholder content), so the hierarchy reads as: real
// destinations get the premium, icon-led treatment up top; not-yet-built
// content stays clearly secondary. `japa-mala`, `nitya-karma`, and
// `dharm-veer` used to live in CONTENT_CARDS too — they moved here instead
// of appearing twice on the same screen.
type PracticeCard = {
  id: SacredIconName;
  fallbackGlyph: keyof typeof Feather.glyphMap;
  label: string;
  detail: string;
  href: Href;
};

const PRACTICE_CARDS: PracticeCard[] = [
  { id: 'japa', fallbackGlyph: 'heart', label: 'Japa Mala', detail: 'Digital mala for mantra & Naam Simran', href: '/japa' },
  { id: 'nitya', fallbackGlyph: 'sunrise', label: 'Nitya Karma', detail: 'Your daily sacred rituals', href: '/nitya-karma' },
  { id: 'shloka', fallbackGlyph: 'book-open', label: 'Shloka', detail: "Today's verse & reflection", href: '/shloka' },
  { id: 'dharmveer', fallbackGlyph: 'shield', label: 'Dharm Veer', detail: 'Stories of dharmic courage', href: '/dharm-veer' },
  { id: 'panchang', fallbackGlyph: 'calendar', label: 'Panchang', detail: "Today's tithi & muhurta", href: '/panchang' },
  { id: 'vrat', fallbackGlyph: 'moon', label: 'Vrat', detail: 'Observances & fasting days', href: '/vrat' },
  { id: 'kosh', fallbackGlyph: 'star', label: 'Sacred Kosh', detail: 'Your relics & artifacts', href: '/kosh' },
];

type ContentCard = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  // Solid hex accent (not rgba) — feeds the same bg/border-tint math as
  // IconTile's iconWellColor (`${accent}15` fill, `${accent}28` border) so
  // these wells match PracticeCard's IconTile treatment instead of the old
  // one-off flat rgba fill with no border.
  accent: string;
  traditions?: string[];
};

// Coming-soon content only — every entry with a real destination has moved
// to PRACTICE_CARDS above.
const CONTENT_CARDS: ContentCard[] = [
  { id: 'puranic-tales', icon: 'file-text', title: 'Puranic Tales', description: 'Ramayana, Mahabharata & the Puranas', accent: '#C8A03C', traditions: ['hindu'] },
  { id: 'bani-sakhis', icon: 'book-open', title: 'Bani & Sakhis', description: 'Guru stories, sakhis & kirtan wisdom', accent: '#64A0DC', traditions: ['sikh'] },
  { id: 'dhamma-stories', icon: 'book-open', title: 'Dhamma Stories', description: 'Buddha\'s parables & Jataka tales', accent: '#8C64C8', traditions: ['buddhist'] },
  { id: 'jain-kathas', icon: 'book-open', title: 'Jain Kathas', description: 'Tirthankara stories & moral tales', accent: '#32A050', traditions: ['jain'] },
  { id: 'stotrams-hymns', icon: 'music', title: 'Stotrams & Hymns', description: 'Sanskrit chants, chalisa, ashtakam', accent: '#C5A059', traditions: ['hindu', 'jain'] },
  { id: 'sacred-chants', icon: 'mic', title: 'Sacred Chants', description: 'Buddhist sutras, chants & mantras', accent: '#8C64C8', traditions: ['buddhist'] },
  { id: 'panchatantra', icon: 'star', title: 'Panchatantra', description: 'Ancient animal fables & wisdom tales', accent: '#C87850' },
  { id: 'heroes-bharat', icon: 'shield', title: 'Heroes of Bharat', description: 'Warriors, saints & unsung legends', accent: '#B45050' },
  { id: 'mantras', icon: 'mic', title: 'Mantras', description: 'Chants & sacred recitations', accent: '#C5A059' },
  { id: 'sattvic-mode', icon: 'star', title: 'Sattvic Mode', description: 'Sacred ambience for puja & meditation', accent: '#C8B478' },
];

// Splits a list into fixed-width pairs for an exact 2-column grid (each row
// is flexDirection:'row' with two flex:1 children), replacing the old
// flexWrap+width:'48%' approximation that could drift with odd counts or
// wrapping edge cases. A trailing odd item gets an invisible flex:1 spacer
// so it keeps the same column width as a paired card instead of stretching
// full-bleed.
function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

function StatPill({ icon, label, brand }: { icon: keyof typeof Feather.glyphMap; label: string; brand: string }) {
  return (
    <Surface variant="soft" radius="pill" bordered={false} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 6 }}>
      <Feather name={icon} size={14} color={brand} />
      <Text style={{ ...TYPE.label, color: brand }}>{label}</Text>
    </Surface>
  );
}

export default function BhaktiScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = useMemo(() => themeColor(isDark), [isDark]);

  const [tradition, setTradition] = useState('hindu');
  const [japaStreak, setJapaStreak] = useState(0);
  const [sessionCountToday, setSessionCountToday] = useState(0);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [selectedCardTitle, setSelectedCardTitle] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadData() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const today = new Date().toISOString().slice(0, 10);
          const [{ data: profile }, { data: sadhana }, { count }] = await Promise.all([
            supabase.from('profiles').select('tradition').eq('id', user.id).single(),
            supabase.from('daily_sadhana').select('streak_count').eq('user_id', user.id).eq('date', today).single(),
            supabase.from('mala_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
          ]);
          if (active) {
            setTradition(profile?.tradition ?? 'hindu');
            setJapaStreak(sadhana?.streak_count ?? 0);
            setSessionCountToday(count ?? 0);
          }
        } catch (e) {
          // ignore
        }
      }
      void loadData();
      return () => { active = false; };
    }, [])
  );

  const hero = TRADITION_HERO[tradition] ?? TRADITION_HERO.hindu;
  const activeContentCards = CONTENT_CARDS.filter(c => !c.traditions || c.traditions.includes(tradition));

  const handlePracticePress = (href: Href) => {
    try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    router.push(href);
  };

  const handleContentCardPress = (card: ContentCard) => {
    try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSelectedCardTitle(card.title);
    setComingSoonVisible(true);
  };

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 28 }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >

        {/* Hero */}
        <View style={{ gap: 6 }}>
          <Text style={{ ...TYPE.hero, color: theme.text }}>{hero.greeting}</Text>
          <Text style={{ ...TYPE.body, color: theme.dim }}>{hero.sub}</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <StatPill icon="zap" label={`${japaStreak} Day Streak`} brand={theme.brand} />
            <StatPill icon="heart" label={`${sessionCountToday} Sessions Today`} brand={theme.brand} />
          </View>
        </View>

        {/* Your Practice — real, working destinations only */}
        <View style={{ gap: 12 }}>
          <SectionHeader label="Your Practice" />

          <View style={{ gap: 12 }}>
            {chunkPairs(PRACTICE_CARDS).map((row, rowIndex) => (
              <View key={row[0]?.id ?? rowIndex} style={{ flexDirection: 'row', gap: 12 }}>
                {row.map((card) => (
                  <PressableSurface
                    key={card.id}
                    haptic="selection"
                    onPress={() => handlePracticePress(card.href)}
                    accessibilityLabel={`${card.label}, ${card.detail}`}
                    style={{ flex: 1 }}
                  >
                    <Card tone="auto" style={{ gap: 12, borderColor: theme.premiumBorder }}>
                      <IconTile name={card.id} fallbackGlyph={card.fallbackGlyph} size="md" color={theme.brand} />
                      <View style={{ gap: 4 }}>
                        <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{card.label}</Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>
                          {card.detail}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: -2 }}>
                        <Text style={{ ...TYPE.chip, letterSpacing: 1.2, textTransform: 'uppercase', color: theme.brand }}>
                          Open
                        </Text>
                        <Feather name="chevron-right" size={11} color={theme.brand} />
                      </View>
                    </Card>
                  </PressableSurface>
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* Explore — coming soon on native */}
        <View style={{ gap: 12 }}>
          <SectionHeader label="Explore" />

          <View style={{ gap: 12 }}>
            {chunkPairs(activeContentCards).map((row, rowIndex) => (
              <View key={row[0]?.id ?? rowIndex} style={{ flexDirection: 'row', gap: 12 }}>
                {row.map((card) => (
                  <PressableSurface
                    key={card.id}
                    haptic="selection"
                    onPress={() => handleContentCardPress(card)}
                    accessibilityLabel={`${card.title}, coming soon`}
                    style={{ flex: 1 }}
                  >
                    <Card tone="auto" style={{ gap: 12, borderColor: theme.premiumBorder }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: RADII.md,
                          backgroundColor: `${card.accent}15`,
                          borderWidth: 1,
                          borderColor: `${card.accent}28`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Feather name={card.icon} size={22} color={card.accent} />
                      </View>
                      <View style={{ gap: 4 }}>
                        <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: theme.text }}>{card.title}</Text>
                        <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>
                          {card.description}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: -2 }}>
                        <Text style={{ ...TYPE.chip, letterSpacing: 1.2, textTransform: 'uppercase', color: card.accent }}>
                          Open
                        </Text>
                        <Feather name="chevron-right" size={11} color={card.accent} />
                      </View>
                    </Card>
                  </PressableSurface>
                ))}
                {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal visible={comingSoonVisible} transparent animationType="slide" onRequestClose={() => setComingSoonVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.celebrationScrim }}>
          <Pressable style={{ flex: 1 }} onPress={() => setComingSoonVisible(false)} accessibilityRole="button" accessibilityLabel="Dismiss" />
          <View style={{ backgroundColor: theme.bg, padding: 24, paddingBottom: 48, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 }}>
            <View style={{ width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 }} />
            <Text style={{ ...TYPE.title, color: theme.text }}>{selectedCardTitle}</Text>
            <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 22 }}>
              This feature is currently available in the web version of Shoonaya. We are bringing it to the native app very soon!
            </Text>
            <Button label="Got it" onPress={() => setComingSoonVisible(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

    </Screen>
  );
}
