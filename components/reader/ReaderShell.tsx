import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, type Href } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useFallbackBackHandler } from '@/components/ui/BackButton';
import { ReaderIntro } from '@/components/reader/ReaderIntro';
import {
  CHROME_MAX_FONT_SCALE,
  ReaderCapsule,
  ReaderChapterHeader,
  ReaderChapterNav,
  ReaderOptionsSheet,
  ReaderTopBar,
  SheetChip,
  type OptionsSheetSection,
} from '@/components/reader/ReaderControls';
import { TYPE } from '@/lib/constants';
import { trackReaderEvent } from '@/lib/analytics/reader-events';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { chapterSwipe, createReaderChromeController, isPageTap } from '@/lib/readerChrome';
import { readerCopy } from '@/lib/readerCopy';
import { READER_PAPER_CHOICES, setReaderPrefs, useReaderPrefs } from '@/lib/readerPrefs';
import {
  clearReadingPosition,
  getReadingPosition,
  isResumableChapterPosition,
  isResumableRatio,
  saveReadingPosition,
} from '@/lib/readingProgress';
import { clampChapterIndex, usesChapterLayout } from '@/lib/readerChapters';
import { readerControlsPalette } from '@/lib/readerAppearance';
import { useReaderAppearance } from '@/lib/useReaderAppearance';
import { ReaderAppearanceContext } from '@/lib/readerAppearanceContext';
import { READER_PAPER } from '@/lib/constants';

// Shared reader frame for Dharm Veer, Stotram, Katha, Vrat and Festival.
//
// Phase 1 of docs/READER_EXPERIENCE_GRAND_PLAN.md: a compact top bar
// (back · title · pin) and a floating bottom capsule (text size · listen ·
// language · "Aa" options) that hide after 3.5 s without interaction and come
// back on a tap on the page (lib/readerChrome.ts). Copy, share, speed,
// transliteration and meaning moved into the "Aa" sheet. The screen stays
// awake while a reader is in front. With a screen reader running the controls
// never hide; with Reduce Motion they fade instead of sliding.
//
// Props are unchanged from the previous two-row header, so screens did not
// need to change.

type ReaderLanguage<Code extends string> = {
  code: Code;
  label: string;
};

export interface ReaderShellProps<LanguageCode extends string = string> {
  title: string;
  subtitle?: string;
  fallbackBackUrl: Href;
  onBack?: () => void;
  onBeforeBack?: () => void | Promise<void>;

  themeColor?: string;
  headerCenterContent?: ReactNode;
  ambientGlowColor?: string;

  fontPresets?: ReadonlyArray<{ label: string }>;
  fontStep?: number;
  setFontStep?: (step: number) => void;

  languages?: ReadonlyArray<ReaderLanguage<LanguageCode>>;
  currentLanguage?: LanguageCode;
  setLanguage?: (code: LanguageCode) => void;

  showTransliterationToggle?: boolean;
  isTransliterationOn?: boolean;
  onToggleTransliteration?: () => void;

  showMeaningToggle?: boolean;
  isMeaningOn?: boolean;
  onToggleMeaning?: () => void;
  canShowExplain?: boolean;

  onTTS?: () => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  ttsRate?: number;
  onTTSRateChange?: (rate: number) => void;

  onCopy?: () => void;
  isCopied?: boolean;
  onShare?: () => void;

  bottomBar?: ReactNode;
  shellBackgroundColor?: string;
  shellHeaderBackgroundColor?: string;
  children: ReactNode;
  contentContainerStyle?: ViewStyle;
  scrollViewRef?: React.RefObject<ScrollView | null>;
  onScroll?: (event: import('react-native').NativeSyntheticEvent<import('react-native').NativeScrollEvent>) => void;
  scrollEventThrottle?: number;

  /**
   * Resume (Phase 3): when set, the reader remembers how far down the user
   * read and returns there next time. `progressVersion` must change when the
   * text changes (e.g. include the reading language).
   */
  progressId?: string;
  progressVersion?: string;

  /** Listening (Phase 4): status line shown above the capsule while listening. */
  listeningStatus?: string;
  /** Repeat count for the recitation (1/11/21/108); omitted when not supported. */
  repeat?: { value: number; options: readonly number[]; onChange: (value: number) => void };
  /** Enables the sleep timer's "After this recitation" option. */
  onSleepAfterThis?: (enabled: boolean) => void;

