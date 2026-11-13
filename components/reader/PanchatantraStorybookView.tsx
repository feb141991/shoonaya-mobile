import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  GestureResponderEvent,
  View,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Platform,
} from "react-native";
import { useReaderAppearance } from "@/lib/useReaderAppearance";
import { readerCopy } from "@/lib/readerCopy";
import { PagedResumeBanner, usePagedResume } from "@/components/reader/usePagedResume";
import { useNitiTreasuryItem } from "@/components/reader/useNitiTreasury";
import { readerControlsPalette } from "@/lib/readerAppearance";
import { createReaderChromeController, isPageTap } from "@/lib/readerChrome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import {
  FONTS,
  SHADOWS,
  TYPE,
  KATHA_VIEW_ACCENT,
} from "@/lib/constants";
import {
  getPanchatantraSceneArtwork,
  getPanchatantraArtworkSource,
  hasDedicatedSceneArtwork,
} from "@/lib/panchatantraArtwork";
import {
  STORYBOOK_FONT_SCALES,
  MASTERWORK_SCENE_FRAMING,
  SCENE_STAGE_LABELS,
  localizedLabel,
  type StorybookFontScale,
  type StorybookKathaData,
} from "@/lib/panchatantraStorybook";
import { StorybookTopBar } from "@/components/reader/StorybookTopBar";
import { StorybookSceneIllustration } from "@/components/reader/StorybookSceneIllustration";
import { StorybookParchmentCard } from "@/components/reader/StorybookParchmentCard";
import { StorybookBottomBar } from "@/components/reader/StorybookBottomBar";


export { STORYBOOK_FONT_SCALES };
export type { StorybookFontScale, StorybookKathaData };

interface PanchatantraStorybookViewProps {
  katha: StorybookKathaData;
  activeLanguage: "en" | "hi" | "pa";
  onLanguageChange: (lang: "en" | "hi" | "pa") => void;
  onBack?: () => void;
  fontSize?: { fontSize: number; lineHeight: number };
  onTTS?: (sceneText?: string) => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  onComplete?: () => void;
}

