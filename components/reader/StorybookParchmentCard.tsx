import { ScrollView, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { EdgeInsets } from "react-native-safe-area-context";

import type { useNitiTreasuryItem } from "@/components/reader/useNitiTreasury";
import { PressableSurface } from "@/components/ui/PressableSurface";
import { FEATURE_COLORS, FONTS, OVERLAYS, RADII } from "@/lib/constants";
import { localizedLabel, STORYBOOK_FONT_SCALES, type StorybookFontScale } from "@/lib/panchatantraStorybook";
import { withAlpha } from "@/lib/readerAppearance";
import type { useReaderAppearance } from "@/lib/useReaderAppearance";

type StorybookParchmentCardProps = {
  parchmentBg: string;
  parchmentBorder: string;
  accent: string;
  isFinalPage: boolean;
  pageIndex: number;
  activeLanguage: 'en' | 'hi' | 'pa';
  isDark: boolean;
  handleDecreaseFontSize: () => void;
  handleIncreaseFontSize: () => void;
  fontScaleIndex: number;
  currentScale: StorybookFontScale;
  fontStyle: { fontSize: number; lineHeight: number };
  theme: ReturnType<typeof useReaderAppearance>['theme'];
  insets: EdgeInsets;
  paragraph: string;
  headingFontFamily: string;
  textFontFamily: string;
  moralText: string;
  treasury: ReturnType<typeof useNitiTreasuryItem>;
  handleSaveNitiTreasury: () => Promise<void>;
  onComplete: (() => void) | undefined;
  dropCap: string;
  remainderText: string;
};

export function StorybookParchmentCard({
  parchmentBg,
  parchmentBorder,
  accent,
  isFinalPage,
  pageIndex,
  activeLanguage,
  isDark,
  handleDecreaseFontSize,
  handleIncreaseFontSize,
  fontScaleIndex,
  currentScale,
  fontStyle,
  theme,
  insets,
  paragraph,
  headingFontFamily,
  textFontFamily,
  moralText,
  treasury,
  handleSaveNitiTreasury,
  onComplete,
  dropCap,
  remainderText,
}: StorybookParchmentCardProps) {
  return (
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
            ? localizedLabel(activeLanguage, 'WISDOM FRUIT', 'कथा का फल (बोध)', 'ਕਥਾ ਦਾ ਸਿੱਖਿਆ-ਫਲ')
            : localizedLabel(activeLanguage, `SCENE ${pageIndex + 1}`, `दृश्य ${pageIndex + 1}`, `ਦ੍ਰਿਸ਼ ${pageIndex + 1}`)}
        </Text>

        <View
          style={[
            styles.fontScalerPill,
            {
              backgroundColor: isDark ? OVERLAYS.white[0.08] : OVERLAYS.black[0.05],
              borderColor: isDark ? OVERLAYS.gold[0.3] : FEATURE_COLORS.panchatantraStorybookView.borderLight,
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
              { backgroundColor: isDark ? OVERLAYS.white[0.15] : OVERLAYS.black[0.12] },
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
              { backgroundColor: isDark ? OVERLAYS.white[0.15] : OVERLAYS.black[0.12] },
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
                {localizedLabel(activeLanguage, 'THE WISDOM FRUIT', 'कथा का फल (बोध)', 'ਕਥਾ ਦਾ ਸਿੱਖਿਆ-ਫਲ')}
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

            {/* Meaningful Wisdom Actions: Niti Treasury and Finish Reading */}
            <View style={styles.wisdomActionsContainer}>
              <View style={styles.wisdomActionsRow}>
                <PressableSurface
                  // The haptic follows the result (a save, an un-save or a failure), not the touch.
                  haptic="none"
                  disabled={!treasury.ready}
                  onPress={() => { void handleSaveNitiTreasury(); }}
                  accessibilityRole="button"
                  accessibilityLabel={treasury.saved
                    ? localizedLabel(activeLanguage, 'Saved to Treasury. Tap to remove.', 'कोश में सहेजा गया। हटाने के लिए टैप करें।', 'ਕੋਸ਼ ਵਿੱਚ ਸੰਭਾਲਿਆ। ਹਟਾਉਣ ਲਈ ਟੈਪ ਕਰੋ।')
                    : localizedLabel(activeLanguage, 'Save to Treasury', 'नीति कोश में सहेजें', 'ਨੀਤੀ ਕੋਸ਼ ਵਿੱਚ ਸੰਭਾਲੋ')}
                  accessibilityState={{ selected: treasury.saved, disabled: !treasury.ready }}
                  style={styles.wisdomActionSecondaryBtnWrap}
                >
                  <View
                    style={[
                      styles.wisdomActionSecondaryBtn,
                      {
                        // Reader paper tokens (the same ones the rest of this page uses), so the
                        // buttons follow Bhojpatra, Sandhya and Temple Night, not a fixed light or dark.
                        borderColor: treasury.saved ? accent : theme.border,
                        backgroundColor: treasury.saved ? withAlpha(accent, 0.12) : theme.cardSoft,
                      },
                    ]}
                  >
                    <Feather name="bookmark" size={15} color={treasury.saved ? accent : theme.text} />
                    <Text
                      style={[
                        styles.wisdomActionSecondaryText,
                        { color: treasury.saved ? accent : theme.text, fontFamily: FONTS.sansSemiBold },
                      ]}
                    >
                      {treasury.saved
                        ? localizedLabel(activeLanguage, 'Saved to Treasury', 'कोश में सहेजा गया', 'ਕੋਸ਼ ਵਿੱਚ ਸੰਭਾਲਿਆ')
                        : localizedLabel(activeLanguage, 'Save to Treasury', 'नीति कोश में सहेजें', 'ਨੀਤੀ ਕੋਸ਼ ਵਿੱਚ ਸੰਭਾਲੋ')}
                    </Text>
                  </View>
                </PressableSurface>

                {onComplete ? (
                  <PressableSurface
                    haptic="selection"
                    onPress={onComplete}
                    style={styles.wisdomActionSecondaryBtnWrap}
                  >
                    <View
                      style={[
                        styles.wisdomActionSecondaryBtn,
                        { borderColor: theme.border, backgroundColor: theme.cardSoft },
                      ]}
                    >
                      <Feather name="check" size={15} color={theme.text} />
                      <Text style={[styles.wisdomActionSecondaryText, { color: theme.text, fontFamily: FONTS.sansSemiBold }]}>
                        {localizedLabel(activeLanguage, 'Finish Reading', 'पठन पूर्ण करें', 'ਪੜ੍ਹਨਾ ਪੂਰਾ ਕਰੋ')}
                      </Text>
                    </View>
                  </PressableSurface>
                ) : null}
              </View>
            </View>
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
  );
}

const styles = StyleSheet.create({
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
  wisdomActionsContainer: {
    width: "100%",
    alignItems: "stretch",
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 6,
  },
  wisdomActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wisdomActionSecondaryBtnWrap: {
    flex: 1,
    borderRadius: RADII.pill,
  },
  wisdomActionSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  wisdomActionSecondaryText: {
    fontSize: 11.5,
  },
});