  /**
   * Chapters (Phase 6): offers a Chapters / One page choice in "Aa". When the
   * reader's layout pref is "chapters" (see usesChapterLayout), the screen
   * renders only chapter `index` as children and the shell adds the chapter
   * header, Previous/Next, horizontal swipe, and resume by chapter.
   */
  chapterLayout?: {
    titles: readonly string[];
    /** Per chapter: shown in English because the translation does not exist. */
    fallback?: readonly boolean[];
    index: number;
    onChange: (index: number) => void;
  };
}

const TTS_RATES = [0.75, 1, 1.25] as const;
const READER_INTRO_KEY = 'shoonaya_reader_intro_seen';
const TAP_HINT_MS = 4000;
const CAPSULE_GAP = 12;

export function ReaderShell<LanguageCode extends string = string>({
  title,
  subtitle,
  fallbackBackUrl,
  onBack,
  onBeforeBack,
  headerCenterContent,
  ambientGlowColor,
  fontPresets,
  fontStep,
  setFontStep,
  languages,
  currentLanguage,
  setLanguage,
  showTransliterationToggle,
  isTransliterationOn,
  onToggleTransliteration,
  showMeaningToggle,
  isMeaningOn,
  onToggleMeaning,
  canShowExplain = false,
  onTTS,
  isSpeaking,
  isTTSGenerating,
  ttsRate,
  onTTSRateChange,
  onCopy,
  isCopied,
  onShare,
  bottomBar,
  shellBackgroundColor,
  shellHeaderBackgroundColor,
  children,
  contentContainerStyle,
  scrollViewRef,
  onScroll,
  scrollEventThrottle,
  progressId,
  progressVersion = 'v1',
  listeningStatus,
  repeat,
  onSleepAfterThis,
  chapterLayout,
}: ReaderShellProps<LanguageCode>) {
  const appearance = useReaderAppearance();
  const { paper, isDark } = appearance;
  const surfaceAppearance = useMemo(() => ({ isDark: appearance.isDark, theme: appearance.theme }), [appearance]);
  const insets = useSafeAreaInsets();
  const handleBack = useFallbackBackHandler(fallbackBackUrl, true, onBack, onBeforeBack);
  const { language: appLanguage } = useLanguage();
  const copy = readerCopy(appLanguage);
  const { prefs, loaded: prefsLoaded } = useReaderPrefs();

  // Controls use the paper's own accent (contrast-tested in
  // __tests__/reader-appearance.test.ts). The screen's `themeColor` prop is
  // accepted for compatibility but no longer used: brand gold is ~2.6:1 on
  // light paper, below the 3:1 minimum for controls.
  const palette = useMemo(() => {
    const base = readerControlsPalette(paper);
    return {
      ...base,
      page: shellBackgroundColor ?? base.page,
      bar: shellHeaderBackgroundColor ?? base.bar,
    };
  }, [paper, shellBackgroundColor, shellHeaderBackgroundColor]);

  useEffect(() => {
    trackReaderEvent('reader_opened', {
      source: title,
      has_transliteration: Boolean(showTransliterationToggle),
      has_meaning: Boolean(showMeaningToggle),
    });
  }, [showMeaningToggle, showTransliterationToggle, title]);

  // ── Controls visibility ──────────────────────────────────────────────
  const [visible, setVisible] = useState(true);
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const chromeRef = useRef<ReturnType<typeof createReaderChromeController> | null>(null);
  if (!chromeRef.current) {
    chromeRef.current = createReaderChromeController({ onChange: (state) => setVisible(state.visible) });
  }
  const chrome = chromeRef.current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    chrome.start();
    return () => chrome.dispose();
  }, [chrome]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => { if (mounted) { setScreenReader(on); chrome.setScreenReader(on); } }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => { if (mounted) setReduceMotion(on); }).catch(() => {});
    const sr = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => { setScreenReader(on); chrome.setScreenReader(on); });
    const rm = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; sr.remove(); rm.remove(); };
  }, [chrome]);

  useEffect(() => {
    if (prefsLoaded) chrome.setPinned(prefs.pinned);
  }, [chrome, prefs.pinned, prefsLoaded]);

  useEffect(() => {
    if (isTTSGenerating) chrome.hold('tts-loading'); else chrome.release('tts-loading');
  }, [chrome, isTTSGenerating]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 120 : 260,
      useNativeDriver: true,
    }).start();
  }, [progress, visible, reduceMotion]);

  // ── Keep the screen awake while this reader is in front ─────────────
  const keepAwakeTag = `reader-${useId()}`;
  useFocusEffect(useCallback(() => {
    void activateKeepAwakeAsync(keepAwakeTag).catch(() => {});
    return () => { void deactivateKeepAwake(keepAwakeTag).catch(() => {}); };
  }, [keepAwakeTag]));

  // ── First-time hint ("tap the page") ────────────────────────────────
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (!prefsLoaded || prefs.tapHintSeen || screenReader) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Wait until the existing reader intro has been seen, so the two never stack.
    void AsyncStorage.getItem(READER_INTRO_KEY).then((seen) => {
      if (cancelled || seen !== 'true') return;
      setHintVisible(true);
      chrome.hold('hint');
      timer = setTimeout(() => {
        setHintVisible(false);
        chrome.release('hint');
        void setReaderPrefs({ tapHintSeen: true });
      }, TAP_HINT_MS);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      chrome.release('hint');
    };
  }, [chrome, prefsLoaded, prefs.tapHintSeen, screenReader]);

  // ── Options sheet ───────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = useCallback(() => { setSheetOpen(true); chrome.hold('sheet'); }, [chrome]);
  const closeSheet = useCallback(() => { setSheetOpen(false); chrome.release('sheet'); }, [chrome]);

  // ── Page taps: a tap on plain page area toggles; a tap on content that
  // handles it (a verse, a link) does its own job and only ever shows. ──
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const plainPagePress = useRef(false);
  const onPageTouchStart = (event: GestureResponderEvent) => {
    touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, t: Date.now() };
    plainPagePress.current = false;
  };
  const onPageTouchEnd = (event: GestureResponderEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const end = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, t: Date.now() };
    if (chapterRef.current.chaptered) {
      const turn = chapterSwipe(start, end);
      if (turn !== 0) {
        goToChapter(chapterRef.current.index + turn);
        return;
      }
    }
    if (!isPageTap(start, end)) return;
    // The plain-page Pressable's onPress runs in the same touch dispatch; defer
    // so we know whether the tap landed on plain page or on content.
    setTimeout(() => chrome.pageTap(!plainPagePress.current), 0);
  };

  // ── Chapters (Phase 6) ──────────────────────────────────────────────
  const chapterTitles = chapterLayout?.titles ?? [];
  const chaptered = Boolean(chapterLayout) && usesChapterLayout(prefs.layout, chapterTitles.length);
  const chapterIndex = chaptered ? clampChapterIndex(chapterLayout?.index ?? 0, chapterTitles.length) : 0;
  const chapterRef = useRef({ chaptered, index: chapterIndex, titles: chapterTitles, onChange: chapterLayout?.onChange });
  chapterRef.current = { chaptered, index: chapterIndex, titles: chapterTitles, onChange: chapterLayout?.onChange };
  /** The reader turned a chapter themselves, so a late restore must not move them. */
  const userNavigated = useRef(false);
  // Positions are stored per layout: a whole-page ratio means nothing inside a chapter.
  const effectiveVersion = chaptered ? `${progressVersion}:chapters` : progressVersion;

  // ── Resume where you left off (Phase 3) ─────────────────────────────
  const scrollRef = useRef<ScrollView | null>(null);
  const metrics = useRef({ y: 0, contentHeight: 0, viewport: 0 });
  const restore = useRef<{ ratio: number; deadline: number; done: boolean; userMoved: boolean; label?: string } | null>(null);
  const lastSave = useRef(0);
  const [resumeBanner, setResumeBanner] = useState<string | null>(null);

  const currentRatio = () => {
    const { y, contentHeight, viewport } = metrics.current;
    const scrollable = contentHeight - viewport;
    return scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
  };
  const persistPosition = useCallback(() => {
    if (!progressId) return;
    const pending = restore.current;
    if (pending && !pending.done) return; // never overwrite before the restore ran
    const ratio = currentRatio();
    const chapter = chapterRef.current;
    void saveReadingPosition(
      progressId,
      effectiveVersion,
      chapter.chaptered ? { page: chapter.index, ratio, label: chapter.titles[chapter.index] } : { ratio },
    );
  }, [progressId, effectiveVersion]);

  const announceResume = (pending: NonNullable<typeof restore.current>) => {
    pending.done = true;
    setResumeBanner(copy.resumed(pending.label ?? `${Math.round(pending.ratio * 100)}%`));
    chrome.hold('resume');
  };

  const hasChapterLayout = Boolean(chapterLayout);
  useEffect(() => {
    restore.current = null;
    setResumeBanner(null);
    if (!progressId) return;
    // Wait for the layout pref, so a position is read for the layout in use.
    if (hasChapterLayout && !prefsLoaded) return;
    userNavigated.current = false;
    let cancelled = false;
    void getReadingPosition(progressId, effectiveVersion).then((position) => {
      if (cancelled || !position) return;
      const chapter = chapterRef.current;
      if (chapter.chaptered) {
        if (userNavigated.current || !isResumableChapterPosition(position, chapter.titles.length)) return;
        const page = position.page as number;
        const pending = { ratio: position.ratio ?? 0, deadline: Date.now() + 2500, done: false, userMoved: false, label: chapter.titles[page] };
        restore.current = pending;
        if (page !== chapter.index) chapter.onChange?.(page);
        if (pending.ratio < 0.02) announceResume(pending);
        else applyRestore();
        return;
      }
      if (!isResumableRatio(position.ratio)) return;
      restore.current = { ratio: position.ratio as number, deadline: Date.now() + 2500, done: false, userMoved: false };
      applyRestore();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressId, effectiveVersion, hasChapterLayout, prefsLoaded]);

  // Content often grows after first layout (images, async sections): keep
  // re-applying the target for a short window unless the user has scrolled.
  const applyRestore = () => {
    const pending = restore.current;
    const { contentHeight, viewport } = metrics.current;
    if (!pending || pending.userMoved || contentHeight <= viewport + 1 || viewport === 0) return;
    if (pending.done && Date.now() > pending.deadline) return;
    scrollRef.current?.scrollTo({ y: pending.ratio * (contentHeight - viewport), animated: false });
    if (!pending.done) announceResume(pending);
  };

  useEffect(() => {
    if (!resumeBanner) return;
    const timer = setTimeout(() => { setResumeBanner(null); chrome.release('resume'); }, 6000);
    return () => { clearTimeout(timer); chrome.release('resume'); };
  }, [chrome, resumeBanner]);

  /** Turns to a chapter: top of the new chapter, position saved, change announced. */
  const goToChapter = useCallback((next: number) => {
    const chapter = chapterRef.current;
    if (!chapter.chaptered) return;
    const target = clampChapterIndex(next, chapter.titles.length);
    if (target === chapter.index) return;
    userNavigated.current = true;
    if (restore.current) { restore.current.userMoved = true; restore.current.done = true; }
    metrics.current.y = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    chapter.onChange?.(target);
    if (progressId) void saveReadingPosition(progressId, effectiveVersion, { page: target, ratio: 0, label: chapter.titles[target] });
    AccessibilityInfo.announceForAccessibility(copy.goToChapter(target + 1, chapter.titles[target]));
  }, [copy, effectiveVersion, progressId]);

  const startOver = () => {
    if (restore.current) restore.current.userMoved = true;
    const chapter = chapterRef.current;
    if (chapter.chaptered && chapter.index !== 0) {
      userNavigated.current = true;
      metrics.current.y = 0;
      chapter.onChange?.(0);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: !reduceMotion });
    setResumeBanner(null);
    chrome.release('resume');
    if (progressId) void clearReadingPosition(progressId, effectiveVersion);
  };

  useFocusEffect(useCallback(() => () => { persistPosition(); }, [persistPosition]));

  // ── Sleep timer (Phase 4) ──────────────────────────────────────────
  // Minutes, or 'after' (stop at the end of the current recitation; the
  // screen does that via onSleepAfterThis). Stops listening via onTTS, the
  // same control the user would tap. Runs while the app is in the background
  // because background playback keeps the JS thread alive.
  const [sleep, setSleep] = useState<'off' | 15 | 30 | 'after'>('off');
  const speakingRef = useRef(Boolean(isSpeaking));
  speakingRef.current = Boolean(isSpeaking);
  const onTTSRef = useRef(onTTS);
  onTTSRef.current = onTTS;
  useEffect(() => {
    if (sleep === 'off' || sleep === 'after') return;
    const timer = setTimeout(() => {
      if (speakingRef.current) onTTSRef.current?.();
      setSleep('off');
    }, sleep * 60 * 1000);
    return () => clearTimeout(timer);
  }, [sleep]);
  const chooseSleep = (value: typeof sleep) => {
    setSleep(value);
    onSleepAfterThis?.(value === 'after');
  };

  // ── Layout ──────────────────────────────────────────────────────────
  const [topBarHeight, setTopBarHeight] = useState(insets.top + 60);
  const [capsuleHeight, setCapsuleHeight] = useState(52);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);

  const hasFont = Boolean(fontPresets && setFontStep && typeof fontStep === 'number' && fontPresets.length > 0);
  const languageList = languages && setLanguage && currentLanguage && languages.length > 1 ? languages : null;
  const hasTTSRate = Boolean(onTTS && ttsRate !== undefined && onTTSRateChange);

  const sections: OptionsSheetSection[] = [];
  if (hasFont && fontPresets && setFontStep) {
    sections.push({
      key: 'text',
      title: copy.sectionText,
      content: fontPresets.map((preset, index) => (
        <SheetChip key={preset.label} label={preset.label} role="radio" selected={fontStep === index} palette={palette}
          accessibilityLabel={copy.textSize(preset.label)} onPress={() => setFontStep(index)} />
      )),
    });
  }
  if (hasTTSRate) {
    sections.push({
      key: 'speed',
      title: copy.sectionSpeed,
      content: TTS_RATES.map((rate) => (
        <SheetChip key={rate} label={`${rate}×`} role="radio" selected={ttsRate === rate} palette={palette}
          accessibilityLabel={copy.speed(String(rate))} onPress={() => onTTSRateChange?.(rate)} />
      )),
    });
  }
  if (chapterLayout && chapterTitles.length > 1) {
    sections.push({
      key: 'layout',
      title: copy.sectionLayout,
      content: (['chapters', 'scroll'] as const).map((layout) => (
        <SheetChip
          key={layout}
          label={layout === 'chapters' ? copy.layoutChapters : copy.layoutScroll}
          role="radio"
          icon={layout === 'chapters' ? 'book' : 'file-text'}
          selected={prefs.layout === layout}
          palette={palette}
          onPress={() => { void setReaderPrefs({ layout }); }}
        />
      )),
    });
  }
  sections.push({
    key: 'paper',
    title: copy.sectionPaper,
    content: READER_PAPER_CHOICES.map((choice) => (
      <SheetChip
        key={choice}
        label={copy.paper[choice]}
        role="radio"
        selected={prefs.paper === choice}
        palette={palette}
        swatch={choice === 'auto' ? undefined : { page: READER_PAPER[choice].page, ink: READER_PAPER[choice].text }}
        onPress={() => { void setReaderPrefs({ paper: choice }); }}
      />
    )),
  });
  if (repeat) {
    sections.push({
      key: 'repeat',
      title: copy.sectionRepeat,
      content: repeat.options.map((count) => (
        <SheetChip key={count} label={copy.repeatTimes(count)} role="radio" selected={repeat.value === count} palette={palette} onPress={() => repeat.onChange(count)} />
      )),
    });
  }
  if (onTTS) {
    const sleepChoices: Array<{ value: typeof sleep; label: string }> = [
      { value: 'off', label: copy.sleepOff },
      { value: 15, label: copy.sleepMinutes(15) },
      { value: 30, label: copy.sleepMinutes(30) },
      ...(onSleepAfterThis ? [{ value: 'after' as const, label: copy.sleepAfterThis }] : []),
    ];
    sections.push({
      key: 'sleep',
      title: copy.sectionSleep,
      content: sleepChoices.map((choice) => (
        <SheetChip key={String(choice.value)} label={choice.label} role="radio" icon={choice.value === 'off' ? undefined : 'moon'}
          selected={sleep === choice.value} palette={palette} onPress={() => chooseSleep(choice.value)} />
      )),
    });
  }
  if ((showTransliterationToggle && onToggleTransliteration) || (showMeaningToggle && onToggleMeaning)) {
    sections.push({
      key: 'show',
      title: copy.sectionShow,
      content: (
        <>
          {showTransliterationToggle && onToggleTransliteration ? (
            <SheetChip label={copy.transliteration} role="switch" icon="type" selected={Boolean(isTransliterationOn)} palette={palette} onPress={onToggleTransliteration} />
          ) : null}
          {showMeaningToggle && onToggleMeaning ? (
            <SheetChip label={copy.meaning} role="switch" icon="book-open" selected={Boolean(isMeaningOn)} palette={palette} onPress={onToggleMeaning} />
          ) : null}
        </>
      ),
    });
  }
  if (onCopy || onShare) {
    sections.push({
      key: 'actions',
      title: copy.sectionActions,
      content: (
        <>
          {onCopy ? <SheetChip label={isCopied ? copy.copied : copy.copy} icon={isCopied ? 'check' : 'copy'} palette={palette} onPress={onCopy} /> : null}
          {onShare ? <SheetChip label={copy.share} icon="share-2" palette={palette} onPress={() => { closeSheet(); onShare(); }} /> : null}
        </>
      ),
    });
  }

  const cycleLanguage = () => {
    if (!languageList || !setLanguage) return;
    const index = languageList.findIndex((language) => language.code === currentLanguage);
    setLanguage(languageList[(index + 1) % languageList.length].code);
  };
  const currentLanguageLabel = languageList?.find((language) => language.code === currentLanguage)?.label;

  const capsule = (
    <ReaderCapsule
      palette={palette}
      copy={copy}
      onInteract={() => chrome.interact()}
      font={hasFont && fontPresets && setFontStep && typeof fontStep === 'number' ? {
        label: fontPresets[fontStep]?.label ?? '',
        canDecrease: fontStep > 0,
        canIncrease: fontStep < fontPresets.length - 1,
        onDecrease: () => setFontStep(Math.max(0, fontStep - 1)),
        onIncrease: () => setFontStep(Math.min(fontPresets.length - 1, fontStep + 1)),
      } : undefined}
      listen={onTTS ? { speaking: Boolean(isSpeaking), preparing: Boolean(isTTSGenerating), onPress: onTTS } : undefined}
      language={languageList && currentLanguageLabel ? { label: currentLanguageLabel, onPress: cycleLanguage } : undefined}
      onOpenOptions={sections.length > 0 ? openSheet : undefined}
    />
  );
  const hasCapsule = Boolean(hasFont || onTTS || languageList || sections.length > 0);

  const slide = reduceMotion ? 0 : 1;
  const topStyle = {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-topBarHeight * slide, 0] }) }],
  };
  const bottomStyle = {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [(capsuleHeight + CAPSULE_GAP + insets.bottom) * slide, 0] }) }],
  };
  const capsuleBottom = (bottomBar ? bottomBarHeight : insets.bottom) + CAPSULE_GAP;
  const bottomPadding = (bottomBar ? bottomBarHeight : insets.bottom) + (hasCapsule ? capsuleHeight + CAPSULE_GAP * 2 : 32);

  return (
    <View style={{ flex: 1, backgroundColor: palette.page }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {ambientGlowColor ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -150,
            left: -150,
            width: 360,
            height: 360,
            borderRadius: 180,
            backgroundColor: ambientGlowColor,
            opacity: isDark ? 0.12 : 0.08,
          }}
        />
      ) : null}

      <View style={{ flex: 1 }} onTouchStart={onPageTouchStart} onTouchEnd={onPageTouchEnd}>
        <ScrollView
          ref={(node) => {
            scrollRef.current = node;
            if (scrollViewRef) {
              scrollViewRef.current = node;
            }
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onLayout={(event) => { metrics.current.viewport = event.nativeEvent.layout.height; applyRestore(); }}
          onContentSizeChange={(_, height) => { metrics.current.contentHeight = height; applyRestore(); }}
          onScrollBeginDrag={() => { if (restore.current) restore.current.userMoved = true; }}
          onScroll={(event) => {
            metrics.current.y = event.nativeEvent.contentOffset.y;
            const now = Date.now();
            if (progressId && now - lastSave.current > 1500) { lastSave.current = now; persistPosition(); }
            onScroll?.(event);
          }}
          scrollEventThrottle={scrollEventThrottle ?? 32}
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingTop: topBarHeight + 16,
              paddingBottom: bottomPadding,
            },
            contentContainerStyle,
          ]}
        >
          <Pressable
            accessible={false}
            onPress={() => { plainPagePress.current = true; }}
            style={{ flexGrow: 1 }}
          >
            {/* Shared Card/Button inside the page follow the paper theme. */}
            <ReaderAppearanceContext.Provider value={surfaceAppearance}>
              {chaptered ? (
                <ReaderChapterHeader
                  index={chapterIndex}
                  count={chapterTitles.length}
                  palette={palette}
                  copy={copy}
                  fallback={chapterLayout?.fallback?.[chapterIndex]}
                />
              ) : null}
              {children}
              {chaptered ? (
                <ReaderChapterNav index={chapterIndex} titles={chapterTitles} palette={palette} copy={copy} onGoTo={goToChapter} />
              ) : null}
            </ReaderAppearanceContext.Provider>
          </Pressable>
        </ScrollView>
      </View>

      {/* Status-bar backdrop: keeps text from running under the clock when the bar hides. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: palette.page }} />

      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        accessibilityElementsHidden={!visible}
        importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
        onLayout={(event) => setTopBarHeight(event.nativeEvent.layout.height)}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 6,
            paddingHorizontal: 16,
            paddingBottom: 10,
            backgroundColor: palette.bar,
            borderBottomWidth: 1,
            borderBottomColor: palette.barBorder,
            boxShadow: palette.shadow,
            zIndex: 10,
          },
          topStyle,
        ]}
      >
        <ReaderTopBar
          palette={palette}
          title={title}
          subtitle={subtitle}
          centerContent={headerCenterContent}
          onBack={handleBack}
          pinned={prefs.pinned}
          onTogglePin={() => { chrome.interact(); void setReaderPrefs({ pinned: !prefs.pinned }); }}
          copy={copy}
        />
      </Animated.View>

      {hasCapsule ? (
        <Animated.View
          pointerEvents={visible ? 'box-none' : 'none'}
          accessibilityElementsHidden={!visible}
          importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
          onLayout={(event) => setCapsuleHeight(event.nativeEvent.layout.height)}
          style={[{ position: 'absolute', left: 16, right: 16, bottom: capsuleBottom, zIndex: 20, alignItems: 'center', gap: 8 }, bottomStyle]}
        >
          {isSpeaking && (listeningStatus || sleep !== 'off') ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.capsule, borderWidth: 1, borderColor: palette.glassBorder }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.caption, color: palette.text, textAlign: 'center' }}>
                {[listeningStatus, sleep !== 'off' ? copy.sleepActive(sleep === 'after' ? copy.sleepAfterThis : copy.sleepMinutes(sleep)) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}
          {resumeBanner ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: 4, borderRadius: 999, backgroundColor: palette.capsule, borderWidth: 1, borderColor: palette.glassBorder, boxShadow: palette.floatingShadow }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.caption, color: palette.text, flexShrink: 1 }}>
                {resumeBanner}
              </Text>
              <Pressable
                onPress={startOver}
                accessibilityRole="button"
                accessibilityLabel={copy.startOver}
                style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}
              >
                <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.label, color: palette.accent }}>{copy.startOver}</Text>
              </Pressable>
            </View>
          ) : null}
          {hintVisible ? (
            <View
              accessibilityLiveRegion="polite"
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.capsule, borderWidth: 1, borderColor: palette.glassBorder }}
            >
              <Text maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE} style={{ ...TYPE.caption, color: palette.text, textAlign: 'center' }}>
                {copy.tapHint}
              </Text>
            </View>
          ) : null}
          {capsule}
        </Animated.View>
      ) : null}

      {bottomBar ? (
        <View
          onLayout={(event) => setBottomBarHeight(event.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingBottom: insets.bottom,
            borderTopWidth: 1,
            borderTopColor: palette.border,
            backgroundColor: palette.bar,
            boxShadow: palette.shadow,
          }}
        >
          {bottomBar}
        </View>
      ) : null}

      <ReaderOptionsSheet
        visible={sheetOpen}
        onClose={closeSheet}
        palette={palette}
        copy={copy}
        sections={sections}
        bottomInset={insets.bottom}
        reduceMotion={reduceMotion}
      />

      <ReaderIntro
        isDark={isDark}
        capabilities={{
          canToggleLocalLanguage: Boolean(languages?.length),
          canGenerateTTS: Boolean(onTTS),
          canShowExplain,
          canToggleTransliteration: Boolean(showTransliterationToggle),
          canShowMeaning: Boolean(showMeaningToggle),
        }}
      />
    </View>
  );
}
