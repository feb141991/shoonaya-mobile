import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, FEATURE_COLORS, FONTS, OVERLAYS, RADII } from "@/lib/constants";
import type { getPanchatantraSceneArtwork } from "@/lib/panchatantraArtwork";
import {
  localizedLabel,
  type MASTERWORK_SCENE_FRAMING,
  type SCENE_STAGE_LABELS,
  type StorybookKathaData,
} from "@/lib/panchatantraStorybook";
import { withAlpha } from "@/lib/readerAppearance";

type StorybookSceneIllustrationProps = {
  artHeight: number;
  screenWidth: number;
  sceneArt: ReturnType<typeof getPanchatantraSceneArtwork>;
  isMultiScene: boolean;
  framing: (typeof MASTERWORK_SCENE_FRAMING)[number];
  title: string;
  pageIndex: number;
  isFinalPage: boolean;
  activeLanguage: 'en' | 'hi' | 'pa';
  stageInfo: (typeof SCENE_STAGE_LABELS)[number];
  parchmentBg: string;
  isDark: boolean;
  katha: StorybookKathaData;
  headingFontFamily: string;
  totalPages: number;
};

export function StorybookSceneIllustration({
  artHeight,
  screenWidth,
  sceneArt,
  isMultiScene,
  framing,
  title,
  pageIndex,
  isFinalPage,
  activeLanguage,
  stageInfo,
  parchmentBg,
  isDark,
  katha,
  headingFontFamily,
  totalPages,
}: StorybookSceneIllustrationProps) {
  return (
    <View style={[styles.illustrationStage, { height: artHeight, width: screenWidth }]}>
      {sceneArt ? (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={sceneArt}
            style={[
              StyleSheet.absoluteFill,
              !isMultiScene && {
                transform: [
                  { scale: framing.scale },
                  { translateX: framing.translateX },
                  { translateY: framing.translateY },
                ],
              },
            ]}
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
                ? localizedLabel(activeLanguage, 'WISDOM MORAL', 'कथा बोध', 'ਅੰਤਿਮ ਸਿੱਖਿਆ')
                : localizedLabel(activeLanguage, `SCENE ${pageIndex + 1} OF ${totalPages}`, `दृश्य ${pageIndex + 1} / ${totalPages}`, `ਦ੍ਰਿਸ਼ ${pageIndex + 1} / ${totalPages}`)}
            </Text>
          </View>

          {/* Subtle Golden Aura overlay on single-masterwork wisdom finale */}
          {!isMultiScene && isFinalPage ? (
            <LinearGradient
              colors={[
                OVERLAYS.metallicGold[0.06],
                OVERLAYS.metallicGold[0.18],
                "transparent",
              ]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}

          {/* Bottom Vignette Gradients blending into parchment below */}
          <LinearGradient
            colors={[
              "transparent",
              withAlpha(parchmentBg, 0.4),
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
              backgroundColor: isDark ? FEATURE_COLORS.panchatantraStorybookView.surfaceDark : FEATURE_COLORS.panchatantraStorybookView.surfaceLight,
            },
          ]}
        >
          <View style={styles.folioInnerBorder}>
            {/* Ornate Corner Filigree on Folio */}
            <View style={[styles.cornerFiligree, styles.folioCornerTL]}>
              <Text style={[styles.filigreeSymbol, { color: OVERLAYS.amber[0.55] }]}>❦</Text>
            </View>
            <View style={[styles.cornerFiligree, styles.folioCornerTR]}>
              <Text style={[styles.filigreeSymbol, { color: OVERLAYS.amber[0.55] }]}>❦</Text>
            </View>
            <View style={[styles.cornerFiligree, styles.folioCornerBL]}>
              <Text style={[styles.filigreeSymbol, { color: OVERLAYS.amber[0.55] }]}>❦</Text>
            </View>
            <View style={[styles.cornerFiligree, styles.folioCornerBR]}>
              <Text style={[styles.filigreeSymbol, { color: OVERLAYS.amber[0.55] }]}>❦</Text>
            </View>

            <View style={styles.folioHeader}>
              <Text style={styles.folioHeaderSymbol}>✦</Text>
              <Text style={[styles.folioHeaderText, { fontFamily: headingFontFamily }]}>
                {activeLanguage === "hi"
                  ? `पञ्चतन्त्र · ${stageInfo.hi}`
                  : activeLanguage === "pa"
                    ? `ਪੰਚਤੰਤਰ · ${stageInfo.pa}`
                    : `PANCHATANTRA · ${stageInfo.en}`}
              </Text>
              <Text style={styles.folioHeaderSymbol}>✦</Text>
            </View>

            <View style={styles.folioMedallion}>
              <Text style={styles.folioMedallionEmoji}>
                {isFinalPage ? "🪷" : katha.portrait ?? stageInfo.icon}
              </Text>
            </View>

            <Text numberOfLines={2} style={[styles.folioTitle, { fontFamily: headingFontFamily }]}>
              {title}
            </Text>

            <View style={styles.folioBottomBanner}>
              <Text style={[styles.folioSubtext, { fontFamily: FONTS.sansSemiBold }]}>
                {stageInfo.icon} {localizedLabel(activeLanguage, `SCENE ${pageIndex + 1} OF ${totalPages} · ANCIENT WISDOM`, `दृश्य ${pageIndex + 1} / ${totalPages} · प्राचीन ज्ञान`, `ਦ੍ਰਿਸ਼ ${pageIndex + 1} / ${totalPages} · ਪ੍ਰਾਚੀਨ ਗਿਆਨ`)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  folioCornerTL: { top: 8, left: 8 },
  folioCornerTR: { top: 8, right: 8 },
  folioCornerBL: { bottom: 8, left: 8 },
  folioCornerBR: { bottom: 8, right: 8 },
  filigreeSymbol: {
    color: OVERLAYS.amber[0.75],
    fontSize: 14,
  },
  imageSceneBadge: {
    position: "absolute",
    bottom: 12,
    left: 14,
    zIndex: 10,
    backgroundColor: COLORS.deepModalScrim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: OVERLAYS.white[0.2],
  },
  imageSceneBadgeText: {
    color: COLORS.onMediaWhite,
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
    borderColor: OVERLAYS.amber[0.35],
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
    color: COLORS.brandGoldLight,
    fontSize: 10,
  },
  folioHeaderText: {
    color: COLORS.brandGoldLight,
    fontSize: 12,
    letterSpacing: 1,
  },
  folioMedallion: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: OVERLAYS.amber[0.5],
    backgroundColor: OVERLAYS.amber[0.14],
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  folioMedallionEmoji: {
    fontSize: 36,
  },
  folioTitle: {
    color: COLORS.storyParchment,
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
    backgroundColor: OVERLAYS.amber[0.14],
    borderWidth: 1,
    borderColor: OVERLAYS.amber[0.25],
  },
  folioSubtext: {
    color: COLORS.brandGoldLight,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
});
