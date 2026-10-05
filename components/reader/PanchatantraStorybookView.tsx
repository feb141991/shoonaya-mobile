import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
  PanResponder,
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
import { getPanchatantraArtworkSource } from "@/lib/panchatantraArtwork";

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

// Scene camera focal points per page (0 to 5) for subtle Ken Burns cinematography
const SCENE_FRAMING = [
  { scale: 1.0, translateX: 0, translateY: 0 },
  { scale: 1.12, translateX: -6, translateY: -8 },
  { scale: 1.18, translateX: 6, translateY: 6 },
  { scale: 1.15, translateX: 8, translateY: -4 },
  { scale: 1.08, translateX: -4, translateY: 4 },
  { scale: 1.0, translateX: 0, translateY: 0 },
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
  const screenDimensions = Dimensions.get("window");
  const accent = KATHA_VIEW_ACCENT.panchatantra; // #C87850 warm terracotta

  // Current page state (0-indexed, 0 to body.length - 1)
  const [currentPage, setCurrentPage] = useState(0);

  const hasHindi = Boolean(katha.titleHi && katha.bodyHi?.length && katha.phalHi);
  const title = activeLanguage === "hi" && katha.titleHi ? katha.titleHi : katha.title;
  const bodyParagraphs = activeLanguage === "hi" && katha.bodyHi?.length ? katha.bodyHi : katha.body;
  const moralText = activeLanguage === "hi" && katha.phalHi ? katha.phalHi : katha.phal;

  const totalPages = bodyParagraphs.length;
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const currentParagraph = bodyParagraphs[safePage] ?? "";

  const artworkSource = useMemo(() => getPanchatantraArtworkSource(katha.id), [katha.id]);

  // Animated values for page turn transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Scene camera animation values
  const cameraScale = useRef(new Animated.Value(1.0)).current;
  const cameraX = useRef(new Animated.Value(0)).current;
  const cameraY = useRef(new Animated.Value(0)).current;

  // Trigger smooth transition whenever page changes
  useEffect(() => {
    const framing = SCENE_FRAMING[safePage % SCENE_FRAMING.length];

    // Smooth page content cross-fade
    fadeAnim.setValue(0.35);
    slideAnim.setValue(12);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(cameraScale, {
        toValue: framing.scale,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(cameraX, {
        toValue: framing.translateX,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(cameraY, {
        toValue: framing.translateY,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, [safePage]);

  // Change page with optional haptics
  const goToPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    setCurrentPage(nextPage);
  };

  // Horizontal Swipe Gestures on the Book Canvas
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -36) {
          // Swipe Left -> Next Page
          if (safePage < totalPages - 1) {
            goToPage(safePage + 1);
          }
        } else if (gestureState.dx > 36) {
          // Swipe Right -> Previous Page
          if (safePage > 0) {
            goToPage(safePage - 1);
          }
        }
      },
    })
  ).current;

  // Extract illuminated drop cap letter and remainder of text
  const { dropCap, remainderText } = useMemo(() => {
    if (!currentParagraph || currentParagraph.length === 0) {
      return { dropCap: "", remainderText: "" };
    }
    const trimmed = currentParagraph.trim();
    if (trimmed.startsWith('"') || trimmed.startsWith('“')) {
      const cap = trimmed.slice(0, 2);
      return { dropCap: cap, remainderText: trimmed.slice(2) };
    }
    const cap = trimmed.charAt(0);
    return { dropCap: cap, remainderText: trimmed.slice(1) };
  }, [currentParagraph]);

  const fontStyle = fontSize ?? { fontSize: 16.5, lineHeight: 28 };
  const textFontFamily = activeLanguage === "hi" ? FONTS.devanagari : FONTS.serif;
  const headingFontFamily = activeLanguage === "hi" ? FONTS.devanagariBold : FONTS.serifBold;

  // Parchment palette tokens
  const parchmentBg = isDark ? "#18130E" : "#FAF6EE";
  const parchmentBorder = isDark ? "rgba(197,160,89,0.24)" : "rgba(216,138,28,0.22)";
  const shadowValue = isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light;

  // Calculate dynamic responsive artwork height (fits 38% of screen height for proper book sizing)
  const artHeight = Math.min(340, Math.max(230, Math.round(screenDimensions.height * 0.38)));

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? "#0E0B08" : "#F4EFE6" }]}>
      {/* ── 1. Smart Minimal Floating Top Bar (Height: 44px, Zero Clutter) ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top + 4, 10),
            borderBottomColor: isDark ? "rgba(197,160,89,0.15)" : "rgba(200,160,110,0.18)",
          },
        ]}
      >
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
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                borderColor: isDark ? "rgba(197,160,89,0.25)" : "rgba(200,160,110,0.3)",
              },
            ]}
          >
            <Feather name="chevron-left" size={20} color={theme.text} />
          </View>
        </PressableSurface>

        {/* Center: Story Title + Scene Pill */}
        <View style={styles.topCenterInfo}>
          <Text
            numberOfLines={1}
            style={[styles.topStoryTitle, { color: theme.text, fontFamily: headingFontFamily }]}
          >
            {title}
          </Text>
          <View style={styles.scenePill}>
            <View style={[styles.sceneDot, { backgroundColor: accent }]} />
            <Text style={[styles.scenePillText, { color: accent, fontFamily: FONTS.sansSemiBold }]}>
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
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  borderColor: isDark ? "rgba(197,160,89,0.25)" : "rgba(200,160,110,0.25)",
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
                      color: activeLanguage === "en" ? "#FFFFFF" : theme.dim,
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
                      color: activeLanguage === "hi" ? "#FFFFFF" : theme.dim,
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
                        backgroundColor: `${accent}16`,
                        borderColor: `${accent}35`,
                      },
                ]}
              >
                <Feather
                  name={isSpeaking ? "square" : "volume-2"}
                  size={16}
                  color={isSpeaking ? "#FFFFFF" : accent}
                />
              </View>
            </PressableSurface>
          ) : null}
        </View>
      </View>

      {/* ── 2. The Main Interactive Book Canvas (Swipeable) ── */}
      <View style={styles.bookCanvas} {...panResponder.panHandlers}>
        {/* Top: Book-Style Illustration Stage */}
        <View
          style={[
            styles.illustrationStage,
            {
              height: artHeight,
              borderColor: isDark ? "rgba(216,138,28,0.38)" : "rgba(216,138,28,0.45)",
              boxShadow: shadowValue,
            },
          ]}
        >
          {artworkSource ? (
            <View style={styles.artworkContainer}>
              <Animated.View
                style={[
                  styles.animatedArtLayer,
                  {
                    transform: [
                      { scale: cameraScale },
                      { translateX: cameraX },
                      { translateY: cameraY },
                    ],
                  },
                ]}
              >
                <Image
                  source={artworkSource}
                  style={styles.fullArtImage}
                  contentFit="cover"
                  contentPosition="center"
                  priority="high"
                  cachePolicy="memory-disk"
                  transition={250}
                  accessibilityLabel={`${title} illustration scene`}
                />
              </Animated.View>

              {/* Ornate Gold Filigree Corners */}
              <View style={[styles.cornerFiligree, styles.cornerTL]}>
                <Text style={styles.filigreeSymbol}>❦</Text>
              </View>
              <View style={[styles.cornerFiligree, styles.cornerTR]}>
                <Text style={styles.filigreeSymbol}>❦</Text>
              </View>
              <View style={[styles.cornerFiligree, styles.cornerBL]}>
                <Text style={styles.filigreeSymbol}>❦</Text>
              </View>
              <View style={[styles.cornerFiligree, styles.cornerBR]}>
                <Text style={styles.filigreeSymbol}>❦</Text>
              </View>

              <LinearGradient
                colors={["rgba(0,0,0,0.1)", "transparent", isDark ? "rgba(14,11,8,0.7)" : "rgba(244,239,230,0.6)"]}
                style={styles.artGradientOverlay}
                pointerEvents="none"
              />
            </View>
          ) : (
            /* Traditional Indian Folio Bookplate for stories without JPG */
            <View
              style={[
                styles.folioBookplate,
                {
                  backgroundColor: isDark ? "#17120D" : "#241810",
                  borderColor: "rgba(216,138,28,0.4)",
                },
              ]}
            >
              {/* Decorative Indian Manuscript Border */}
              <View style={styles.folioInnerBorder}>
                <View style={styles.folioHeader}>
                  <Text style={styles.folioHeaderSymbol}>✦</Text>
                  <Text style={[styles.folioHeaderText, { fontFamily: FONTS.devanagariBold }]}>
                    पञ्चतन्त्र नीति कथा
                  </Text>
                  <Text style={styles.folioHeaderSymbol}>✦</Text>
                </View>

                {/* Central Gilded Medallion */}
                <View style={styles.folioMedallionGlow}>
                  <View style={styles.folioMedallion}>
                    <Text style={styles.folioMedallionEmoji}>{katha.portrait ?? "📜"}</Text>
                  </View>
                </View>

                {/* Title in Folio */}
                <Text
                  numberOfLines={2}
                  style={[styles.folioTitle, { fontFamily: headingFontFamily }]}
                >
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
        <Animated.View
          style={[
            styles.parchmentPage,
            {
              backgroundColor: parchmentBg,
              borderColor: parchmentBorder,
              boxShadow: shadowValue,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.parchmentScrollContent}
            bounces={false}
          >
            {safePage === totalPages - 1 ? (
              /* Final Moral Celebration Screen */
              <View style={styles.moralCelebrationContainer}>
                <View style={[styles.moralSealBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}45` }]}>
                  <View style={[styles.moralSealInner, { backgroundColor: `${accent}25` }]}>
                    <Feather name="award" size={26} color={accent} />
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
                      fontSize: fontStyle.fontSize - 1.5,
                      lineHeight: fontStyle.lineHeight - 2,
                    },
                  ]}
                >
                  {currentParagraph}
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
                {safePage === 0 && dropCap ? (
                  <View style={styles.dropCapRow}>
                    <View
                      style={[
                        styles.dropCapBox,
                        {
                          backgroundColor: `${accent}16`,
                          borderColor: `${accent}40`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropCapLetter,
                          { color: accent, fontFamily: headingFontFamily },
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
                    {currentParagraph}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* ── 3. Ultra-Slim Smart Bottom Bar (Height: 44px, Zero Clutter) ── */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            borderTopColor: isDark ? "rgba(197,160,89,0.15)" : "rgba(200,160,110,0.18)",
          },
        ]}
      >
        {/* Left Arrow: Previous Scene */}
        <PressableSurface
          haptic="selection"
          onPress={() => goToPage(safePage - 1)}
          disabled={safePage === 0}
          style={{ opacity: safePage === 0 ? 0.25 : 1 }}
          accessibilityLabel="Previous scene"
        >
          <View
            style={[
              styles.navMiniBtn,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                borderColor: isDark ? "rgba(197,160,89,0.25)" : "rgba(200,160,110,0.25)",
              },
            ]}
          >
            <Feather name="chevron-left" size={18} color={theme.text} />
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
                    backgroundColor: i === safePage ? accent : `${theme.dim}35`,
                    width: i === safePage ? 20 : 6,
                  },
                ]}
              />
            </PressableSurface>
          ))}
        </View>

        {/* Right Arrow: Next Scene / Complete */}
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
              <Feather name="chevron-right" size={18} color="#FFFFFF" />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  circleBtnWrapper: {
    borderRadius: 20,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 15,
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
    fontSize: 10.5,
    letterSpacing: 0.5,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  bookCanvas: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 12,
  },
  illustrationStage: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },
  artworkContainer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  animatedArtLayer: {
    ...StyleSheet.absoluteFill,
  },
  fullArtImage: {
    ...StyleSheet.absoluteFill,
  },
  artGradientOverlay: {
    ...StyleSheet.absoluteFill,
  },
  cornerFiligree: {
    position: "absolute",
    zIndex: 5,
    padding: 4,
  },
  cornerTL: { top: 4, left: 6 },
  cornerTR: { top: 4, right: 6 },
  cornerBL: { bottom: 4, left: 6 },
  cornerBR: { bottom: 4, right: 6 },
  filigreeSymbol: {
    color: "rgba(216,138,28,0.7)",
    fontSize: 13,
  },
  folioBookplate: {
    ...StyleSheet.absoluteFill,
    padding: 10,
  },
  folioInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(216,138,28,0.3)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  folioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
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
  folioMedallionGlow: {
    marginVertical: 8,
  },
  folioMedallion: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: "rgba(216,138,28,0.5)",
    backgroundColor: "rgba(216,138,28,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  folioMedallionEmoji: {
    fontSize: 34,
  },
  folioTitle: {
    color: "#FAF6EE",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 4,
  },
  folioBottomBanner: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(216,138,28,0.12)",
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
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  parchmentScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    paddingVertical: 8,
    gap: 12,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  moralSealTag: {
    fontSize: 11,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    zIndex: 10,
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
