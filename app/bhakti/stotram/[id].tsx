import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Alert, AppState, findNodeHandle, ScrollView, Text, useColorScheme, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { PressableSurface } from '@/components/ui/PressableSurface';
import { SacredLoader } from '@/components/ui/SacredLoader';
import { Screen } from '@/components/ui/Screen';
import { apiFetch } from '@/lib/api';
import { COLORS, FONTS, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { getDevotionalTrackById } from '@/lib/devotional-audio';
import { readBhaktiContentCache, writeBhaktiContentCache, bhaktiCacheKeys } from '@/lib/bhaktiContentCache';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { supabase } from '@/lib/supabase';

// New Reader Foundation imports
import { ReaderShell } from '@/components/reader/ReaderShell';
import { useReaderControls } from '@/hooks/useReaderControls';
import { buildReadableCapabilities } from '@/lib/readable-content';
import { resolveReadablePreferences } from '@/lib/readable-preferences';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { DevotionalListeningControls } from '@/components/reader/DevotionalListeningControls';
import {
  getDevotionalSleepTimerDeadline,
  getNextDevotionalRecitationPosition,
  isDevotionalSleepTimerExpired,
  type DevotionalRepeatScope,
  type DevotionalRepeatTarget,
  type DevotionalSleepTimerSelection,
} from '@/lib/devotionalListening';

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

function isStotram(value: unknown): value is Stotram {
  return !!value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string';
}

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
  const [listeningKind, setListeningKind] = useState<'track' | 'recitation' | null>(null);
  const [repeatScope, setRepeatScope] = useState<DevotionalRepeatScope>('stotram');
  const [repeatTarget, setRepeatTarget] = useState<DevotionalRepeatTarget>(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [sleepSelection, setSleepSelection] = useState<DevotionalSleepTimerSelection>('end');
  // `language` (global) seeds this page's initial reading language, but the
  // in-page toggle below must stay page-local: it's a "read this one page in
  // a different language" preview, not an account-wide setting, and must not
  // overwrite the user's global app_language/Supabase profile.
  const { language } = useLanguage();
  const [readerLanguageOverride, setReaderLanguageOverride] = useState<typeof language | null>(null);
  const readerLanguage = readerLanguageOverride ?? language;
  const [fontStep, setFontStep] = useState(1); // 'md'
  const [ttsRate, setTtsRate] = useState<0.75 | 1 | 1.25>(0.75);

  const scrollViewRef = useRef<ScrollView>(null);
  const verseCardRefs = useRef<Array<View | null>>([]);
  const sleepDeadlineRef = useRef<number | null>(null);
  const sleepSelectionRef = useRef<DevotionalSleepTimerSelection>('end');
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recitationRef = useRef({ active: false, scope: 'stotram' as DevotionalRepeatScope, target: 1 as DevotionalRepeatTarget, completedCycles: 0, verseIndex: 0 });
  const trackSessionRef = useRef({ active: false, target: 1 as DevotionalRepeatTarget, completedCycles: 0 });
  const playVerseRef = useRef<(index: number) => void>(() => {});
  const playTrackRef = useRef<() => Promise<void>>(async () => {});
  const stopListeningRef = useRef<() => Promise<void>>(async () => {});

  const audio = useAudioPlayer();

  const load = useCallback(async () => {
    if (!id) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);

    // Cache-first paint (reliability plan item 6): a stotram's content is
    // the same for every visitor, so a cache hit shows it instantly and
    // clears `loading` immediately, reserving SacredLoader for a genuine
    // first-ever load with nothing cached yet. A failed background
    // reconcile below must not blow away content already painted from
    // the cache.
    const cacheKey = bhaktiCacheKeys.stotramDetail(id);
    const cached = await readBhaktiContentCache(cacheKey, isStotram);
    const hadCache = Boolean(cached);
    if (cached) {
      setStotram(cached);
      setLoading(false);
    }

    try {
      const response = await apiFetch(`/api/bhakti/stotram/${id}`);
      if (!response.ok) {
        if (!hadCache) setLoadError(true);
        return;
      }
      const json = await response.json();
      const loadedStotram = (json?.stotram ?? null) as Stotram | null;
      if (!loadedStotram) {
        if (!hadCache) setLoadError(true);
        return;
      }
      setStotram(loadedStotram);
      void writeBhaktiContentCache(cacheKey, loadedStotram);
    } catch {
      if (!hadCache) setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = stotram ? (DEITY_COLOR[stotram.deity] ?? DEITY_COLOR.universal) : theme.brand;
  const track = stotram?.audioTrackId ? getDevotionalTrackById(stotram.audioTrackId) : undefined;

  const textToCopy = stotram ? `${stotram.title}\n\n${stotram.verses.map(v => v.sanskrit + '\n' + v.meaning).join('\n\n')}` : '';
  const textToShare = stotram ? `Read the ${stotram.title} on the Shoonaya App! 🙏` : '';

  const hasHindi = Boolean(stotram?.verses.length && stotram.verses.every((verse) => Boolean(verse.meaning_hi)));
  const hasPunjabi = Boolean(stotram?.verses.length && stotram.verses.every((verse) => Boolean(verse.meaning_pa)));
  const activeLang: 'en' | 'hi' | 'pa' =
    readerLanguage === 'hi' && hasHindi
      ? 'hi'
      : readerLanguage === 'pa' && hasPunjabi
        ? 'pa'
        : 'en';
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
  const meaningForLanguage = useCallback((verse: StotramVerse) => (
    activeLang === 'hi' && verse.meaning_hi
      ? verse.meaning_hi
      : activeLang === 'pa' && verse.meaning_pa
        ? verse.meaning_pa
        : verse.meaning
  ), [activeLang]);

  const updateSleepSelection = useCallback((selection: DevotionalSleepTimerSelection) => {
    sleepSelectionRef.current = selection;
    setSleepSelection(selection);
    sleepDeadlineRef.current = getDevotionalSleepTimerDeadline(selection, Date.now());
  }, []);

  const stopListening = useCallback(async () => {
    recitationRef.current.active = false;
    trackSessionRef.current.active = false;
    sleepDeadlineRef.current = null;
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
    setListeningKind(null);
    setPlaying(false);
    setCompletedCycles(0);
    await Promise.all([handlers.stopTTS(), audio.stop()]);
  }, [audio.stop, handlers.stopTTS]);
  stopListeningRef.current = stopListening;

  const finishRecitationCycle = useCallback(() => {
    const session = recitationRef.current;
    if (!session.active) return;
    if (isDevotionalSleepTimerExpired(sleepDeadlineRef.current, Date.now())) {
      void stopListeningRef.current();
      return;
    }
    const next = getNextDevotionalRecitationPosition({
      scope: session.scope,
      verseIndex: session.verseIndex,
      verseCount: stotram?.verses.length ?? 0,
      completedCycles: session.completedCycles,
      targetCycles: session.target,
    });
    session.completedCycles = next.completedCycles;
    setCompletedCycles(next.completedCycles);
    if (next.done) {
      session.active = false;
      setListeningKind(null);
      return;
    }
    session.verseIndex = next.verseIndex;
    setTimeout(() => playVerseRef.current(next.verseIndex), 0);
  }, [stotram?.verses.length]);

  const playVerse = useCallback((verseIndex: number) => {
    const session = recitationRef.current;
    const verse = stotram?.verses[verseIndex];
    if (!session.active || !verse) return;
    session.verseIndex = verseIndex;
    setActiveVerse(verseIndex);
    requestAnimationFrame(() => {
      const card = verseCardRefs.current[verseIndex];
      const scrollView = scrollViewRef.current;
      if (!card || !scrollView) return;
      const scrollHandle = findNodeHandle(scrollView);
      if (scrollHandle === null) return;
      card.measureLayout(scrollHandle, (_x, y) => {
        scrollView.scrollTo({ y: Math.max(0, y - 108), animated: true });
      }, () => {});
    });
    const audioText = [verse.sanskrit, verse.transliteration, meaningForLanguage(verse)].join('\n\n');
    void handlers.playTTS(audioText, {
      quality: 'pandit',
      language: activeLang === 'hi' ? 'hi-IN' : activeLang === 'pa' ? 'pa-IN' : 'sa-IN',
      rate: ttsRate,
      backgroundPlayback: true,
      lockScreenMetadata: {
        title: `${stotram?.title ?? 'Stotram'} · Verse ${verse.number}`,
        artist: 'Shoonaya',
        albumTitle: 'Devotional recitation',
      },
      pipelineTags: {
        content_type: 'stotram',
        audio_mode: 'recitation',
        script: 'devanagari',
        delivery_intent: 'recitation',
      },
      onComplete: finishRecitationCycle,
    });
  }, [stotram, activeLang, ttsRate, handlers.playTTS, finishRecitationCycle, meaningForLanguage]);
  playVerseRef.current = playVerse;

  const startRecitation = useCallback(async (verseIndex?: number) => {
    const count = stotram?.verses.length ?? 0;
    if (count === 0) return;
    const startAt = repeatScope === 'verse' ? Math.max(0, Math.min(verseIndex ?? activeVerse ?? 0, count - 1)) : 0;
    trackSessionRef.current.active = false;
    recitationRef.current = { active: true, scope: repeatScope, target: repeatTarget, completedCycles: 0, verseIndex: startAt };
    setCompletedCycles(0);
    setListeningKind('recitation');
    sleepDeadlineRef.current = getDevotionalSleepTimerDeadline(sleepSelectionRef.current, Date.now());
    await audio.stop();
    if (!recitationRef.current.active) return;
    playVerseRef.current(startAt);
  }, [stotram?.verses.length, repeatScope, repeatTarget, activeVerse, audio.stop]);

  const playTrack = useCallback(async () => {
    if (!track || !trackSessionRef.current.active) return;
    try {
      await audio.loadAndPlay(track.audioUrl, false, () => {
        const session = trackSessionRef.current;
        if (!session.active) return;
        if (isDevotionalSleepTimerExpired(sleepDeadlineRef.current, Date.now())) {
          void stopListeningRef.current();
          return;
        }
        session.completedCycles += 1;
        setCompletedCycles(session.completedCycles);
        if (session.completedCycles >= session.target) {
          session.active = false;
          setListeningKind(null);
          setPlaying(false);
          sleepDeadlineRef.current = null;
          return;
        }
        void playTrackRef.current();
      }, {
        backgroundPlayback: true,
        lockScreenMetadata: { title: track.title, artist: track.creator, albumTitle: stotram?.title ?? 'Stotram' },
      });
      if (trackSessionRef.current.active) setPlaying(true);
    } catch (error) {
      if (!trackSessionRef.current.active) return;
      trackSessionRef.current.active = false;
      sleepDeadlineRef.current = null;
      setListeningKind(null);
      setPlaying(false);
      Alert.alert('Audio unavailable', 'Could not load this recording. Please try again.');
      console.warn('[Stotram] Recorded audio playback failed:', error);
    }
  }, [track, audio.loadAndPlay, stotram?.title]);
  playTrackRef.current = playTrack;

  const togglePlayback = useCallback(async () => {
    if (!track) return;
    if (trackSessionRef.current.active) {
      if (playing) {
        await audio.pause();
        setPlaying(false);
      } else {
        await audio.resume();
        setPlaying(true);
      }
      return;
    }
    await handlers.stopTTS();
    recitationRef.current.active = false;
    trackSessionRef.current = { active: true, target: repeatTarget, completedCycles: 0 };
    setCompletedCycles(0);
    setListeningKind('track');
    sleepDeadlineRef.current = getDevotionalSleepTimerDeadline(sleepSelectionRef.current, Date.now());
    await playTrackRef.current();
  }, [track, playing, audio.pause, audio.resume, handlers.stopTTS, repeatTarget]);

  useEffect(() => {
    recitationRef.current.target = repeatTarget;
    trackSessionRef.current.target = repeatTarget;
  }, [repeatTarget]);

  useEffect(() => {
    if (!state.ttsError || !recitationRef.current.active) return;
    void stopListeningRef.current();
  }, [state.ttsError]);

  useEffect(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    const deadline = sleepDeadlineRef.current;
    if (listeningKind === null || deadline === null) return;
    const delay = Math.max(0, deadline - Date.now());
    sleepTimerRef.current = setTimeout(() => void stopListeningRef.current(), delay);
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    };
  }, [listeningKind, sleepSelection, stopListening]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && isDevotionalSleepTimerExpired(sleepDeadlineRef.current, Date.now())) {
        void stopListeningRef.current();
      }
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => () => {
    void stopListeningRef.current();
  }, []));

  const fsScale = fontStep === 0 ? 0.85 : fontStep === 1 ? 1 : fontStep === 2 ? 1.15 : 1.3;
  if (loading) {
    return (
      <Screen style={{ backgroundColor: theme.bg, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}>
        <SacredLoader
          icon="bhakti"
          title="Invoking Sacred Stotram"
          subtitle="Preparing verses, audio, and devotional recitation..."
          showBack={true}
        />
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
      contentId={`stotram-${stotram.id}`}
      title={stotram.title}
      subtitle={stotram.deityEmoji ? `${stotram.deityEmoji} ${stotram.type}` : stotram.type}
      fallbackBackUrl="/(tabs)/bhakti"
      onBeforeBack={stopListening}
      scrollViewRef={scrollViewRef}
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
      currentLanguage={activeLang}
      setLanguage={(code) => setReaderLanguageOverride(code as typeof language)}
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
        if (listeningKind === 'recitation') void stopListening();
        else startRecitation();
      }}
      ttsRate={track ? undefined : ttsRate}
      onTTSRateChange={track ? undefined : (rate) => setTtsRate(rate as 0.75 | 1 | 1.25)}
      isSpeaking={track ? playing : state.isSpeaking || listeningKind === 'recitation'}
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

        <DevotionalListeningControls
          language={activeLang}
          accent={accent}
          surface={theme.card}
          border={theme.border}
          text={theme.text}
          dim={theme.dim}
          selectedText={isDark ? COLORS.darkBg : COLORS.onMediaWhite}
          scope={repeatScope}
          onScopeChange={setRepeatScope}
          scopeDisabled={Boolean(track) || listeningKind !== null}
          target={repeatTarget}
          onTargetChange={setRepeatTarget}
          completedCycles={completedCycles}
          isActive={listeningKind !== null}
          activeVerseNumber={listeningKind === 'recitation' ? stotram.verses[recitationRef.current.verseIndex]?.number : undefined}
          verseCount={stotram.verses.length}
          sleepSelection={sleepSelection}
          onSleepSelectionChange={updateSleepSelection}
        />

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
            const isFollowingVerse = listeningKind === 'recitation' && recitationRef.current.verseIndex === i;
            return (
              <View
                key={verse.number}
                ref={(node) => { verseCardRefs.current[i] = node; }}
                accessible={false}
                style={{
                  borderRadius: RADII.lg,
                  backgroundColor: theme.card,
                  borderColor: isFollowingVerse ? accent : isActive ? `${accent}40` : theme.border,
                  borderWidth: isFollowingVerse ? 2 : 1,
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