export function PanchatantraStorybookView({
  katha,
  activeLanguage,
  onLanguageChange,
  onBack,
  fontSize,
  onTTS,
  isSpeaking = false,
  isTTSGenerating = false,
  onComplete,
}: PanchatantraStorybookViewProps) {
  // Reader paper theme (Phase 2, docs/READER_EXPERIENCE_GRAND_PLAN.md).
  const { isDark, theme, paper } = useReaderAppearance();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const accent = KATHA_VIEW_ACCENT.panchatantra; // warm terracotta #C87850
  const palette = useMemo(() => readerControlsPalette(paper, accent), [paper, accent]);

  // Controls visibility & auto-hide controller (Full screen after 3.5s)
  const [controlsVisible, setControlsVisible] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const controlsProgress = useRef(new Animated.Value(1)).current;

  const chromeRef = useRef<ReturnType<typeof createReaderChromeController> | null>(null);
  if (!chromeRef.current) {
    chromeRef.current = createReaderChromeController({
      onChange: (state) => setControlsVisible(state.visible),
    });
  }
  const chrome = chromeRef.current;

  useEffect(() => {
    chrome.start();
    return () => chrome.dispose();
  }, [chrome]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (mounted) {
        setScreenReader(on);
        chrome.setScreenReader(on);
      }
    }).catch(() => {});
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (mounted) setReduceMotion(on);
    }).catch(() => {});
    const sr = AccessibilityInfo.addEventListener("screenReaderChanged", (on) => {
      setScreenReader(on);
      chrome.setScreenReader(on);
    });
    const rm = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      sr.remove();
      rm.remove();
    };
  }, [chrome]);

  useEffect(() => {
    if (isTTSGenerating) chrome.hold("tts-loading");
    else chrome.release("tts-loading");
  }, [chrome, isTTSGenerating]);

  useEffect(() => {
    Animated.timing(controlsProgress, {
      toValue: controlsVisible ? 1 : 0,
      duration: reduceMotion ? 120 : 260,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsProgress, reduceMotion]);

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    chrome.setPinned(next);
  };

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onScreenTouchStart = (event: GestureResponderEvent) => {
    touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, t: Date.now() };
  };
  const onScreenTouchEnd = (event: GestureResponderEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const end = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, t: Date.now() };
    if (isPageTap(start, end)) {
      chrome.pageTap(false);
    }
  };

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Dedicated font size scale state: allows instant stepping through -- and ++ while reading
  const [fontScaleIndex, setFontScaleIndex] = useState(1);

  const handleDecreaseFontSize = () => {
    chrome.interact();
    if (fontScaleIndex > 0) {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setFontScaleIndex((prev) => prev - 1);
    }
  };

  const handleIncreaseFontSize = () => {
    chrome.interact();
    if (fontScaleIndex < STORYBOOK_FONT_SCALES.length - 1) {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setFontScaleIndex((prev) => prev + 1);
    }
  };

  const currentScale = STORYBOOK_FONT_SCALES[fontScaleIndex];
  const fontStyle = {
    fontSize: currentScale.fontSize,
    lineHeight: currentScale.lineHeight,
  };

  const hasHindi = Boolean(katha.titleHi && katha.bodyHi?.length && katha.phalHi);
  const hasPunjabi = Boolean(katha.titlePa && katha.bodyPa?.length && katha.phalPa);
  const title = activeLanguage === "hi" && katha.titleHi
    ? katha.titleHi
    : activeLanguage === "pa" && katha.titlePa
      ? katha.titlePa
      : katha.title;
  const bodyParagraphs = activeLanguage === "hi" && katha.bodyHi?.length
    ? katha.bodyHi
    : activeLanguage === "pa" && katha.bodyPa?.length
      ? katha.bodyPa
      : katha.body;
  const moralText = activeLanguage === "hi" && katha.phalHi
    ? katha.phalHi
    : activeLanguage === "pa" && katha.phalPa
      ? katha.phalPa
      : katha.phal;

  const totalPages = bodyParagraphs.length;
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  // Niti Treasury: a real save, kept on this device for the signed-in person or guest and cleared at
  // sign-out (lib/nitiTreasury.ts). Moral sharing stays withheld until the story carries a verified,
  // edition-level source for the exact wording shown.
  const treasury = useNitiTreasuryItem({ kind: "panchatantra", id: katha.id });

  const handleSaveNitiTreasury = async () => {
    const result = await treasury.toggle();
    if (!result.ok) {
      // Nothing was written, so the button keeps showing the true state; say so instead of pretending.
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        localizedLabel(activeLanguage, "Couldn't save", "सहेजा नहीं जा सका", "ਸੰਭਾਲਿਆ ਨਹੀਂ ਜਾ ਸਕਿਆ"),
        localizedLabel(activeLanguage, "Please try again.", "कृपया फिर से प्रयास करें।", "ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"),
      );
      return;
    }
    if (Platform.OS === "web") return;
    if (result.saved) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.selectionAsync();
  };

  // Keep page alignment if language changes
  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: safePage * screenWidth,
      animated: false,
    });
  }, [activeLanguage, screenWidth]);

  // Resume where you left off + keep the screen awake (Phase 5).
  const storyCopy = readerCopy(activeLanguage);
  const resume = usePagedResume({
    progressId: `story:${katha.id}`,
    version: activeLanguage,
    page: safePage,
    total: totalPages,
    goTo: (page) => {
      setCurrentPage(page);
      scrollRef.current?.scrollTo({ x: page * screenWidth, animated: false });
    },
    label: (page) => storyCopy.sceneLabel(page + 1),
    resumedText: storyCopy.resumed,
  });

  // Navigate to specific page with smooth scroll & haptics
  const goToPage = (nextIndex: number, animated = true) => {
    if (nextIndex < 0 || nextIndex >= totalPages) return;
    chrome.interact();
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    setCurrentPage(nextIndex);
    scrollRef.current?.scrollTo({
      x: nextIndex * screenWidth,
      animated,
    });
  };

  const textFontFamily = activeLanguage === "hi"
    ? FONTS.devanagari
    : activeLanguage === "pa"
      ? Platform.OS === 'ios' ? 'System' : 'sans-serif'
      : FONTS.serif;
  const headingFontFamily = activeLanguage === "hi"
    ? FONTS.devanagariBold
    : activeLanguage === "pa"
      ? Platform.OS === 'ios' ? 'System' : 'sans-serif'
      : FONTS.serifBold;

  // Parchment palette
  // Page surfaces come from the reader paper tokens (were hard-coded
  // #0A0806/#14100C dark and #FAF6EE light). Overlays drawn on the artwork
  // (white text on dark scrims) stay as they are.
  const screenBg = theme.bg;
  const parchmentBg = isDark ? theme.card : theme.bg;
  const parchmentBorder = theme.border;
  const artHeight = Math.round(screenHeight * 0.45);

  return (
    <View
      style={[styles.screen, { backgroundColor: screenBg }]}
      onTouchStart={onScreenTouchStart}
      onTouchEnd={onScreenTouchEnd}
    >
      {/* ── 1. Floating Semi-Transparent Top Bar with 3.5s Full-Screen Fade ── */}
      <StorybookTopBar
        controlsProgress={controlsProgress}
        controlsVisible={controlsVisible}
        insets={insets}
        palette={palette}
        pinned={pinned}
        togglePin={togglePin}
        onBack={onBack}
        title={title}
        safePage={safePage}
        totalPages={totalPages}
        headingFontFamily={headingFontFamily}
        hasHindi={hasHindi}
        hasPunjabi={hasPunjabi}
        activeLanguage={activeLanguage}
        onLanguageChange={onLanguageChange}
        onTTS={onTTS}
        isSpeaking={isSpeaking}
        isTTSGenerating={isTTSGenerating}
        moralText={moralText}
        bodyParagraphs={bodyParagraphs}
        chrome={chrome}
      />

      {/* ── 2. Full-Screen Horizontal Paging Carousel (Edge-to-Edge) ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          chrome.interact();
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          if (newIndex !== safePage && newIndex >= 0 && newIndex < totalPages) {
            setCurrentPage(newIndex);
            if (Platform.OS !== "web") {
              void Haptics.selectionAsync();
            }
          }
        }}
        style={styles.pagerScrollView}
      >
        {bodyParagraphs.map((paragraph, pageIndex) => {
          const sceneArt = getPanchatantraSceneArtwork(katha.id, pageIndex);
          const isMultiScene = hasDedicatedSceneArtwork(katha.id);
          const isFinalPage = pageIndex === totalPages - 1;
          const framing = MASTERWORK_SCENE_FRAMING[Math.min(pageIndex, MASTERWORK_SCENE_FRAMING.length - 1)];
          const stageInfo = SCENE_STAGE_LABELS[Math.min(pageIndex, SCENE_STAGE_LABELS.length - 1)];

          // Extract drop cap letter for scene 0 or intermediate scenes
          const trimmed = paragraph.trim();
          let dropCap = "";
          let remainderText = trimmed;
          if (trimmed.length > 0) {
            if (trimmed.startsWith('"') || trimmed.startsWith("“")) {
              dropCap = trimmed.slice(0, 2);
              remainderText = trimmed.slice(2);
            } else {
              dropCap = trimmed.charAt(0);
              remainderText = trimmed.slice(1);
            }
          }

          return (
            <View key={pageIndex} style={[styles.pageSlide, { width: screenWidth, height: screenHeight }]}>
              {/* Top: Grand Edge-to-Edge Scene Illustration */}
              <StorybookSceneIllustration
                artHeight={artHeight}
                screenWidth={screenWidth}
                sceneArt={sceneArt}
                isMultiScene={isMultiScene}
                framing={framing}
                title={title}
                pageIndex={pageIndex}
                isFinalPage={isFinalPage}
                activeLanguage={activeLanguage}
                stageInfo={stageInfo}
                parchmentBg={parchmentBg}
                isDark={isDark}
                katha={katha}
                headingFontFamily={headingFontFamily}
                totalPages={totalPages}
              />

              {/* Bottom: Parchment Story Card */}
              <StorybookParchmentCard
                parchmentBg={parchmentBg}
                parchmentBorder={parchmentBorder}
                accent={accent}
                isFinalPage={isFinalPage}
                pageIndex={pageIndex}
                activeLanguage={activeLanguage}
                isDark={isDark}
                handleDecreaseFontSize={handleDecreaseFontSize}
                handleIncreaseFontSize={handleIncreaseFontSize}
                fontScaleIndex={fontScaleIndex}
                currentScale={currentScale}
                fontStyle={fontStyle}
                theme={theme}
                insets={insets}
                paragraph={paragraph}
                headingFontFamily={headingFontFamily}
                textFontFamily={textFontFamily}
                moralText={moralText}
                treasury={treasury}
                handleSaveNitiTreasury={handleSaveNitiTreasury}
                onComplete={onComplete}
                dropCap={dropCap}
                remainderText={remainderText}
              />
            </View>
          );
        })}
      </ScrollView>

      {/* ── 3. Floating Bottom Navigation Bar (Prev / Next & Scene Beads) with 3.5s Full-Screen Fade ── */}
      <StorybookBottomBar
        controlsProgress={controlsProgress}
        controlsVisible={controlsVisible}
        insets={insets}
        palette={palette}
        safePage={safePage}
        totalPages={totalPages}
        activeLanguage={activeLanguage}
        chrome={chrome}
        goToPage={goToPage}
        onComplete={onComplete}
      />

      {/* Resume (Phase 5): "Resumed where you left off · Scene 4 · Start over" */}
      {resume.banner ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 96 }}>
          <PagedResumeBanner
            text={resume.banner}
            startOverLabel={storyCopy.startOver}
            onStartOver={resume.startOver}
            theme={theme}
            accent={accent}
          />
        </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  circleBtnWrapper: {
    borderRadius: 20,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerScrollView: {
    flex: 1,
  },
  pageSlide: {
    flex: 1,
  },
});
