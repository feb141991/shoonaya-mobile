import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, type Href, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import type { SacredIconName } from '@/components/ui/SacredIcon';
import { IconTile } from '@/components/ui/IconTile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { apiFetch } from '@/lib/api';
import { COLORS, RADII, TYPE, themeColor } from '@/lib/constants';
import { navScrollHandler } from '@/lib/navScrollBus';
import { supabase } from '@/lib/supabase';
import { getTraditionAccent } from '@/lib/traditions';

// ── Bhakti Phase 1 of a multi-phase PWA-parity rebuild (see task list:
// "Bhakti full PWA parity" #330-338). This screen now mirrors the PWA's
// src/app/(main)/bhakti/BhaktiClient.tsx structure: a tradition-tinted hero
// gradient, a "Today's Stotram" teaser, and a single unified content grid —
// replacing the old split "Your Practice"/"Explore" sections. Content-
// library destinations (katha reader, browse, zen, insights, stotram
// detail, mantras) don't exist natively yet; those land in Phases 2-8 as
// their own data-porting + screen-build passes. Until each phase lands,
// its card's `href` is null and tapping opens the coming-soon sheet.

const TRADITION_HERO: Record<string, { greeting: string; sub: string }> = {
  hindu:    { greeting: 'Jai Sri Ram 🙏',           sub: 'Bhakti, Kathas & Sacred Practice' },
  sikh:     { greeting: 'Waheguru Ji Ka Khalsa ☬',  sub: 'Bani, Sakhis & Naam Simran'       },
  buddhist: { greeting: 'Namo Buddhaya ☸️',          sub: 'Dhamma Stories & Sacred Chants'   },
  jain:     { greeting: 'Jai Jinendra 🤲',           sub: 'Kathas, Stotrams & Simran'        },
};

// Two icon treatments in one unified grid:
//  - 'tile': real, already-built native destinations get the premium
//    SacredIcon-driven IconTile well (brand gold) — same treatment the old
//    "Your Practice" cards used.
//  - 'feather': PWA content-library cards get a Feather glyph in a
//    per-card accent-tinted well, matching PWA's per-card `tint` — ported
//    to a solid hex + iconWellColor-style alpha suffix (`${accent}15`
///   fill, `${accent}28` border) since RN doesn't compose low-opacity CSS
//    rgba() tints the same way as PWA's raw `background: rgba(...)`.
type TileCard = {
  kind: 'tile';
  id: SacredIconName;
  fallbackGlyph: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  href: Href;
  traditions?: string[];
};

type FeatherCard = {
  kind: 'feather';
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  accent: string;
  // null = destination screen not yet built natively; opens the coming-
  // soon sheet until its own phase (Bhakti Phase 3-8) lands.
  href: Href | null;
  traditions?: string[];
};

type BhaktiCard = TileCard | FeatherCard;

