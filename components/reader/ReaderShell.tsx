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
  ReaderOptionsSheet,
  ReaderTopBar,
  SheetChip,
  type OptionsSheetSection,
} from '@/components/reader/ReaderControls';
import { TYPE } from '@/lib/constants';
import { trackReaderEvent } from '@/lib/analytics/reader-events';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createReaderChromeController, isPageTap } from '@/lib/readerChrome';
import { readerCopy } from '@/lib/readerCopy';
import { READER_PAPER_CHOICES, setReaderPrefs, useReaderPrefs } from '@/lib/readerPrefs';
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
    if (!isPageTap(start, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, t: Date.now() })) return;
    // The plain-page Pressable's onPress runs in the same touch dispatch; defer
    // so we know whether the tap landed on plain page or on content.
    setTimeout(() => chrome.pageTap(!plainPagePress.current), 0);
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
            if (scrollViewRef) {
              (scrollViewRef as any).current = node;
            }
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle ?? (onScroll ? 16 : undefined)}
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
              {children}
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
