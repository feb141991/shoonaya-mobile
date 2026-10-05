import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { PressableSurface } from "@/components/ui/PressableSurface";
import {
  COLORS,
  FONTS,
  RADII,
  SHADOWS,
  TYPE,
  themeColor,
  KATHA_VIEW_ACCENT,
} from "@/lib/constants";
import {
  getPanchatantraSceneArtwork,
  getPanchatantraArtworkSource,
} from "@/lib/panchatantraArtwork";

export interface StorybookKathaData {
  id: string;
  title: string;
  titleHi?: string;
  preview?: string;
  body: string[];
  bodyHi?: string[];
  phal: string;
  phalHi?: string;
  durationMin: number;
  tags?: string[];
  portrait?: string;
  occasion?: string;
}

interface PanchatantraStorybookViewProps {
  katha: StorybookKathaData;
  activeLanguage: "en" | "hi";
  onLanguageChange: (lang: "en" | "hi") => void;
  onBack?: () => void;
  fontSize?: { fontSize: number; lineHeight: number };
  onTTS?: () => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  onComplete?: () => void;
}

export interface StorybookFontScale {
  label: string;
  fontSize: number;
  lineHeight: number;
  dropCapSize: number;
  dropCapFont: number;
}

export const STORYBOOK_FONT_SCALES: StorybookFontScale[] = [
  { label: "sm", fontSize: 14, lineHeight: 24, dropCapSize: 40, dropCapFont: 24 },
  { label: "md", fontSize: 16.5, lineHeight: 28, dropCapSize: 46, dropCapFont: 27 },
  { label: "lg", fontSize: 19.5, lineHeight: 32, dropCapSize: 52, dropCapFont: 31 },
  { label: "xl", fontSize: 23, lineHeight: 37, dropCapSize: 58, dropCapFont: 35 },
];

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
  const isDark = useColorScheme() === "dark";
  const theme = themeColor(isDark);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const accent = KATHA_VIEW_ACCENT.panchatantra; // warm terracotta #C87850

  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Dedicated font size scale state: allows instant stepping through -- and ++ while reading
  const [fontScaleIndex, setFontScaleIndex] = useState(1);

  const handleDecreaseFontSize = () => {
    if (fontScaleIndex > 0) {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setFontScaleIndex((prev) => prev - 1);
    }
  };

  const handleIncreaseFontSize = () => {
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
  const title = activeLanguage === "hi" && katha.titleHi ? katha.titleHi : katha.title;
  const bodyParagraphs = activeLanguage === "hi" && katha.bodyHi?.length ? katha.bodyHi : katha.body;
  const moralText = activeLanguage === "hi" && katha.phalHi ? katha.phalHi : katha.phal;

  const totalPages = bodyParagraphs.length;
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  // Keep page alignment if language changes
  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: safePage * screenWidth,
      animated: false,
    });
  }, [activeLanguage, screenWidth]);

  // Navigate to specific page with smooth scroll & haptics
  const goToPage = (nextIndex: number, animated = true) => {
    if (nextIndex < 0 || nextIndex >= totalPages) return;
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    setCurrentPage(nextIndex);
    scrollRef.current?.scrollTo({
      x: nextIndex * screenWidth,
      animated,
    });
  };

  const textFontFamily = activeLanguage === "hi" ? FONTS.devanagari : FONTS.serif;
  const headingFontFamily = activeLanguage === "hi" ? FONTS.devanagariBold : FONTS.serifBold;

  // Parchment palette
  const screenBg = isDark ? "#0A0806" : "#FAF6EE";
  const parchmentBg = isDark ? "#14100C" : "#FAF6EE";
  const parchmentBorder = isDark ? "rgba(197,160,89,0.22)" : "rgba(216,138,28,0.24)";
  const artHeight = Math.round(screenHeight * 0.45);

  return (
    <View style={[styles.screen, { backgroundColor: screenBg }]}>
      {/* ── 1. Floating Semi-Transparent Top Bar ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + 6, 12),
          },
        ]}
      >
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.8)",
            "rgba(0,0,0,0.45)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Left: Back Button */}
        <PressableSurface
          haptic="selection"
          onPress={onBack}
          style={styles.circleBtnWrapper}
          accessibilityLabel="Back to tales"
        >
          <View
            style={[
              styles.circleBtn,
              {
                backgroundColor: "rgba(0,0,0,0.4)",
                borderColor: "rgba(255,255,255,0.25)",
              },
            ]}
          >
            <Feather name="chevron-left" size={20} color="#FFFFFF" />
          </View>
        </PressableSurface>

        {/* Center: Story Title + Scene Pill */}
        <View style={styles.topCenterInfo}>
          <Text
            numberOfLines={1}
            style={[styles.topStoryTitle, { color: "#FFFFFF", fontFamily: headingFontFamily }]}
          >
            {title}
          </Text>
          <View style={styles.scenePill}>
            <View style={[styles.sceneDot, { backgroundColor: COLORS.brandGold }]} />
            <Text style={[styles.scenePillText, { color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }]}>
              {safePage === totalPages - 1
                ? activeLanguage === "hi"
                  ? "कथा बोध"
                  : "Final Moral"
                : activeLanguage === "hi"
                ? `दृश्य ${safePage + 1} / ${totalPages}`
                : `Scene ${safePage + 1} of ${totalPages}`}
            </Text>
          </View>
        </View>

        {/* Right: Language Pill [EN | HI] + Narrator Audio Button */}
        <View style={styles.topRightControls}>
          {hasHindi ? (
            <View
              style={[
                styles.langTrack,
                {
                  backgroundColor: "rgba(0,0,0,0.4)",
                  borderColor: "rgba(255,255,255,0.25)",
                },
              ]}
            >
              <PressableSurface
                haptic="selection"
                onPress={() => onLanguageChange("en")}
                style={[
                  styles.langSegment,
                  activeLanguage === "en" && [styles.langSegmentActive, { backgroundColor: accent }],
                ]}
              >
                <Text
                  style={[
                    styles.langSegmentText,
                    {
                      color: "#FFFFFF",
                      fontFamily: FONTS.sansSemiBold,
                    },
                  ]}
                >
                  EN
                </Text>
              </PressableSurface>

              <PressableSurface
                haptic="selection"
                onPress={() => onLanguageChange("hi")}
                style={[
                  styles.langSegment,
                  activeLanguage === "hi" && [styles.langSegmentActive, { backgroundColor: accent }],
                ]}
              >
                <Text
                  style={[
                    styles.langSegmentText,
                    {
                      color: "#FFFFFF",
                      fontFamily: FONTS.devanagariBold,
                    },
                  ]}
                >
                  हिं
                </Text>
              </PressableSurface>
            </View>
          ) : null}

          {onTTS ? (
            <PressableSurface
              haptic="selection"
              onPress={onTTS}
              disabled={isTTSGenerating}
              style={styles.circleBtnWrapper}
              accessibilityLabel={isSpeaking ? "Pause story narration" : "Listen to story"}
            >
              <View
                style={[
                  styles.circleBtn,
                  isSpeaking
                    ? {
                        backgroundColor: accent,
                        borderColor: accent,
                        shadowColor: accent,
                        shadowOpacity: 0.45,
                        shadowRadius: 8,
                        elevation: 4,
                      }
                    : {
                        backgroundColor: "rgba(0,0,0,0.4)",
                        borderColor: "rgba(255,255,255,0.25)",
                      },
                ]}
              >
                <Feather
                  name={isSpeaking ? "square" : "volume-2"}
                  size={16}
                  color={isSpeaking ? "#FFFFFF" : COLORS.brandGold}
                />
              </View>
            </PressableSurface>
          ) : null}
        </View>
      </View>

      {/* ── 2. Full-Screen Horizontal Paging Carousel (Edge-to-Edge) ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
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
          const isFinalPage = pageIndex === totalPages - 1;

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
              <View style={[styles.illustrationStage, { height: artHeight, width: screenWidth }]}>
                {sceneArt ? (
                  <View style={StyleSheet.absoluteFill}>
                    <Image
                      source={sceneArt}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      contentPosition="center"
                      priority="high"
                      cachePolicy="memory-disk"
                      transition={250}
                      accessibilityLabel={`${title} scene ${pageIndex + 1}`}
                    />

                    {/* Ornate Gold Filigree Corners */}
                    <View style={[styles.cornerFiligree, styles.cornerTL]}>
                      <Text style={styles.filigreeSymbol}>❦</Text>
                    </View>
                    <View style={[styles.cornerFiligree, styles.cornerTR]}>
                      <Text style={styles.filigreeSymbol}>❦</Text>
                    </View>

                    {/* Scene Badge On Image */}
                    <View style={styles.imageSceneBadge}>
                      <Text style={styles.imageSceneBadgeText}>
                        {isFinalPage
                          ? activeLanguage === "hi"
                            ? "कथा बोध"
                            : "WISDOM MORAL"
                          : activeLanguage === "hi"
                          ? `दृश्य ${pageIndex + 1} / ${totalPages}`
                          : `SCENE ${pageIndex + 1} OF ${totalPages}`}
                      </Text>
                    </View>

                    {/* Bottom Vignette Gradients blending into parchment below */}
                    <LinearGradient
                      colors={[
                        "transparent",
                        isDark ? "rgba(20,16,12,0.4)" : "rgba(250,246,238,0.4)",
                        parchmentBg,
                      ]}
                      style={styles.imageBottomVignette}
                      pointerEvents="none"
                    />
                  </View>
                ) : (
                  /* Authentic Indian Manuscript Folio Bookplate for unillustrated tales */
                  <View
                    style={[
                      styles.folioBookplate,
                      {
                        backgroundColor: isDark ? "#17120D" : "#241810",
                      },
                    ]}
                  >
                    <View style={styles.folioInnerBorder}>
                      <View style={styles.folioHeader}>
                        <Text style={styles.folioHeaderSymbol}>✦</Text>
                        <Text style={[styles.folioHeaderText, { fontFamily: FONTS.devanagariBold }]}>
                          पञ्चतन्त्र नीति कथा · दृश्य {pageIndex + 1}
                        </Text>
                        <Text style={styles.folioHeaderSymbol}>✦</Text>
                      </View>

                      <View style={styles.folioMedallion}>
                        <Text style={styles.folioMedallionEmoji}>{katha.portrait ?? "📜"}</Text>
                      </View>

                      <Text numberOfLines={2} style={[styles.folioTitle, { fontFamily: headingFontFamily }]}>
                        {title}
                      </Text>

                      <View style={styles.folioBottomBanner}>
                        <Text style={[styles.folioSubtext, { fontFamily: FONTS.sansSemiBold }]}>
                          ANCIENT INDIAN WISDOM FABLE
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Bottom: Parchment Story Card */}
              <View
                style={[
                  styles.parchmentPage,
                  {
                    backgroundColor: parchmentBg,
                    borderTopColor: parchmentBorder,
                  },
                ]}
              >
                {/* Parchment Subheader with Scene Tag and [-- A ++] Font Controls */}
                <View style={styles.parchmentHeaderBar}>
                  <Text style={[styles.parchmentSceneTag, { color: accent, fontFamily: FONTS.sansSemiBold }]}>
                    {isFinalPage
                      ? activeLanguage === "hi"
                        ? "कथा का फल (बोध)"
                        : "WISDOM FRUIT"
                      : activeLanguage === "hi"
                      ? `दृश्य ${pageIndex + 1}`
                      : `SCENE ${pageIndex + 1}`}
                  </Text>

                  <View
                    style={[
                      styles.fontScalerPill,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                        borderColor: isDark ? "rgba(197,160,89,0.3)" : "rgba(200,160,110,0.3)",
                      },
                    ]}
                  >
                    <PressableSurface
                      haptic="selection"
                      onPress={handleDecreaseFontSize}
                      disabled={fontScaleIndex === 0}
                      accessibilityLabel="Decrease text size (--)"
                      style={[styles.fontScaleBtn, fontScaleIndex === 0 && { opacity: 0.28 }]}
                    >
                      <Text style={[styles.fontScaleSign, { color: theme.text, fontFamily: FONTS.sansSemiBold }]}>
                        --
                      </Text>
                    </PressableSurface>

                    <View
                      style={[
                        styles.fontScaleDivider,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" },
                      ]}
                    />

                    <View style={styles.fontScaleCenterBadge}>
                      <Text style={[styles.fontScaleBadgeText, { color: accent, fontFamily: FONTS.serifBold }]}>
                        A
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.fontScaleDivider,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" },
                      ]}
                    />

                    <PressableSurface
                      haptic="selection"
                      onPress={handleIncreaseFontSize}
                      disabled={fontScaleIndex === STORYBOOK_FONT_SCALES.length - 1}
                      accessibilityLabel="Increase text size (++)"
                      style={[styles.fontScaleBtn, fontScaleIndex === STORYBOOK_FONT_SCALES.length - 1 && { opacity: 0.28 }]}
                    >
                      <Text style={[styles.fontScaleSign, { color: theme.text, fontFamily: FONTS.sansSemiBold }]}>
                        ++
                      </Text>
                    </PressableSurface>
                  </View>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.parchmentScrollContent,
                    { paddingBottom: insets.bottom + 70 },
                  ]}
                  bounces={false}
                >
                  {isFinalPage ? (
                    /* Final Moral Celebration Screen */
                    <View style={styles.moralCelebrationContainer}>
                      <View style={[styles.moralSealBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}45` }]}>
                        <View style={[styles.moralSealInner, { backgroundColor: `${accent}25` }]}>
                          <Feather name="award" size={24} color={accent} />
                        </View>
                        <Text style={[styles.moralSealTag, { color: accent, fontFamily: FONTS.sansSemiBold }]}>
                          {activeLanguage === "hi" ? "कथा का फल (बोध)" : "THE WISDOM FRUIT"}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.moralParagraph,
                          {
                            color: theme.text,
                            fontFamily: headingFontFamily,
                            fontSize: fontStyle.fontSize + 2,
                            lineHeight: fontStyle.lineHeight + 4,
                          },
                        ]}
                      >
                        “{moralText}”
                      </Text>

                      <Text
                        style={[
                          styles.moralClosingBody,
                          {
                            color: theme.dim,
                            fontFamily: textFontFamily,
                            fontSize: fontStyle.fontSize - 1,
                            lineHeight: fontStyle.lineHeight - 1,
                          },
                        ]}
                      >
                        {paragraph}
                      </Text>

                      {onComplete ? (
                        <PressableSurface
                          haptic="impact"
                          onPress={onComplete}
                          style={styles.completeStoryBtnWrap}
                        >
                          <View style={[styles.completeStoryBtn, { backgroundColor: accent }]}>
                            <Feather name="check-circle" size={18} color="#FFFFFF" />
                            <Text style={[styles.completeStoryBtnText, { fontFamily: FONTS.sansSemiBold }]}>
                              {activeLanguage === "hi" ? "कथा पूर्ण करें" : "Complete Tale & Earn Karma"}
                            </Text>
                          </View>
                        </PressableSurface>
                      ) : null}
                    </View>
                  ) : (
                    /* Standard Story Scene with Drop Cap */
                    <View style={styles.sceneBodyWrapper}>
                      {pageIndex === 0 && dropCap ? (
                        <View style={styles.dropCapRow}>
                          <View
                            style={[
                              styles.dropCapBox,
                              {
                                width: currentScale.dropCapSize,
                                height: currentScale.dropCapSize,
                                backgroundColor: `${accent}16`,
                                borderColor: `${accent}40`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropCapLetter,
                                {
                                  fontSize: currentScale.dropCapFont,
                                  lineHeight: currentScale.dropCapSize - 8,
                                  color: accent,
                                  fontFamily: headingFontFamily,
                                },
                              ]}
                            >
                              {dropCap}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.bodyText,
                              {
                                color: theme.text,
                                fontFamily: textFontFamily,
                                fontSize: fontStyle.fontSize,
                                lineHeight: fontStyle.lineHeight,
                              },
                            ]}
                          >
                            {remainderText}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.bodyText,
                            {
                              color: theme.text,
                              fontFamily: textFontFamily,
                              fontSize: fontStyle.fontSize,
                              lineHeight: fontStyle.lineHeight,
                            },
                          ]}
                        >
                          {paragraph}
                        </Text>
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── 3. Floating Bottom Navigation Bar (Prev / Next & Scene Beads) ── */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom + 8, 22),
          },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            isDark ? "rgba(10,8,6,0.85)" : "rgba(250,246,238,0.88)",
            isDark ? "rgba(10,8,6,0.98)" : "rgba(250,246,238,0.98)",
          ]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Left: Prev Scene */}
        <PressableSurface
          haptic="selection"
          onPress={() => goToPage(safePage - 1)}
          disabled={safePage === 0}
          style={{ opacity: safePage === 0 ? 0.2 : 1 }}
          accessibilityLabel="Previous scene"
        >
          <View
            style={[
              styles.navMiniBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                borderColor: isDark ? "rgba(197,160,89,0.3)" : "rgba(200,160,110,0.3)",
              },
            ]}
          >
            <Feather name="chevron-left" size={17} color={theme.text} />
            <Text style={[styles.navMiniText, { color: theme.text, fontFamily: FONTS.sansSemiBold }]}>
              Prev
            </Text>
          </View>
        </PressableSurface>

        {/* Center: 6 Illuminated Scene Beads */}
        <View style={styles.beadsRow}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PressableSurface
              key={i}
              onPress={() => goToPage(i)}
              style={styles.beadTouch}
              accessibilityLabel={`Go to page ${i + 1}`}
            >
              <View
                style={[
                  styles.beadDot,
                  {
                    backgroundColor: i === safePage ? accent : `${theme.dim}40`,
                    width: i === safePage ? 22 : 6,
                  },
                ]}
              />
            </PressableSurface>
          ))}
        </View>

        {/* Right: Next Scene / Complete */}
        {safePage < totalPages - 1 ? (
          <PressableSurface
            haptic="selection"
            onPress={() => goToPage(safePage + 1)}
            accessibilityLabel="Next scene"
          >
            <View style={[styles.navMiniBtn, styles.navMiniBtnActive, { backgroundColor: accent }]}>
              <Text style={[styles.navMiniText, { color: "#FFFFFF", fontFamily: FONTS.sansSemiBold }]}>
                Next
              </Text>
              <Feather name="chevron-right" size={17} color="#FFFFFF" />
            </View>
          </PressableSurface>
        ) : (
          <PressableSurface
            haptic="impact"
            onPress={onComplete}
            accessibilityLabel="Finish story"
          >
            <View style={[styles.navMiniBtn, styles.navMiniBtnActive, { backgroundColor: accent }]}>
              <Feather name="check" size={15} color="#FFFFFF" />
              <Text style={[styles.navMiniText, { color: "#FFFFFF", fontFamily: FONTS.sansSemiBold }]}>
                Done
              </Text>
            </View>
          </PressableSurface>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  topCenterInfo: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  topStoryTitle: {
    fontSize: 14.5,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  scenePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  sceneDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  scenePillText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langTrack: {
    flexDirection: "row",
    borderRadius: RADII.pill,
    borderWidth: 1,
    padding: 2,
    alignItems: "center",
  },
  langSegment: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: RADII.pill,
  },
  langSegmentActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  langSegmentText: {
    fontSize: 11,
  },
  pagerScrollView: {
    flex: 1,
  },
  pageSlide: {
    flex: 1,
  },
  illustrationStage: {
    overflow: "hidden",
    position: "relative",
  },
  imageBottomVignette: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  cornerFiligree: {
    position: "absolute",
    zIndex: 10,
    padding: 6,
  },
  cornerTL: { top: 52, left: 10 },
  cornerTR: { top: 52, right: 10 },
  filigreeSymbol: {
    color: "rgba(216,138,28,0.75)",
    fontSize: 14,
  },
  imageSceneBadge: {
    position: "absolute",
    bottom: 12,
    left: 14,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  imageSceneBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: FONTS.sansSemiBold,
    textTransform: "uppercase",
  },
  folioBookplate: {
    ...StyleSheet.absoluteFill,
    padding: 16,
    paddingTop: 60,
    justifyContent: "center",
  },
  folioInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(216,138,28,0.35)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  folioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  folioHeaderSymbol: {
    color: "#D88A1C",
    fontSize: 10,
  },
  folioHeaderText: {
    color: "#D88A1C",
    fontSize: 12,
    letterSpacing: 1,
  },
  folioMedallion: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: "rgba(216,138,28,0.5)",
    backgroundColor: "rgba(216,138,28,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  folioMedallionEmoji: {
    fontSize: 36,
  },
  folioTitle: {
    color: "#FAF6EE",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 4,
    paddingHorizontal: 12,
  },
  folioBottomBanner: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(216,138,28,0.14)",
    borderWidth: 1,
    borderColor: "rgba(216,138,28,0.25)",
  },
  folioSubtext: {
    color: "#D88A1C",
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  parchmentPage: {
    flex: 1,
    borderTopWidth: 1,
  },
  parchmentHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    zIndex: 15,
  },
  parchmentSceneTag: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  fontScalerPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: RADII.pill,
    height: 30,
    paddingHorizontal: 4,
  },
  fontScaleBtn: {
    paddingHorizontal: 8,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  fontScaleSign: {
    fontSize: 13,
    letterSpacing: -0.5,
  },
  fontScaleCenterBadge: {
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  fontScaleBadgeText: {
    fontSize: 12,
  },
  fontScaleDivider: {
    width: 1,
    height: 14,
  },
  parchmentScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: "center",
  },
  sceneBodyWrapper: {
    justifyContent: "center",
  },
  dropCapRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dropCapBox: {
    width: 44,
    height: 44,
    borderRadius: RADII.xs,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dropCapLetter: {
    fontSize: 26,
    lineHeight: 32,
  },
  bodyText: {
    flex: 1,
    letterSpacing: 0.15,
  },
  moralCelebrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 10,
  },
  moralSealBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  moralSealInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  moralSealTag: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  moralParagraph: {
    textAlign: "center",
    letterSpacing: -0.2,
    paddingHorizontal: 8,
  },
  moralClosingBody: {
    textAlign: "center",
    paddingHorizontal: 12,
    opacity: 0.85,
  },
  completeStoryBtnWrap: {
    borderRadius: RADII.pill,
    marginTop: 6,
  },
  completeStoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: RADII.pill,
  },
  completeStoryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  navMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  navMiniBtnActive: {
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  navMiniText: {
    fontSize: 12,
  },
  beadsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  beadTouch: {
    padding: 4,
  },
  beadDot: {
    height: 5,
    borderRadius: 2.5,
  },
});
