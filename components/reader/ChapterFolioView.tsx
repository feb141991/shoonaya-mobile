import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { PressableSurface } from '@/components/ui/PressableSurface';
import {
  COLORS,
  FONTS,
  RADII,
  SHADOWS,
  TYPE,
  READER_THEMES,
  type ReaderThemeTokens as ReaderTheme,
} from '@/lib/constants';
import type { ReaderChapter } from '@/lib/readerChapters';

export interface ChapterFolioViewProps {
  chapters: ReaderChapter[];
  activeChapterIndex: number;
  onChapterChange: (index: number, chapter: ReaderChapter) => void;
  paperTheme?: ReaderTheme;
  themeColor?: string;
  fontSize?: { fontSize: number; lineHeight: number };
  onPageTap?: () => void;
  onComplete?: () => void;
  accentColor?: string;
  isDark?: boolean;
  quoteAction?: React.ReactNode;
  mantraAction?: React.ReactNode;
}

export function ChapterFolioView({
  chapters,
  activeChapterIndex,
  onChapterChange,
  paperTheme = READER_THEMES.bhojpatra,
  themeColor = COLORS.brandGoldLight,
  fontSize = { fontSize: 16, lineHeight: 26 },
  onPageTap,
  onComplete,
  accentColor,
  isDark = false,
  quoteAction,
  mantraAction,
}: ChapterFolioViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const total = chapters.length;

  const safeIndex = Math.max(0, Math.min(activeChapterIndex, total - 1));
  const activeChapter = chapters[safeIndex] ?? chapters[0];

  // Align horizontal pager when activeChapterIndex changes externally (e.g. on resume)
  useEffect(() => {
    pagerRef.current?.scrollTo({
      x: safeIndex * screenWidth,
      animated: true,
    });
  }, [safeIndex, screenWidth]);

  const goToChapter = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || index >= total) return;
      if (Platform.OS !== 'web') {
        void Haptics.selectionAsync();
      }
      onChapterChange(index, chapters[index]);
      pagerRef.current?.scrollTo({
        x: index * screenWidth,
        animated,
      });
    },
    [chapters, onChapterChange, screenWidth, total]
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / screenWidth);
      if (nextIndex >= 0 && nextIndex < total && nextIndex !== safeIndex) {
        if (Platform.OS !== 'web') {
          void Haptics.selectionAsync();
        }
        onChapterChange(nextIndex, chapters[nextIndex]);
      }
    },
    [chapters, onChapterChange, safeIndex, screenWidth, total]
  );

  if (total === 0) {
    return null;
  }

  const textColor = paperTheme.text;
  const textDimColor = paperTheme.dim;
  const borderColor = paperTheme.border;
  const effectiveAccent = accentColor ?? themeColor;

  return (
    <View style={styles.container}>
      {/* ── 1. Top Chapter Progress & Stage Bar ── */}
      <View style={[styles.topStageBar, { borderBottomColor: borderColor }]}>
        {/* Beads / Progress Dots */}
        <View style={styles.beadsContainer}>
          {chapters.map((ch, idx) => {
            const isActive = idx === safeIndex;
            return (
              <PressableSurface
                key={ch.id}
                haptic="selection"
                onPress={() => goToChapter(idx)}
                accessibilityLabel={`${ch.title}, ${ch.stageLabel}`}
                style={styles.beadTouchTarget}
              >
                <View
                  style={[
                    styles.bead,
                    {
                      backgroundColor: isActive ? effectiveAccent : borderColor,
                      width: isActive ? 22 : 6,
                    },
                  ]}
                />
              </PressableSurface>
            );
          })}
        </View>

        {/* Stage Label & Title Badge */}
        <View style={styles.stageHeaderRow}>
          <Text
            style={[
              styles.stageCounterText,
              { color: textDimColor, fontFamily: FONTS.sansSemiBold },
            ]}
          >
            {activeChapter.stageLabel.toUpperCase()}
          </Text>

          {activeChapter.isFallbackEnglish ? (
            <View
              style={[
                styles.fallbackBadge,
                {
                  borderColor: paperTheme.border,
                  backgroundColor: paperTheme.glass,
                },
              ]}
            >
              <Text
                style={[
                  styles.fallbackBadgeText,
                  { color: paperTheme.accent, fontFamily: FONTS.sansMedium },
                ]}
              >
                English
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── 2. Horizontal Chapter Pager ── */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {chapters.map((chapter) => (
          <View
            key={chapter.id}
            style={[styles.pageContainer, { width: screenWidth }]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.pageScrollContent}
            >
              {/* Chapter Header Well */}
              <View style={styles.chapterHeader}>
                <View
                  style={[
                    styles.iconWell,
                    {
                      backgroundColor: paperTheme.glass,
                      borderColor: paperTheme.border,
                    },
                  ]}
                >
                  <Feather
                    name={chapter.iconName as any}
                    size={22}
                    color={effectiveAccent}
                  />
                </View>

                <Text
                  style={[
                    styles.chapterTitle,
                    {
                      color: textColor,
                      fontFamily: FONTS.serifBold,
                    },
                  ]}
                >
                  {chapter.title}
                </Text>
              </View>

              {/* ── Chapter Specific Body Content ── */}
              {chapter.type === 'trial' ? (
                // Trial: Focused contemplative card
                <View
                  style={[
                    styles.trialCard,
                    {
                      backgroundColor: paperTheme.glass,
                      borderColor: paperTheme.border,
                    },
                  ]}
                >
                  <View style={styles.trialHeaderRow}>
                    <Feather name="shield" size={14} color={effectiveAccent} />
                    <Text
                      style={[
                        styles.trialLabel,
                        { color: effectiveAccent, fontFamily: FONTS.sansSemiBold },
                      ]}
                    >
                      SACRED TRIAL
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.bodyText,
                      {
                        color: textColor,
                        fontSize: fontSize.fontSize,
                        lineHeight: fontSize.lineHeight,
                        fontStyle: 'italic',
                      },
                    ]}
                  >
                  {chapter.content}
                  </Text>
                </View>
              ) : chapter.type === 'dos-donts' ? (
                // Do's & Don'ts Layout
                <View style={styles.dosDontsContainer}>
                  {chapter.dos && chapter.dos.length > 0 ? (
                    <View
                      style={[
                        styles.listCard,
                        {
                          backgroundColor: paperTheme.glass,
                          borderColor: paperTheme.border,
                        },
                      ]}
                    >
                      <View style={styles.listSectionHeader}>
                        <Feather name="check-circle" size={16} color={COLORS.success} />
                        <Text
                          style={[
                            styles.listTitle,
                            { color: COLORS.success, fontFamily: FONTS.sansSemiBold },
                          ]}
                        >
                          Devotional Practices
                        </Text>
                      </View>
                      {chapter.dos.map((item, idx) => (
                        <View key={idx} style={styles.listItemRow}>
                          <Feather name="check" size={14} color={COLORS.success} style={styles.listIcon} />
                          <Text
                            style={[
                              styles.listItemText,
                              {
                                color: textColor,
                                fontSize: fontSize.fontSize - 1,
                                lineHeight: fontSize.lineHeight - 2,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {chapter.donts && chapter.donts.length > 0 ? (
                    <View
                      style={[
                        styles.listCard,
                        {
                          backgroundColor: paperTheme.glass,
                          borderColor: paperTheme.border,
                          marginTop: 14,
                        },
                      ]}
                    >
                      <View style={styles.listSectionHeader}>
                        <Feather name="alert-triangle" size={16} color={COLORS.danger} />
                        <Text
                          style={[
                            styles.listTitle,
                            { color: COLORS.danger, fontFamily: FONTS.sansSemiBold },
                          ]}
                        >
                          Prohibitions & Cautions
                        </Text>
                      </View>
                      {chapter.donts.map((item, idx) => (
                        <View key={idx} style={styles.listItemRow}>
                          <Feather name="x" size={14} color={COLORS.danger} style={styles.listIcon} />
                          <Text
                            style={[
                              styles.listItemText,
                              {
                                color: textColor,
                                fontSize: fontSize.fontSize - 1,
                                lineHeight: fontSize.lineHeight - 2,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : chapter.type === 'practice' ? (
                // Practice Rules with Fasting Details
                <View style={styles.practiceContainer}>
                  <Text
                    style={[
                      styles.bodyText,
                      {
                        color: textColor,
                        fontSize: fontSize.fontSize,
                        lineHeight: fontSize.lineHeight,
                      },
                    ]}
                  >
                    {chapter.content}
                  </Text>

                  {chapter.fastingType || chapter.breakFastTime ? (
                    <View
                      style={[
                        styles.fastingDetailsCard,
                        {
                          backgroundColor: paperTheme.glass,
                          borderColor: paperTheme.border,
                        },
                      ]}
                    >
                      {chapter.fastingType ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailKey, { color: textDimColor }]}>Fasting Type:</Text>
                          <View
                            style={[
                              styles.fastingTypePill,
                              { backgroundColor: paperTheme.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.fastingTypeText,
                                { color: effectiveAccent, fontFamily: FONTS.sansSemiBold },
                              ]}
                            >
                              {chapter.fastingType.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {chapter.breakFastTime ? (
                        <View style={[styles.detailRow, { marginTop: 6 }]}>
                          <Text style={[styles.detailKey, { color: textDimColor }]}>Parana Time:</Text>
                          <Text
                            style={[
                              styles.detailVal,
                              { color: textColor, fontFamily: FONTS.sansMedium },
                            ]}
                          >
                            {chapter.breakFastTime}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : chapter.type === 'mantra' ? (
                // Sacred Mantra Illuminated Card
                <View
                  style={[
                    styles.mantraCard,
                    {
                      backgroundColor: paperTheme.glass,
                      borderColor: effectiveAccent,
                    },
                  ]}
                >
                  <Feather name="disc" size={24} color={effectiveAccent} style={{ opacity: 0.7 }} />
                  <Text
                    style={[
                      styles.mantraText,
                      {
                        color: textColor,
                        fontSize: fontSize.fontSize + 3,
                        lineHeight: fontSize.lineHeight + 6,
                        fontFamily: FONTS.serifBold,
                      },
                    ]}
                  >
                    {chapter.content}
                  </Text>
                  {mantraAction}
                </View>
              ) : chapter.type === 'katha' ? (
                // Katha Multi-paragraph Story
                <View style={styles.kathaContainer}>
                  {chapter.paragraphs?.map((p, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.bodyText,
                        styles.paragraphSpacing,
                        {
                          color: textColor,
                          fontSize: fontSize.fontSize,
                          lineHeight: fontSize.lineHeight,
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  ))}
                </View>
              ) : chapter.type === 'moral' ? (
                // Moral Chapter: Moral Text + Closing Quote + Sources
                <View style={styles.moralContainer}>
                  <Text
                    style={[
                      styles.moralBodyText,
                      {
                        color: textColor,
                        fontSize: fontSize.fontSize + 1,
                        lineHeight: fontSize.lineHeight + 4,
                        fontFamily: FONTS.sansSemiBold,
                      },
                    ]}
                  >
                    {chapter.content}
                  </Text>

                  {/* Hero Quote Card */}
                  {chapter.quote ? (
                    <View
                      style={[
                        styles.quoteCard,
                        {
                          borderColor: borderColor,
                        },
                      ]}
                    >
                      <Feather name="feather" size={20} color={effectiveAccent} style={{ opacity: 0.6 }} />
                      <Text
                        style={[
                          styles.quoteText,
                          {
                            color: textColor,
                            fontSize: fontSize.fontSize + 1,
                            lineHeight: fontSize.lineHeight + 4,
                            fontFamily: FONTS.serifBold,
                          },
                        ]}
                      >
                        "{chapter.quote.text}"
                      </Text>
                      <Text
                        style={[
                          styles.quoteAttribution,
                          {
                            color: textDimColor,
                            fontFamily: FONTS.sansSemiBold,
                          },
                        ]}
                      >
                        : {chapter.quote.attribution}
                      </Text>
                      {quoteAction}
                    </View>
                  ) : null}

                  {/* Canonical Sources & Citations */}
                  {chapter.sourceText || (chapter.sourceCitations && chapter.sourceCitations.length > 0) ? (
                    <View
                      style={[
                        styles.sourcesCard,
                        {
                          backgroundColor: paperTheme.glass,
                          borderColor: borderColor,
                        },
                      ]}
                    >
                      <View style={styles.sourcesHeaderRow}>
                        <Feather name="book" size={13} color={effectiveAccent} />
                        <Text
                          style={[
                            styles.sourcesTitle,
                            { color: effectiveAccent, fontFamily: FONTS.sansSemiBold },
                          ]}
                        >
                          CANONICAL SOURCES & CITATIONS
                        </Text>
                      </View>

                      {chapter.sourceText ? (
                        <Text
                          style={[
                            styles.sourceText,
                            { color: textColor, fontFamily: FONTS.sansMedium },
                          ]}
                        >
                          {chapter.sourceText}
                        </Text>
                      ) : null}

                      {chapter.sourceCitations?.map((c, idx) => (
                        <Text
                          key={idx}
                          style={[
                            styles.citationLine,
                            { color: textDimColor, fontFamily: FONTS.sans },
                          ]}
                        >
                          • {c.sourceName}{c.sourceRef ? ` (${c.sourceRef})` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                // Standard Narrative Chapter (Journey, Teaching, Legacy, Significance)
                <Text
                  style={[
                    styles.bodyText,
                    {
                      color: textColor,
                      fontSize: fontSize.fontSize,
                      lineHeight: fontSize.lineHeight,
                    },
                  ]}
                >
                  {chapter.content}
                </Text>
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* ── 3. Bottom Chapter Navigation Bar ── */}
      <View
        style={[
          styles.bottomNavBar,
          {
            backgroundColor: paperTheme.bg,
            borderTopColor: borderColor,
          },
        ]}
      >
        {/* Previous Button */}
        {safeIndex > 0 ? (
          <PressableSurface
            haptic="selection"
            onPress={() => goToChapter(safeIndex - 1)}
            accessibilityLabel="Go to previous chapter"
            style={[
              styles.navBtn,
              {
                borderColor: borderColor,
                backgroundColor: paperTheme.glass,
              },
            ]}
          >
            <Feather name="chevron-left" size={18} color={textColor} />
            <Text
              style={[
                styles.navBtnText,
                { color: textColor, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              Previous
            </Text>
          </PressableSurface>
        ) : (
          <View style={styles.navPlaceholder} />
        )}

        {/* Chapter Index Indicator */}
        <View style={styles.pagePill}>
          <Text
            style={[
              styles.pagePillText,
              { color: textDimColor, fontFamily: FONTS.sansSemiBold },
            ]}
          >
            {safeIndex + 1} / {total}
          </Text>
        </View>

        {/* Next or Complete Button */}
        {safeIndex < total - 1 ? (
          <PressableSurface
            haptic="selection"
            onPress={() => goToChapter(safeIndex + 1)}
            accessibilityLabel="Go to next chapter"
            style={[
              styles.navBtn,
              styles.nextBtnPrimary,
              {
                backgroundColor: effectiveAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.navBtnText,
                { color: COLORS.ink, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              Next
            </Text>
            <Feather name="chevron-right" size={18} color={COLORS.ink} />
          </PressableSurface>
        ) : (
          <PressableSurface
            haptic="selection"
            onPress={onComplete ? onComplete : () => {}}
            accessibilityLabel="Complete reading"
            style={[
              styles.navBtn,
              styles.nextBtnPrimary,
              {
                backgroundColor: effectiveAccent,
              },
            ]}
          >
            <Text
              style={[
                styles.navBtnText,
                { color: COLORS.ink, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              Complete ✓
            </Text>
          </PressableSurface>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStageBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  beadsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  beadTouchTarget: {
    minHeight: 28,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bead: {
    height: 6,
    borderRadius: 3,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageCounterText: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  fallbackBadge: {
    borderWidth: 1,
    borderRadius: RADII.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fallbackBadgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  pager: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  pageScrollContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 140, // Reserved clearance for bottom nav and capsule
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterTitle: {
    fontSize: 22,
    flex: 1,
  },
  bodyText: {
    fontFamily: FONTS.serif,
  },
  paragraphSpacing: {
    marginBottom: 16,
  },
  trialCard: {
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: 20,
    gap: 12,
  },
  trialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trialLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  dosDontsContainer: {
    gap: 16,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: 18,
    gap: 10,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listIcon: {
    marginTop: 3,
  },
  listItemText: {
    flex: 1,
    fontFamily: FONTS.sans,
  },
  practiceContainer: {
    gap: 18,
  },
  fastingDetailsCard: {
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailKey: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  fastingTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.xs,
  },
  fastingTypeText: {
    fontSize: 11,
  },
  detailVal: {
    fontSize: 12,
  },
  mantraCard: {
    borderWidth: 1.5,
    borderRadius: RADII.lg,
    padding: 26,
    alignItems: 'center',
    gap: 14,
  },
  mantraText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  kathaContainer: {
    gap: 8,
  },
  moralContainer: {
    gap: 20,
  },
  moralBodyText: {
    textAlign: 'center',
  },
  quoteCard: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  quoteText: {
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 12,
  },
  quoteAttribution: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sourcesCard: {
    borderWidth: 1,
    borderRadius: RADII.md,
    padding: 16,
    gap: 8,
  },
  sourcesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcesTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sourceText: {
    fontSize: 12,
    lineHeight: 18,
  },
  citationLine: {
    fontSize: 11,
    lineHeight: 16,
  },
  bottomNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    minHeight: 60,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  nextBtnPrimary: {
    borderWidth: 0,
  },
  navBtnText: {
    fontSize: 13,
  },
  navPlaceholder: {
    width: 90,
  },
  pagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pagePillText: {
    fontSize: 12,
  },
});
