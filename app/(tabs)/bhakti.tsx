import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Screen } from '@/components/ui/Screen';
import { COLORS, FONTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

const TRADITION_HERO: Record<string, { greeting: string; sub: string }> = {
  hindu:    { greeting: 'Jai Sri Ram 🙏',           sub: 'Bhakti, Kathas & Sacred Practice' },
  sikh:     { greeting: 'Waheguru Ji Ka Khalsa ☬',  sub: 'Bani, Sakhis & Naam Simran'       },
  buddhist: { greeting: 'Namo Buddhaya ☸️',          sub: 'Dhamma Stories & Sacred Chants'   },
  jain:     { greeting: 'Jai Jinendra 🤲',           sub: 'Kathas, Stotrams & Simran'        },
};

type ContentCard = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  href: Href | null;
  tint: string;
  traditions?: string[];
};

const CONTENT_CARDS: ContentCard[] = [
  { id: 'puranic-tales', icon: 'file-text', title: 'Puranic Tales', description: 'Ramayana, Mahabharata & the Puranas', href: null, tint: 'rgba(200,160,60,0.10)', traditions: ['hindu'] },
  { id: 'bani-sakhis', icon: 'book-open', title: 'Bani & Sakhis', description: 'Guru stories, sakhis & kirtan wisdom', href: null, tint: 'rgba(100,160,220,0.10)', traditions: ['sikh'] },
  { id: 'dhamma-stories', icon: 'book-open', title: 'Dhamma Stories', description: 'Buddha\'s parables & Jataka tales', href: null, tint: 'rgba(140,100,200,0.10)', traditions: ['buddhist'] },
  { id: 'jain-kathas', icon: 'book-open', title: 'Jain Kathas', description: 'Tirthankara stories & moral tales', href: null, tint: 'rgba(50,160,80,0.10)', traditions: ['jain'] },
  { id: 'stotrams-hymns', icon: 'music', title: 'Stotrams & Hymns', description: 'Sanskrit chants, chalisa, ashtakam', href: null, tint: 'rgba(197,160,89,0.10)', traditions: ['hindu', 'jain'] },
  { id: 'sacred-chants', icon: 'mic', title: 'Sacred Chants', description: 'Buddhist sutras, chants & mantras', href: null, tint: 'rgba(140,100,200,0.10)', traditions: ['buddhist'] },
  { id: 'panchatantra', icon: 'star', title: 'Panchatantra', description: 'Ancient animal fables & wisdom tales', href: null, tint: 'rgba(200,120,80,0.10)' },
  { id: 'heroes-bharat', icon: 'shield', title: 'Heroes of Bharat', description: 'Warriors, saints & unsung legends', href: null, tint: 'rgba(180,80,80,0.10)' },
  { id: 'japa-mala', icon: 'heart', title: 'Japa Mala', description: 'Digital mala for mantra & Naam Simran', href: '/japa', tint: 'rgba(160,120,200,0.10)' },
  { id: 'nitya-karma', icon: 'sunrise', title: 'Nitya Karma', description: 'Your daily sacred rituals', href: '/nitya-karma', tint: 'rgba(230,140,50,0.10)' },
  { id: 'dharm-veer', icon: 'shield', title: 'Dharm Veer', description: 'Stories of dharmic courage', href: '/dharm-veer', tint: 'rgba(180,80,80,0.10)' },
  { id: 'mantras', icon: 'mic', title: 'Mantras', description: 'Chants & sacred recitations', href: null, tint: 'rgba(197,160,89,0.10)' },
  { id: 'sattvic-mode', icon: 'star', title: 'Sattvic Mode', description: 'Sacred ambience for puja & meditation', href: null, tint: 'rgba(200,180,120,0.10)' },
];

export default function BhaktiScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  const background = isDark ? COLORS.darkBg : COLORS.creamBg;
  const cardBg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

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
  const activeCards = CONTENT_CARDS.filter(c => !c.traditions || c.traditions.includes(tradition));

  const handleCardPress = (card: ContentCard) => {
    try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (card.href) {
      router.push(card.href);
    } else {
      setSelectedCardTitle(card.title);
      setComingSoonVisible(true);
    }
  };

  return (
    <Screen style={{ backgroundColor: background, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 24 }}>
        
        {/* Hero */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: FONTS.serifBold, fontSize: 32, color: text }}>{hero.greeting}</Text>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: dim }}>{hero.sub}</Text>
          
          {/* Stats Pills */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
              <Feather name="zap" size={14} color={brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>{japaStreak} Day Streak</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
              <Feather name="heart" size={14} color={brand} />
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: text }}>{sessionCountToday} Sessions Today</Text>
            </View>
          </View>
        </View>

        {/* Explore Grid */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: dim }}>
            Explore
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {activeCards.map(card => (
              <Pressable
                key={card.id}
                onPress={() => handleCardPress(card)}
                style={{
                  width: '48%',
                  backgroundColor: cardBg,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: border,
                  gap: 12,
                }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: card.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={card.icon} size={20} color={text} />
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>{card.title}</Text>
                  <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, lineHeight: 16 }} numberOfLines={2}>
                    {card.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Coming Soon Modal */}
      <Modal visible={comingSoonVisible} transparent animationType="slide" onRequestClose={() => setComingSoonVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setComingSoonVisible(false)} />
          <View style={{ backgroundColor: background, padding: 24, paddingBottom: 48, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 16 }}>
            <View style={{ width: 40, height: 4, backgroundColor: border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 }} />
            <Text style={{ fontFamily: FONTS.serifBold, fontSize: 24, color: text }}>{selectedCardTitle}</Text>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 15, color: dim, lineHeight: 22 }}>
              This feature is currently available in the web version of Shoonaya. We are bringing it to the native app very soon!
            </Text>
            <Pressable
              onPress={() => setComingSoonVisible(false)}
              style={{
                backgroundColor: brand,
                padding: 16,
                borderRadius: 99,
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 16, color: COLORS.ink }}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}
