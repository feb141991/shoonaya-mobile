import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, KATHA_VIEW_ACCENT, RADII, TRADITION_ACCENT, TYPE, themeColor } from '@/lib/constants';
import { spiritualDate } from '@/lib/spiritualDate';
import { supabase } from '@/lib/supabase';

// ── Bhakti Phase 4 — native equivalent of the PWA's
// src/app/(main)/bhakti/katha/[id]/KathaReaderClient.tsx, scoped down the
// same way Phase 3's stotram reader was: plain text in the profile's base
// language only (no Bhashini/Sarvam TTS pipeline, no ReaderShell chrome,
// no live Hindi/Punjabi language switcher — that switcher also carries a
// bespoke Devanagari→Gurmukhi transliterator in the PWA source that isn't
// worth porting for a first pass). "Done" still writes through the same
// canonical `complete_katha` RPC the PWA calls directly from the client,
// so completion state stays consistent across platforms.

type FullKatha = {
  id: string;
  tradition: string;
  occasion: string;
  deity?: string;
  title: string;
  preview: string;
  body: string[];
  phal: string;
  durationMin: number;
  tags: string[];
  portrait?: string;
  relatedJapaMantra?: string;
};

const TRADITION_COLOR: Record<string, string> = TRADITION_ACCENT;

const TRADITION_LABEL: Record<string, string> = {
  hindu: 'Katha', sikh: 'Sakhi', buddhist: 'Dhamma Story', jain: 'Katha',
};

// "Liked" accent — not sourced from a shared token since it's specific to
// this one reader-screen affordance, not repeated anywhere else. Named
// once here instead of repeating the raw hex 3x inline.
const LIKE_ACCENT = '#F47888';

const OCCASION_LABEL: Record<string, string> = {
  ekadashi: 'Ekadashi', purnima: 'Purnima', amavasya: 'Amavasya',
  pradosh: 'Pradosh', chaturthi: 'Chaturthi', shivaratri: 'Shivaratri',
  navratri: 'Navratri', diwali: 'Diwali', holi: 'Holi',
  janmashtami: 'Janmashtami', ramnavami: 'Ram Navami',
  'ganesh-chaturthi': 'Ganesh Chaturthi', 'karva-chauth': 'Karva Chauth',
  teej: 'Teej', gurpurab: 'Gurpurab', baisakhi: 'Baisakhi',
  vesak: 'Vesak', paryushana: 'Paryushana', general: 'General',
};

function bestView(k: FullKatha): string {
  if (k.tags.includes('panchatantra')) return 'panchatantra';
  if (k.tags.some((t) => ['warriors', 'saints', 'heroes', 'martyrdom', 'seva', 'sacrifice'].includes(t))) return 'heroes';
  if (k.tradition === 'sikh') return 'bani';
  if (k.tradition === 'buddhist') return 'dhamma';
  if (k.tradition === 'jain') return 'jain';
  return 'puranic';
}

