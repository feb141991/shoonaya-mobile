import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getDevotionalTrackById } from '@/lib/devotional-audio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// Stotram detail/reader screen — Bhakti Phase 3. Scoped deliberately smaller
// than the PWA's src/app/(main)/bhakti/stotram/[id]/StotramClient.tsx,
// which is a full TTS-powered reading platform (on-demand Bhashini/Sarvam
// speech synthesis per verse, sequential "Play All" narration with
// auto-scroll, live English/Hindi/Punjabi translation switching, a font-size
// stepper, and a scripture-correction report modal). Per explicit scope
// decision: this screen covers the actual content — verses (Sanskrit/
// transliteration/meaning), expand per verse, and playback only for
// stotrams with a pre-recorded track in lib/devotional-audio.ts (played via
// expo-audio, no server round-trip). The TTS pipeline, translation
// switching, and correction modal are NOT ported — they're web-only
// infrastructure, not core content, and each is its own project-sized lift.
// Daily-sadhana "stotram done" completion tracking (PWA's
// `supabase.rpc('complete_stotram', ...)`) is also intentionally NOT wired
// here — out of this phase's agreed scope; would need its own native API
// route decision (see shloka.tsx's /api/native/shloka/read pattern) rather
// than a direct client RPC call.

type StotramVerse = {
  number: number;
  sanskrit: string;
  transliteration: string;
  meaning: string;
  meaning_hi?: string;
  meaning_pa?: string;
};

type Stotram = {
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
  audioTrackId?: string;
  verses: StotramVerse[];
};

// Ported from PWA's DEITY_META (src/lib/stotrams.ts) — just the accent
// colors, since that's all this screen needs; the fuller deity metadata
// (labels/emoji) lives server-side and isn't required for a detail view
// that already has the stotram's own title/deityEmoji.
const DEITY_COLOR: Record<string, string> = {
  ganesha: '#e07b3a',
  shiva: '#8b7de0',
  vishnu: '#3a8bcd',
  devi: '#c4789a',
  hanuman: '#d4643a',
  surya: '#f0a020',
  universal: '#8b9e6e',
};

