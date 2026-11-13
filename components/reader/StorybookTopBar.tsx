import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Feather from "@expo/vector-icons/Feather";
import type { EdgeInsets } from "react-native-safe-area-context";

import { PressableSurface } from "@/components/ui/PressableSurface";
import { COLORS, FONTS, OVERLAYS, RADII } from "@/lib/constants";
import { localizedLabel } from "@/lib/panchatantraStorybook";
import type { readerControlsPalette } from "@/lib/readerAppearance";
import type { createReaderChromeController } from "@/lib/readerChrome";

type StorybookTopBarProps = {
  controlsProgress: Animated.Value;
  controlsVisible: boolean;
  insets: EdgeInsets;
  palette: ReturnType<typeof readerControlsPalette>;
  pinned: boolean;
  togglePin: () => void;
  onBack: (() => void) | undefined;
  title: string;
  safePage: number;
  totalPages: number;
  headingFontFamily: string;
  hasHindi: boolean;
  hasPunjabi: boolean;
  activeLanguage: 'en' | 'hi' | 'pa';
  onLanguageChange: (lang: 'en' | 'hi' | 'pa') => void;
  onTTS: ((sceneText?: string) => void) | undefined;
  isSpeaking: boolean;
  isTTSGenerating: boolean;
  moralText: string;
  bodyParagraphs: string[];
  chrome: ReturnType<typeof createReaderChromeController>;
};

