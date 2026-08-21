import { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getDevotionalTrackById } from '@/lib/devotional-audio';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { supabase } from '@/lib/supabase';

// New Reader Foundation imports
import { ReaderShell } from '@/components/reader/ReaderShell';
import { useReaderControls } from '@/hooks/useReaderControls';
import { buildReadableCapabilities } from '@/lib/readable-content';
import { resolveReadablePreferences } from '@/lib/readable-preferences';

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

const DEITY_COLOR: Record<string, string> = {
  ganesha: '#e07b3a',
  shiva: '#8b7de0',
  vishnu: '#3a8bcd',
  devi: COLORS.deityRose,
  hanuman: '#d4643a',
  surya: '#f0a020',
  universal: '#8b9e6e',
};

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
const FONT_PRESETS = [
  { label: 'A-', value: 'sm' },
  { label: 'A', value: 'md' },
  { label: 'A+', value: 'lg' },
  { label: 'A++', value: 'xl' },
];

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
  const [lang, setLang] = useState<'en' | 'hi' | 'pa'>('en');
  const [fontStep, setFontStep] = useState(1); // 'md'
  const [ttsRate, setTtsRate] = useState(1);

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
      const loadedStotram = (json?.stotram ?? null) as Stotram | null;
      setStotram(loadedStotram);
      if (!loadedStotram) {
        setLoadError(true);
        return;
      }
      const hasHindi = loadedStotram.verses.some((verse) => Boolean(verse.meaning_hi));
      const hasPunjabi = loadedStotram.verses.some((verse) => Boolean(verse.meaning_pa));
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (hasHindi || hasPunjabi)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('app_language, meaning_language')
          .eq('id', user.id)
          .maybeSingle();
        const preferences = resolveReadablePreferences({
          appLanguage: profile?.app_language,
          meaningLanguage: profile?.meaning_language,
        });
        if (preferences.effectiveMeaningLanguage === 'hi' && hasHindi) setLang('hi');
        if (preferences.effectiveMeaningLanguage === 'pa' && hasPunjabi) setLang('pa');
      }
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
      await audio.loadAndPlay(track.audioUrl, false, () => setPlaying(false));
      setPlaying(true);
    }
  };

  const textToCopy = stotram ? `${stotram.title}\n\n${stotram.verses.map(v => v.sanskrit + '\n' + v.meaning).join('\n\n')}` : '';
  const textToShare = stotram ? `Read the ${stotram.title} on the Shoonaya App! 🙏` : '';

  const hasHindi = Boolean(stotram?.verses.some((verse) => verse.meaning_hi));
  const hasPunjabi = Boolean(stotram?.verses.some((verse) => verse.meaning_pa));
  const capabilities = useMemo(() => buildReadableCapabilities({
    original: stotram?.verses[0]?.sanskrit ?? '',
    transliteration: stotram?.verses[0]?.transliteration,
    meaning: stotram?.verses[0]?.meaning,
    language: 'sa',
    script: 'devanagari',
    pipelineTags: {
      content_type: 'stotram',
      audio_mode: track ? 'prerecorded' : 'recitation',
      tradition: stotram?.tradition as 'hindu' | 'buddhist' | 'jain' | 'sikh' | undefined,
      script: 'devanagari',
      delivery_intent: 'recitation',
    },
  }, {
    canToggleLocalLanguage: hasHindi || hasPunjabi,
    canGenerateTTS: !track,
    canShowExplain: false,
  }), [hasHindi, hasPunjabi, stotram, track]);

  const { state, handlers } = useReaderControls(capabilities);

  const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;
  const activeVerseIndex = activeVerse ?? 0;
  const verseForAudio = stotram?.verses[activeVerseIndex];
  const meaningForLanguage = (verse: StotramVerse) => (
    lang === 'hi' && verse.meaning_hi
      ? verse.meaning_hi
      : lang === 'pa' && verse.meaning_pa
        ? verse.meaning_pa
        : verse.meaning
  );

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
    <ReaderShell
      title={stotram.title}
      subtitle={stotram.deityEmoji ? `${stotram.deityEmoji} ${stotram.type}` : stotram.type}
      fallbackBackUrl="/bhakti/browse"
      themeColor={accent}
      ambientGlowColor={accent}
      fontPresets={FONT_PRESETS}
      fontStep={fontStep}
      setFontStep={setFontStep}
      languages={[
        { code: 'en' as const, label: 'EN' },
        ...(hasHindi ? [{ code: 'hi' as const, label: 'हिं' }] : []),
        ...(hasPunjabi ? [{ code: 'pa' as const, label: 'ਪੰ' }] : []),
      ]}
      currentLanguage={lang}
      setLanguage={setLang}
      showTransliterationToggle
      isTransliterationOn={state.showTransliteration}
      onToggleTransliteration={handlers.toggleTransliteration}
      showMeaningToggle
      isMeaningOn={state.showMeaning}
      onToggleMeaning={handlers.toggleMeaning}
      onTTS={() => {
        if (track) {
          void togglePlayback();
          return;
        }
        if (!verseForAudio) return;
        void handlers.toggleTTS(
          [verseForAudio.sanskrit, verseForAudio.transliteration, meaningForLanguage(verseForAudio)].join('\n\n'),
          {
            quality: 'pandit',
            language: lang === 'hi' ? 'hi-IN' : lang === 'pa' ? 'pa-IN' : 'sa-IN',
            rate: ttsRate,
            pipelineTags: {
              content_type: 'stotram',
              audio_mode: 'recitation',
              script: 'devanagari',
              delivery_intent: 'recitation',
            },
          },
        );
      }}
      ttsRate={track ? undefined : ttsRate}
      onTTSRateChange={track ? undefined : setTtsRate}
      isSpeaking={track ? playing : state.isSpeaking}
      isTTSGenerating={state.isGeneratingTTS}
      onCopy={() => handlers.copyText(textToCopy, 'Stotram')}
      isCopied={state.isCopied}
      onShare={() => handlers.share(textToShare)}
    >
      <View style={{ gap: 16, marginBottom: 8 }}>
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
                  <Text style={{ ...TYPE.body, color: theme.text, flex: 1, fontSize: TYPE.body.fontSize * fsScale }} numberOfLines={1}>
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
                          fontSize: TYPE.shloka.fontSize * fsScale,
                          lineHeight: TYPE.shloka.lineHeight * fsScale,
                          letterSpacing: TYPE.shloka.letterSpacing,
                          color: theme.text,
                        }}
                      >
                        {verse.sanskrit}
                      </Text>
                    </View>
                    {state.showTransliteration ? <View>
                      <Text style={{ ...TYPE.micro, color: `${accent}bb`, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                        Transliteration
                      </Text>
                      <Text style={{ ...TYPE.body, color: theme.dim, fontStyle: 'italic', fontSize: TYPE.body.fontSize * fsScale }}>{verse.transliteration}</Text>
                    </View> : null}
                    {state.showMeaning ? <View style={{ borderRadius: RADII.md, backgroundColor: `${accent}0c`, padding: 12 }}>
                      <Text style={{ ...TYPE.micro, color: `${accent}bb`, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                        Meaning
                      </Text>
                      <Text style={{ ...TYPE.caption, color: theme.dim, lineHeight: TYPE.caption.lineHeight * fsScale, fontSize: TYPE.caption.fontSize * fsScale }}>{meaningForLanguage(verse)}</Text>
                    </View> : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={{ ...TYPE.micro, color: theme.dim, textAlign: 'center', marginTop: 4 }}>{stotram.source}</Text>
      </View>
    </ReaderShell>
  );
}