export default function StotramDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stotram, setStotram] = useState<Stotram | null>(null);
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const audio = useAudioPlayer();

  const load = useCallback(async () => {
    if (!id) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const response = await apiFetch(`/api/bhakti/stotram/${id}`);
      if (!response.ok) {
        setLoadError(true);
        return;
      }
      const json = await response.json();
      setStotram(json?.stotram ?? null);
      if (!json?.stotram) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = stotram ? (DEITY_COLOR[stotram.deity] ?? DEITY_COLOR.universal) : theme.brand;
  const track = stotram?.audioTrackId ? getDevotionalTrackById(stotram.audioTrackId) : undefined;

  const togglePlayback = async () => {
    if (!track) return;
    if (playing) {
      await audio.pause();
      setPlaying(false);
    } else {
      await audio.loadAndPlay(track.audioUrl);
      setPlaying(true);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.brand} />
        </View>
      </Screen>
    );
  }

  if (loadError || !stotram) {
    return (
      <Screen style={{ backgroundColor: theme.bg }}>
        <BackButton />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 32 }}>🙏</Text>
          <Text style={{ ...TYPE.body, color: theme.dim }}>Could not load this stotram.</Text>
          <Button label="Retry" variant="secondary" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 16 }} showsVerticalScrollIndicator={false}>
        <BackButton style={{ marginBottom: 4 }} />

        {/* Info card */}
        <View
          style={{
            borderRadius: RADII.xl,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: `${accent}28`,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 34 }}>{stotram.deityEmoji || '🕉️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.title, color: theme.text }} numberOfLines={2}>
                {stotram.title}
              </Text>
              <Text style={{ ...TYPE.body, color: accent, marginTop: 2 }}>{stotram.titleDevanagari}</Text>
            </View>
          </View>
          <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 18 }}>{stotram.description}</Text>
          <View style={{ flexDirection: 'row', gap: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${accent}15` }}>
            <View>
              <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Language</Text>
              <Text style={{ ...TYPE.label, color: theme.text, marginTop: 2 }}>{stotram.language}</Text>
            </View>
            <View>
              <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Verses</Text>
              <Text style={{ ...TYPE.label, color: theme.text, marginTop: 2 }}>{stotram.verses.length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.micro, color: theme.dim, textTransform: 'uppercase', letterSpacing: 1 }}>Source</Text>
              <Text style={{ ...TYPE.label, color: theme.text, marginTop: 2 }} numberOfLines={2}>
                {stotram.source}
              </Text>
            </View>
          </View>
        </View>

        {/* Audio player — only for stotrams with a pre-recorded track */}
        {track ? (
          <View
            style={{
              borderRadius: RADII.lg,
              backgroundColor: `${accent}0f`,
              borderWidth: 1,
              borderColor: `${accent}22`,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <PressableSurface
              haptic="selection"
              accessibilityLabel={playing ? 'Pause audio' : 'Play audio'}
              onPress={() => void togglePlayback()}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={playing ? 'pause' : 'play'} size={17} color={isDark ? COLORS.darkBg : COLORS.ink} />
              </View>
            </PressableSurface>
            <View style={{ flex: 1 }}>
              <Text style={{ ...TYPE.label, color: accent }} numberOfLines={1}>{track.title}</Text>
              <Text style={{ ...TYPE.micro, color: theme.dim, marginTop: 1 }}>{track.creator} · {track.durationLabel}</Text>
            </View>
          </View>
        ) : null}

        {/* Verses */}
        <View style={{ gap: 10 }}>
          <Text style={{ ...TYPE.section, color: theme.dim }}>Verses</Text>

          {stotram.verses.map((verse, i) => {
            const isActive = activeVerse === i || stotram.verses.length === 1;
            return (
              <View
                key={verse.number}
                style={{
                  borderRadius: RADII.lg,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: isActive ? `${accent}40` : theme.border,
                  overflow: 'hidden',
                  boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
                }}
              >
                <PressableSurface
                  haptic="selection"
                  disabled={stotram.verses.length === 1}
                  accessibilityLabel={`Verse ${verse.number}${isActive ? ', expanded' : ''}`}
                  onPress={() => setActiveVerse(isActive ? null : i)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}
                >
                  <View
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      backgroundColor: isActive ? accent : `${accent}18`,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ ...TYPE.chip, color: isActive ? (isDark ? COLORS.darkBg : COLORS.ink) : accent }}>
                      {verse.number}
                    </Text>
                  </View>
                  <Text style={{ ...TYPE.body, color: theme.text, flex: 1 }} numberOfLines={1}>
                    {verse.sanskrit.split('\n')[0]}…
                  </Text>
                  {stotram.verses.length > 1 ? (
                    <Feather name={isActive ? 'chevron-up' : 'chevron-down'} size={16} color={theme.dim} />
                  ) : null}
                </PressableSurface>

                {isActive ? (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 16, paddingTop: 4, gap: 14, borderTopWidth: 1, borderTopColor: `${accent}15` }}>
                    <View>
                      <Text style={{ ...TYPE.micro, color: `${accent}bb`, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                        Shloka
                      </Text>
                      <Text
                        style={{
                          fontFamily: TYPE.shloka.fontFamily,
                          fontSize: TYPE.shloka.fontSize,
                          lineHeight: TYPE.shloka.lineHeight,
                          letterSpacing: TYPE.shloka.letterSpacing,
                          color: theme.text,
                        }}
                      >
                        {verse.sanskrit}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ ...TYPE.micro, color: `${accent}bb`, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                        Transliteration
                      </Text>
                      <Text style={{ ...TYPE.body, color: theme.dim, fontStyle: 'italic' }}>{verse.transliteration}</Text>
                    </View>
                    <View style={{ borderRadius: RADII.md, backgroundColor: `${accent}0c`, padding: 12 }}>
                      <Text style={{ ...TYPE.micro, color: `${accent}bb`, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                        Meaning
                      </Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: 19 }}>{verse.meaning}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={{ ...TYPE.micro, color: theme.dim, textAlign: 'center', marginTop: 4 }}>{stotram.source}</Text>
      </ScrollView>
    </Screen>
  );
}