// Order mirrors PWA's CONTENT_CARDS exactly (tradition-specific kathas →
// hymns/chants → universal katha content → Japa Mala → Mantras → Sattvic
// Mode), with Dharm Veer and Vrat appended at the end — native-only
// additions not present in PWA's Bhakti grid, kept per explicit product
// instruction rather than dropped for strict parity.
const CONTENT_CARDS: BhaktiCard[] = [
  { kind: 'feather', id: 'puranic-tales', icon: 'file-text', title: 'Puranic Tales', description: 'Ramayana, Mahabharata & the Puranas', accent: '#C8A03C', href: '/bhakti/katha?view=puranic' as Href, traditions: ['hindu'] },
  { kind: 'feather', id: 'bani-sakhis', icon: 'book-open', title: 'Bani & Sakhis', description: 'Guru stories, sakhis & kirtan wisdom', accent: '#64A0DC', href: '/bhakti/katha?view=bani' as Href, traditions: ['sikh'] },
  { kind: 'feather', id: 'dhamma-stories', icon: 'book-open', title: 'Dhamma Stories', description: "Buddha's parables & Jataka tales", accent: '#8C64C8', href: '/bhakti/katha?view=dhamma' as Href, traditions: ['buddhist'] },
  { kind: 'feather', id: 'jain-kathas', icon: 'book-open', title: 'Jain Kathas', description: 'Tirthankara stories & moral tales', accent: '#32A050', href: '/bhakti/katha?view=jain' as Href, traditions: ['jain'] },
  { kind: 'feather', id: 'stotrams-hymns', icon: 'music', title: 'Stotrams & Hymns', description: 'Sanskrit chants, chalisa, ashtakam', accent: '#C5A059', href: null, traditions: ['hindu', 'jain'] },
  { kind: 'feather', id: 'sacred-chants', icon: 'mic', title: 'Sacred Chants', description: 'Buddhist sutras, chants & mantras', accent: '#8C64C8', href: null, traditions: ['buddhist'] },
  { kind: 'feather', id: 'panchatantra', icon: 'star', title: 'Panchatantra', description: 'Ancient animal fables & wisdom tales', accent: '#C87850', href: '/bhakti/katha?view=panchatantra' as Href },
  { kind: 'feather', id: 'heroes-bharat', icon: 'shield', title: 'Heroes of Bharat', description: 'Warriors, saints & unsung legends', accent: '#B45050', href: '/bhakti/katha?view=heroes' as Href },
  { kind: 'tile', id: 'japa', fallbackGlyph: 'heart', title: 'Japa Mala', description: 'Digital mala for mantra & Naam Simran', href: '/japa' },
  { kind: 'feather', id: 'mantras', icon: 'mic', title: 'Mantras', description: 'Chants & sacred recitations', accent: '#C5A059', href: null },
  { kind: 'feather', id: 'sattvic-mode', icon: 'star', title: 'Sattvic Mode', description: 'Sacred ambience for puja & meditation', accent: '#C8B478', href: null },
  { kind: 'tile', id: 'dharmveer', fallbackGlyph: 'shield', title: 'Dharm Veer', description: 'Stories of dharmic courage', href: '/dharm-veer' },
  { kind: 'tile', id: 'vrat', fallbackGlyph: 'moon', title: 'Vrat', description: 'Observances & fasting days', href: '/vrat' },
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

// Accent-tinted pill matching PWA's stat chips (`background: accent+'18'`,
// text in accent). Only rendered when its count is > 0, same as PWA.
function StatPill({ icon, label, accent }: { icon: keyof typeof Feather.glyphMap; label: string; accent: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: `${accent}18`,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Feather name={icon} size={12} color={accent} />
      <Text style={{ ...TYPE.chip, color: accent }}>{label}</Text>
    </View>
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
  const [dailyStotram, setDailyStotram] = useState<{ id: string; title: string; deityEmoji?: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadData() {
        let userTradition = 'hindu';
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const today = new Date().toISOString().slice(0, 10);
            const [{ data: profile }, { data: sadhana }, { count }] = await Promise.all([
              supabase.from('profiles').select('tradition').eq('id', user.id).single(),
              supabase.from('daily_sadhana').select('streak_count').eq('user_id', user.id).eq('date', today).single(),
              supabase.from('mala_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', `${today}T00:00:00`),
            ]);
            userTradition = profile?.tradition ?? 'hindu';
            if (active) {
              setTradition(userTradition);
              setJapaStreak(sadhana?.streak_count ?? 0);
              setSessionCountToday(count ?? 0);
            }
          }
        } catch (e) {
          // ignore — daily stotram fetch below still runs with the default tradition
        }

        // Today's Stotram — day-of-year rotating pick, matches PWA's
        // bhakti/page.tsx server-side rotation. Fetched regardless of auth
        // state (guests see it too), same as the web page.
        try {
          const response = await apiFetch(`/api/bhakti/stotram/daily?tradition=${userTradition}`);
          if (response.ok) {
            const json = await response.json();
            if (active && json?.id) {
              setDailyStotram({ id: json.id, title: json.title, deityEmoji: json.deityEmoji });
            }
          }
        } catch {
          // ignore — teaser card falls back to the coming-soon sheet
        }
      }
      void loadData();
      return () => { active = false; };
    }, [])
  );

  const hero = TRADITION_HERO[tradition] ?? TRADITION_HERO.hindu;
  const accent = getTraditionAccent(tradition);
  const activeCards = CONTENT_CARDS.filter(c => !c.traditions || c.traditions.includes(tradition));

  const openComingSoon = (title: string) => {
    try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setSelectedCardTitle(title);
    setComingSoonVisible(true);
  };

  const handleCardPress = (card: BhaktiCard) => {
    try { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    if (card.href) {
      router.push(card.href);
    } else {
      setSelectedCardTitle(card.title);
      setComingSoonVisible(true);
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingVertical: 0 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, gap: 28 }}
        onScroll={navScrollHandler}
        scrollEventThrottle={16}
      >

        {/* Hero — tradition-tinted gradient strip, mirrors PWA's
            linear-gradient(160deg, accent1a 0%, accent08 55%, transparent) */}
        <LinearGradient
          colors={[`${accent}1a`, `${accent}08`, `${accent}00`]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <PressableSurface
              haptic="selection"
              onPress={() => openComingSoon('Bhakti Insights')}
              accessibilityLabel="Bhakti insights"
              style={{ borderRadius: 999 }}
            >
              <View style={{ borderRadius: 999, backgroundColor: `${accent}18`, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ ...TYPE.chip, color: accent }}>Insights</Text>
              </View>
            </PressableSurface>
          </View>

          <Text style={{ ...TYPE.chip, letterSpacing: 1.6, textTransform: 'uppercase', color: accent, marginTop: 12 }}>
            {hero.sub}
          </Text>
          <Text style={{ ...TYPE.hero, color: theme.text, marginTop: 2 }}>Bhakti</Text>
          <Text style={{ ...TYPE.body, color: theme.dim, marginTop: 4 }}>{hero.greeting}</Text>

          {(japaStreak > 0 || sessionCountToday > 0) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {japaStreak > 0 ? <StatPill icon="zap" label={`${japaStreak}-day streak`} accent={accent} /> : null}
              {sessionCountToday > 0 ? <StatPill icon="heart" label={`${sessionCountToday} today`} accent={accent} /> : null}
            </View>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, gap: 28 }}>

          {/* Today's Stotram teaser — day-of-year rotating pick fetched
              from GET /api/bhakti/stotram/daily (Phase 2), navigates into
              the Phase 3 detail screen. Falls back to the coming-soon
              sheet only if the fetch hasn't resolved yet. */}
          <PressableSurface
            haptic="selection"
            onPress={() =>
              dailyStotram
                ? router.push(`/bhakti/stotram/${dailyStotram.id}` as Href)
                : openComingSoon("Today's Stotram")
            }
            accessibilityLabel="Today's stotram"
            style={{ borderRadius: 18 }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 16,
                borderRadius: 18,
                backgroundColor: `${accent}0d`,
                borderWidth: 1,
                borderColor: `${accent}28`,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: RADII.md, backgroundColor: `${accent}22`, alignItems: 'center', justifyContent: 'center' }}>
                {dailyStotram?.deityEmoji ? (
                  <Text style={{ fontSize: 18 }}>{dailyStotram.deityEmoji}</Text>
                ) : (
                  <Feather name="music" size={18} color={accent} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.chip, letterSpacing: 1.2, textTransform: 'uppercase', color: accent }}>
                  Today&apos;s Vani
                </Text>
                <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: theme.text, marginTop: 2 }} numberOfLines={1}>
                  {dailyStotram?.title ?? 'Daily Stotram'}
                </Text>
              </View>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="play" size={14} color={isDark ? COLORS.darkBg : COLORS.ink} />
              </View>
            </View>
          </PressableSurface>

          {/* Explore — single unified grid, matches PWA's one-grid
              structure (drops the old split Your Practice/Explore
              sections). */}
          <View style={{ gap: 12 }}>
            <SectionHeader label="Explore" />

            <View style={{ gap: 12 }}>
              {chunkPairs(activeCards).map((row, rowIndex) => (
                <View key={row[0]?.id ?? rowIndex} style={{ flexDirection: 'row', gap: 12 }}>
                  {row.map((card) => (
                    <PressableSurface
                      key={card.id}
                      haptic="selection"
                      onPress={() => handleCardPress(card)}
                      accessibilityLabel={card.href ? `${card.title}, ${card.description}` : `${card.title}, coming soon`}
                      style={{ flex: 1 }}
                    >
                      <Card tone="auto" style={{ gap: 12, borderColor: theme.premiumBorder }}>
                        {card.kind === 'tile' ? (
                          <IconTile name={card.id} fallbackGlyph={card.fallbackGlyph} size="md" color={theme.brand} />
                        ) : (
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
                        )}
                        <View style={{ gap: 4 }}>
                          <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: theme.text }}>{card.title}</Text>
                          <Text style={{ ...TYPE.caption, color: theme.dim }} numberOfLines={2}>
                            {card.description}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: -2 }}>
                          <Text
                            style={{
                              ...TYPE.chip,
                              letterSpacing: 1.2,
                              textTransform: 'uppercase',
                              color: card.kind === 'tile' ? theme.brand : card.accent,
                            }}
                          >
                            Open
                          </Text>
                          <Feather name="chevron-right" size={11} color={card.kind === 'tile' ? theme.brand : card.accent} />
                        </View>
                      </Card>
                    </PressableSurface>
                  ))}
                  {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
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
