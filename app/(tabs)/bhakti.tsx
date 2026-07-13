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
  tint: string;
  traditions?: string[];
};

// Coming-soon content only — every entry with a real destination has moved
// to PRACTICE_CARDS above.
const CONTENT_CARDS: ContentCard[] = [
  { id: 'puranic-tales', icon: 'file-text', title: 'Puranic Tales', description: 'Ramayana, Mahabharata & the Puranas', tint: 'rgba(200,160,60,0.10)', traditions: ['hindu'] },
  { id: 'bani-sakhis', icon: 'book-open', title: 'Bani & Sakhis', description: 'Guru stories, sakhis & kirtan wisdom', tint: 'rgba(100,160,220,0.10)', traditions: ['sikh'] },
  { id: 'dhamma-stories', icon: 'book-open', title: 'Dhamma Stories', description: 'Buddha\'s parables & Jataka tales', tint: 'rgba(140,100,200,0.10)', traditions: ['buddhist'] },
  { id: 'jain-kathas', icon: 'book-open', title: 'Jain Kathas', description: 'Tirthankara stories & moral tales', tint: 'rgba(50,160,80,0.10)', traditions: ['jain'] },
  { id: 'stotrams-hymns', icon: 'music', title: 'Stotrams & Hymns', description: 'Sanskrit chants, chalisa, ashtakam', tint: 'rgba(197,160,89,0.10)', traditions: ['hindu', 'jain'] },
  { id: 'sacred-chants', icon: 'mic', title: 'Sacred Chants', description: 'Buddhist sutras, chants & mantras', tint: 'rgba(140,100,200,0.10)', traditions: ['buddhist'] },
  { id: 'panchatantra', icon: 'star', title: 'Panchatantra', description: 'Ancient animal fables & wisdom tales', tint: 'rgba(200,120,80,0.10)' },
  { id: 'heroes-bharat', icon: 'shield', title: 'Heroes of Bharat', description: 'Warriors, saints & unsung legends', tint: 'rgba(180,80,80,0.10)' },
  { id: 'mantras', icon: 'mic', title: 'Mantras', description: 'Chants & sacred recitations', tint: 'rgba(197,160,89,0.10)' },
  { id: 'sattvic-mode', icon: 'star', title: 'Sattvic Mode', description: 'Sacred ambience for puja & meditation', tint: 'rgba(200,180,120,0.10)' },
];

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

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {PRACTICE_CARDS.map((card) => (
              <PressableSurface
                key={card.id}
                haptic="none"
                onPress={() => handlePracticePress(card.href)}
                accessibilityLabel={`${card.label}, ${card.detail}`}
                style={{ width: '48%' }}
              >
                <Card tone="auto" style={{ gap: 12 }}>
                  <IconTile name={card.id} fallbackGlyph={card.fallbackGlyph} size="md" color={theme.brand} />
                  <View style={{ gap: 4 }}>
                    <Text style={{ ...TYPE.cardHeading, color: theme.text }}>{card.label}</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>
                      {card.detail}
                    </Text>
                  </View>
                </Card>
              </PressableSurface>
            ))}
          </View>
        </View>

        {/* Explore — coming soon on native */}
        <View style={{ gap: 12 }}>
          <SectionHeader label="Explore" />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {activeContentCards.map(card => (
              <PressableSurface
                key={card.id}
                haptic="none"
                onPress={() => handleContentCardPress(card)}
                accessibilityLabel={`${card.title}, coming soon`}
                style={{ width: '48%' }}
              >
                <Card tone="auto" style={{ gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: RADII.md, backgroundColor: card.tint, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={card.icon} size={20} color={theme.text} />
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: theme.text }}>{card.title}</Text>
                    <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>
                      {card.description}
                    </Text>
                  </View>
                </Card>
              </PressableSurface>
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