export default function KathaReaderScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [katha, setKatha] = useState<FullKatha | null>(null);
  const [showPhal, setShowPhal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch(`/api/bhakti/katha/${id}`);
      if (!response.ok) { setLoadError(true); return; }
      const json = await response.json();
      setKatha(json?.katha ?? null);
      if (!json?.katha) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const markDone = useCallback(async () => {
    setMarking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const today = spiritualDate(tz);
        await supabase.rpc('complete_katha', { p_user_id: user.id, p_date: today });
      }
    } catch {
      // non-fatal bonus tracking
    } finally {
      setMarking(false);
      if (router.canGoBack()) router.back();
      else router.push('/bhakti/katha' as Href);
    }
  }, [router]);

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !katha) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton style={{ marginBottom: 4 }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 }}>
          <Text style={{ ...TYPE.body, color: theme.dim, textAlign: 'center' }}>Could not load this story.</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  const isPanchatantra = katha.tags.includes('panchatantra');
  const isHero = katha.tradition !== 'sikh' && katha.tags.some((t) => ['warriors', 'saints', 'heroes', 'martyrdom', 'seva', 'sacrifice'].includes(t)) && !isPanchatantra;
  const accent = isPanchatantra ? KATHA_VIEW_ACCENT.panchatantra : isHero ? KATHA_VIEW_ACCENT.heroes : (TRADITION_COLOR[katha.tradition] ?? COLORS.brandGold);
  const badge = isPanchatantra ? 'Wisdom Tale' : isHero ? 'Hero Legend' : (TRADITION_LABEL[katha.tradition] ?? 'Katha');

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140, gap: 18 }} showsVerticalScrollIndicator={false}>
        <BackButton style={{ marginBottom: 4 }} />

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...TYPE.micro, letterSpacing: 1.2, textTransform: 'uppercase', color: accent, borderWidth: 1, borderColor: `${accent}30`, backgroundColor: `${accent}10`, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
              {badge}
            </Text>
            <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>
              {katha.durationMin} min · {OCCASION_LABEL[katha.occasion] ?? katha.occasion}
            </Text>
          </View>
          <Text style={{ ...TYPE.hero, fontSize: 24, color: theme.text }}>{katha.title}</Text>
        </View>

        <View style={{ gap: 16 }}>
          {katha.body.map((para, idx) => (
            <Text key={idx} style={{ ...TYPE.body, color: theme.text, lineHeight: 26, opacity: 0.9 }}>
              {para}
            </Text>
          ))}
        </View>

        {/* Phal / blessing — collapsible, matches the PWA's "Fruit of the Katha" card */}
        <PressableSurface haptic="selection" onPress={() => setShowPhal((s) => !s)} style={{ borderRadius: RADII.lg }}>
          <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: `${accent}28`, backgroundColor: `${accent}0c`, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${accent}18`, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="star" size={16} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.chip, letterSpacing: 1, textTransform: 'uppercase', color: accent }}>Fruit of the Katha</Text>
              <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 2 }}>Tap to reveal the blessing</Text>
            </View>
            <Feather name={showPhal ? 'chevron-up' : 'chevron-down'} size={16} color={accent} />
          </View>
        </PressableSurface>

        {showPhal && (
          <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: `${accent}22`, backgroundColor: `${accent}08`, padding: 16 }}>
            <Text style={{ ...TYPE.cardHeading, fontSize: 15, color: accent, marginBottom: 8 }}>Phal Shruti</Text>
            <Text style={{ ...TYPE.body, color: theme.dim, lineHeight: 24 }}>{katha.phal}</Text>
          </View>
        )}

        {/* Continue practice */}
        <View style={{ gap: 10 }}>
          <Text style={{ ...TYPE.chip, letterSpacing: 1, textTransform: 'uppercase', color: theme.dim }}>Continue Practice</Text>

          {katha.relatedJapaMantra ? (
            <PressableSurface haptic="selection" onPress={() => router.push('/japa' as Href)} style={{ borderRadius: RADII.lg }}>
              <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${accent}12`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📿</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TYPE.body, color: theme.text, fontWeight: '600' }}>Start Japa</Text>
                  <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 1 }}>{katha.relatedJapaMantra}</Text>
                </View>
                <Feather name="external-link" size={13} color={accent} />
              </View>
            </PressableSurface>
          ) : null}

          <PressableSurface haptic="selection" onPress={() => router.push(`/bhakti/katha?view=${bestView(katha)}` as Href)} style={{ borderRadius: RADII.lg }}>
            <View style={{ borderRadius: RADII.lg, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>📚</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPE.body, color: theme.text, fontWeight: '600' }}>More Stories</Text>
                <Text style={{ ...TYPE.caption, color: theme.dim, marginTop: 1 }}>Explore the sacred library</Text>
              </View>
              <Feather name="external-link" size={13} color={accent} />
            </View>
          </PressableSurface>
        </View>

        {/* Like */}
        <View style={{ alignItems: 'center' }}>
          <PressableSurface haptic="selection" onPress={() => setLiked((l) => !l)} style={{ borderRadius: 999 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: liked ? `${LIKE_ACCENT}50` : theme.border,
                backgroundColor: liked ? `${LIKE_ACCENT}18` : theme.card,
              }}
            >
              <Feather name="heart" size={14} color={liked ? LIKE_ACCENT : theme.dim} />
              <Text style={{ ...TYPE.caption, color: liked ? LIKE_ACCENT : theme.dim, fontWeight: '600' }}>
                {liked ? 'Jai Shri Hari' : 'Appreciate this Katha'}
              </Text>
            </View>
          </PressableSurface>
        </View>
      </ScrollView>

      {/* Bottom bar — Done */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 28, paddingTop: 12, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
        <Button label={marking ? 'Marking…' : 'Done'} onPress={() => void markDone()} disabled={marking} />
      </View>
    </Screen>
  );
}