export function StorybookTopBar({
  controlsProgress,
  controlsVisible,
  insets,
  palette,
  pinned,
  togglePin,
  onBack,
  title,
  safePage,
  totalPages,
  headingFontFamily,
  hasHindi,
  hasPunjabi,
  activeLanguage,
  onLanguageChange,
  onTTS,
  isSpeaking,
  isTTSGenerating,
  moralText,
  bodyParagraphs,
  chrome,
}: StorybookTopBarProps) {
  return (
    <Animated.View
      style={[
        styles.topBar,
        {
          paddingTop: Math.max(insets.top + 6, 12),
          opacity: controlsProgress,
          transform: [
            {
              translateY: controlsProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-80, 0],
              }),
            },
          ],
        },
      ]}
      pointerEvents={controlsVisible ? "auto" : "none"}
    >
      <LinearGradient
        colors={[
          OVERLAYS.black[0.85],
          OVERLAYS.black[0.5],
          "transparent",
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Left: Back Button - Styled like Dharm Veer ReaderTopBar */}
      <PressableSurface
        haptic="selection"
        onPress={() => {
          chrome.interact();
          onBack?.();
        }}
        style={styles.dharmBtnSmall}
        accessibilityRole="button"
        accessibilityLabel="Back to tales"
      >
        <View
          style={[
            styles.dharmBtnSmallInner,
            {
              backgroundColor: palette.well,
              borderColor: palette.border,
            },
          ]}
        >
          <Feather name="chevron-left" size={19} color={palette.accent} />
        </View>
      </PressableSurface>

      {/* Center: Story Title + Scene Pill */}
      <View style={styles.topCenterInfo}>
        <Text
          numberOfLines={1}
          style={[styles.topStoryTitle, { color: COLORS.onMediaWhite, fontFamily: headingFontFamily }]}
        >
          {title}
        </Text>
        <View style={styles.scenePill}>
          <View style={[styles.sceneDot, { backgroundColor: COLORS.brandGold }]} />
          <Text style={[styles.scenePillText, { color: COLORS.brandGold, fontFamily: FONTS.sansSemiBold }]}>
            {safePage === totalPages - 1
              ? localizedLabel(activeLanguage, 'Final Moral', 'कथा बोध', 'ਅੰਤਿਮ ਸਿੱਖਿਆ')
              : localizedLabel(activeLanguage, `Scene ${safePage + 1} of ${totalPages}`, `दृश्य ${safePage + 1} / ${totalPages}`, `ਦ੍ਰਿਸ਼ ${safePage + 1} / ${totalPages}`)}
          </Text>
        </View>
      </View>

      {/* Right: Language Track + Audio Button + Pin/Fullscreen Button */}
      <View style={styles.topRightControls}>
        {hasHindi || hasPunjabi ? (
          <View
            style={[
              styles.langTrack,
              {
                backgroundColor: palette.well,
                borderColor: palette.border,
              },
            ]}
          >
            <PressableSurface
              haptic="selection"
              onPress={() => {
                chrome.interact();
                onLanguageChange("en");
              }}
              style={[
                styles.langSegment,
                activeLanguage === "en" && [styles.langSegmentActive, { backgroundColor: palette.accent }],
              ]}
            >
              <Text
                style={[
                  styles.langSegmentText,
                  {
                    color: activeLanguage === "en" ? palette.onAccent : palette.dim,
                    fontFamily: FONTS.sansSemiBold,
                  },
                ]}
              >
                EN
              </Text>
            </PressableSurface>

            {hasHindi ? (
              <PressableSurface
                haptic="selection"
                onPress={() => {
                  chrome.interact();
                  onLanguageChange("hi");
                }}
                style={[
                  styles.langSegment,
                  activeLanguage === "hi" && [styles.langSegmentActive, { backgroundColor: palette.accent }],
                ]}
              >
                <Text
                  style={[
                    styles.langSegmentText,
                    {
                      color: activeLanguage === "hi" ? palette.onAccent : palette.dim,
                      fontFamily: FONTS.devanagariBold,
                    },
                  ]}
                >
                  हिं
                </Text>
              </PressableSurface>
            ) : null}
            {hasPunjabi ? (
              <PressableSurface
                haptic="selection"
                onPress={() => {
                  chrome.interact();
                  onLanguageChange("pa");
                }}
                style={[
                  styles.langSegment,
                  activeLanguage === "pa" && [styles.langSegmentActive, { backgroundColor: palette.accent }],
                ]}
              >
                <Text
                  style={[
                    styles.langSegmentText,
                    {
                      color: activeLanguage === "pa" ? palette.onAccent : palette.dim,
                      fontFamily: FONTS.sansSemiBold,
                    },
                  ]}
                >
                  ਪੰ
                </Text>
              </PressableSurface>
            ) : null}
          </View>
        ) : null}

        {onTTS ? (
          <PressableSurface
            haptic="selection"
            onPress={() => {
              chrome.interact();
              const isFinal = safePage === totalPages - 1;
              const currentSceneText = isFinal
                ? `${localizedLabel(activeLanguage, 'Moral of the story:', 'कथा का बोध:', 'ਕਥਾ की ਸਿੱਖਿਆ:')} ${moralText}. ${bodyParagraphs[safePage] ?? ''}`
                : safePage === 0
                ? `${title}. ${bodyParagraphs[0] ?? ''}`
                : (bodyParagraphs[safePage] ?? '');
              onTTS(currentSceneText);
            }}
            disabled={isTTSGenerating}
            style={styles.dharmBtnSmall}
            accessibilityRole="button"
            accessibilityLabel={isSpeaking ? "Pause story narration" : "Listen to story"}
          >
            <View
              style={[
                styles.dharmBtnSmallInner,
                {
                  backgroundColor: isSpeaking ? palette.accent : palette.well,
                  borderColor: isSpeaking ? palette.accent : palette.border,
                },
              ]}
            >
              <Feather
                name={isSpeaking ? "square" : "volume-2"}
                size={16}
                color={isSpeaking ? palette.onAccent : palette.accent}
              />
            </View>
          </PressableSurface>
        ) : null}

        {/* Dharm Veer Pin / Fullscreen Toggle Button */}
        <PressableSurface
          haptic="selection"
          onPress={() => {
            chrome.interact();
            togglePin();
          }}
          accessibilityRole="switch"
          accessibilityLabel={pinned ? "Unpin controls" : "Pin controls"}
          accessibilityState={{ checked: pinned }}
          style={styles.dharmBtnSmall}
        >
          <View
            style={[
              styles.dharmBtnSmallInner,
              {
                backgroundColor: pinned ? palette.accent : palette.well,
                borderColor: palette.border,
              },
            ]}
          >
            <Feather
              name={pinned ? "minimize-2" : "maximize-2"}
              size={16}
              color={pinned ? palette.onAccent : palette.accent}
            />
          </View>
        </PressableSurface>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  dharmBtnSmall: {
    borderRadius: 20,
    minHeight: 0,
  },
  dharmBtnSmallInner: {
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
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  langSegmentText: {
    fontSize: 11,
  },
});
