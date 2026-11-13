import { Animated, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { EdgeInsets } from "react-native-safe-area-context";

import { PressableSurface } from "@/components/ui/PressableSurface";
import { FONTS, RADII } from "@/lib/constants";
import { localizedLabel } from "@/lib/panchatantraStorybook";
import type { readerControlsPalette } from "@/lib/readerAppearance";
import type { createReaderChromeController } from "@/lib/readerChrome";

type StorybookBottomBarProps = {
  controlsProgress: Animated.Value;
  controlsVisible: boolean;
  insets: EdgeInsets;
  palette: ReturnType<typeof readerControlsPalette>;
  safePage: number;
  totalPages: number;
  activeLanguage: 'en' | 'hi' | 'pa';
  chrome: ReturnType<typeof createReaderChromeController>;
  goToPage: (nextIndex: number, animated?: boolean) => void;
  onComplete: (() => void) | undefined;
};

export function StorybookBottomBar({
  controlsProgress,
  controlsVisible,
  insets,
  palette,
  safePage,
  totalPages,
  activeLanguage,
  chrome,
  goToPage,
  onComplete,
}: StorybookBottomBarProps) {
  return (
    <Animated.View
      style={[
        styles.bottomBar,
        {
          paddingBottom: Math.max(insets.bottom + 8, 22),
          opacity: controlsProgress,
          transform: [
            {
              translateY: controlsProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0],
              }),
            },
          ],
        },
      ]}
      pointerEvents={controlsVisible ? "auto" : "none"}
    >
      <View
        style={[
          styles.capsuleBar,
          {
            backgroundColor: palette.capsule,
            borderColor: palette.glassBorder,
            boxShadow: palette.floatingShadow,
          },
        ]}
      >
        {/* Left: Prev Scene Button */}
        <PressableSurface
          haptic="selection"
          onPress={() => {
            chrome.interact();
            goToPage(safePage - 1);
          }}
          disabled={safePage === 0}
          style={{ opacity: safePage === 0 ? 0.3 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Previous scene"
        >
          <View
            style={[
              styles.capsuleBtn,
              {
                backgroundColor: palette.well,
                borderColor: palette.border,
              },
            ]}
          >
            <Feather name="chevron-left" size={16} color={palette.accent} />
            <Text style={[styles.capsuleBtnText, { color: palette.text, fontFamily: FONTS.sansSemiBold }]}>
              Prev
            </Text>
          </View>
        </PressableSurface>

        {/* Center: 6 Illuminated Scene Beads */}
        <View style={styles.beadsRow}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <PressableSurface
              key={i}
              onPress={() => {
                chrome.interact();
                goToPage(i);
              }}
              style={styles.beadTouch}
              accessibilityRole="button"
              accessibilityLabel={`Go to page ${i + 1}`}
            >
              <View
                style={[
                  styles.beadDot,
                  {
                    backgroundColor: i === safePage ? palette.accent : `${palette.dim}45`,
                    width: i === safePage ? 20 : 6,
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
            onPress={() => {
              chrome.interact();
              goToPage(safePage + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Next scene"
          >
            <View
              style={[
                styles.capsuleBtn,
                {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
              ]}
            >
              <Text style={[styles.capsuleBtnText, { color: palette.onAccent, fontFamily: FONTS.sansSemiBold }]}>
                Next
              </Text>
              <Feather name="chevron-right" size={16} color={palette.onAccent} />
            </View>
          </PressableSurface>
        ) : (
          <PressableSurface
            haptic="impact"
            onPress={() => {
              chrome.interact();
              onComplete?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Finish story"
          >
            <View
              style={[
                styles.capsuleBtn,
                {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent,
                },
              ]}
            >
              <Feather name="check" size={15} color={palette.onAccent} />
              <Text style={[styles.capsuleBtnText, { color: palette.onAccent, fontFamily: FONTS.sansSemiBold }]}>
                {localizedLabel(activeLanguage, "Done", "पूर्ण", "ਸਮਾਪਤ")}
              </Text>
            </View>
          </PressableSurface>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  capsuleBar: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  capsuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 0,
  },
  capsuleBtnText: {
    fontSize: 12,
  },
  beadsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  beadTouch: {
    padding: 4,
  },
  beadDot: {
    height: 5,
    borderRadius: 2.5,
  },
});
