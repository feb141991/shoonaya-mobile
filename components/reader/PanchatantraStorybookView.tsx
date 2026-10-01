import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import {
  COLORS,
  FONTS,
  RADII,
  SHADOWS,
  TYPE,
  themeColor,
  KATHA_VIEW_ACCENT,
} from '@/lib/constants';
import { getPanchatantraArtworkSource } from '@/lib/panchatantraArtwork';

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
}

interface PanchatantraStorybookViewProps {
  katha: StorybookKathaData;
  activeLanguage: 'en' | 'hi';
  onLanguageChange: (lang: 'en' | 'hi') => void;
  fontSize?: { fontSize: number; lineHeight: number };
  onTTS?: () => void;
  isSpeaking?: boolean;
  isTTSGenerating?: boolean;
  onComplete?: () => void;
}

export function PanchatantraStorybookView({
  katha,
  activeLanguage,
  onLanguageChange,
  fontSize,
  onTTS,
  isSpeaking = false,
  isTTSGenerating = false,
  onComplete,
}: PanchatantraStorybookViewProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const accent = KATHA_VIEW_ACCENT.panchatantra; // #C87850 warm terracotta

  // Current page state (0-indexed, 0 to body.length - 1)
  const [currentPage, setCurrentPage] = useState(0);
  const [isPagedMode, setIsPagedMode] = useState(true);

  const hasHindi = Boolean(katha.titleHi && katha.bodyHi?.length && katha.phalHi);
  const title = activeLanguage === 'hi' && katha.titleHi ? katha.titleHi : katha.title;
  const subtitle = activeLanguage === 'hi' ? katha.title : (katha.titleHi ?? '');
  const bodyParagraphs = activeLanguage === 'hi' && katha.bodyHi?.length ? katha.bodyHi : katha.body;
  const moralText = activeLanguage === 'hi' && katha.phalHi ? katha.phalHi : katha.phal;

  const totalPages = bodyParagraphs.length;
  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const currentParagraph = bodyParagraphs[safePage] ?? '';

  const artworkSource = useMemo(() => getPanchatantraArtworkSource(katha.id), [katha.id]);

  // Extract illuminated drop cap letter and remainder of text
  const { dropCap, remainderText } = useMemo(() => {
    if (!currentParagraph || currentParagraph.length === 0) {
      return { dropCap: '', remainderText: '' };
    }
    // Clean leading whitespace or quotes
    const trimmed = currentParagraph.trim();
    if (trimmed.startsWith('"') || trimmed.startsWith('“')) {
      const cap = trimmed.slice(0, 2);
      return { dropCap: cap, remainderText: trimmed.slice(2) };
    }
    const cap = trimmed.charAt(0);
    return { dropCap: cap, remainderText: trimmed.slice(1) };
  }, [currentParagraph]);

  const fontStyle = fontSize ?? { fontSize: 16.5, lineHeight: 28 };
  const textFontFamily = activeLanguage === 'hi' ? FONTS.devanagari : FONTS.serif;
  const headingFontFamily = activeLanguage === 'hi' ? FONTS.devanagariBold : FONTS.serifBold;

  // Parchment palette tokens
  const parchmentBg = isDark ? '#1C1611' : '#FAF6EE';
  const parchmentBorder = isDark ? 'rgba(197,160,89,0.22)' : 'rgba(216,138,28,0.18)';
  const shadowValue = isDark ? SHADOWS.heroCard.dark : SHADOWS.heroCard.light;

  return (
    <View style={styles.container}>
      {/* ── 1. Hero Character Card (RADII.xl = 24px) ── */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? theme.card : theme.brandSoft,
            borderColor: isDark ? theme.border : parchmentBorder,
            boxShadow: shadowValue,
          },
        ]}
      >
        {artworkSource ? (
          <View style={styles.artworkWrapper}>
            <Image
              source={artworkSource}
              style={styles.heroImage}
              contentFit="cover"
              contentPosition="center"
              priority="high"
              cachePolicy="memory-disk"
              transition={250}
              accessibilityLabel={`${title} illustration`}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', isDark ? 'rgba(28,22,17,0.7)' : 'rgba(250,246,238,0.6)']}
              style={styles.artworkGradient}
              pointerEvents="none"
            />
          </View>
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: isDark ? '#261E16' : '#F5EBD7' }]}>
            <View
              style={[
                styles.avatarEmblem,
                {
                  backgroundColor: `${accent}18`,
                  borderColor: `${accent}40`,
                },
              ]}
            >
              <Text style={styles.avatarEmoji}>{katha.portrait ?? '📜'}</Text>
            </View>
            <Text style={[styles.avatarBadge, { color: accent, fontFamily: FONTS.sansSemiBold }]}>
              PANCHATANTRA FABLE
            </Text>
          </View>
        )}
      </View>

      {/* ── Title & Bilingual Subtitle ── */}
      <View style={styles.titleSection}>
        <Text style={[styles.storyTitle, { color: theme.text, fontFamily: headingFontFamily }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.storySubtitle, { color: theme.dim, fontFamily: activeLanguage === 'hi' ? FONTS.serif : FONTS.devanagari }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* ── 2. Metadata & Moral Bar ── */}
      <View style={styles.metaRow}>
        <View style={[styles.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.borderSoft }]}>
          <Feather name="clock" size={12} color={theme.dim} />
          <Text style={[styles.metaPillText, { color: theme.dim, fontFamily: FONTS.sansSemiBold }]}>
            {katha.durationMin} min read
          </Text>
        </View>

        <View style={[styles.moralPill, { backgroundColor: `${accent}15`, borderColor: `${accent}35` }]}>
          <Feather name="compass" size={12} color={accent} />
          <Text
            numberOfLines={1}
            style={[styles.moralPillText, { color: accent, fontFamily: FONTS.sansSemiBold }]}
          >
            {moralText}
          </Text>
        </View>
      </View>

      {/* ── 3. Bilingual Switcher (Floating Pill) ── */}
      {hasHindi ? (
        <View style={styles.switcherContainer}>
          <View style={[styles.switcherTrack, { backgroundColor: isDark ? '#251E18' : '#EFE4D2', borderColor: theme.borderSoft }]}>
            <PressableSurface
              haptic="selection"
              onPress={() => onLanguageChange('en')}
              style={[
                styles.switcherTab,
                activeLanguage === 'en' && [styles.switcherTabActive, { backgroundColor: accent }],
              ]}
            >
              <Text
                style={[
                  styles.switcherText,
                  {
                    color: activeLanguage === 'en' ? COLORS.onMediaWhite : theme.dim,
                    fontFamily: FONTS.sansSemiBold,
                  },
                ]}
              >
                English
              </Text>
            </PressableSurface>

            <PressableSurface
              haptic="selection"
              onPress={() => onLanguageChange('hi')}
              style={[
                styles.switcherTab,
                activeLanguage === 'hi' && [styles.switcherTabActive, { backgroundColor: accent }],
              ]}
            >
              <Text
                style={[
                  styles.switcherText,
                  {
                    color: activeLanguage === 'hi' ? COLORS.onMediaWhite : theme.dim,
                    fontFamily: FONTS.devanagariBold,
                  },
                ]}
              >
                हिन्दी
              </Text>
            </PressableSurface>
          </View>
        </View>
      ) : null}

      {/* ── Mode Toggle: Storybook Page-by-Page vs Continuous ── */}
      <View style={styles.viewModeRow}>
        <PressableSurface
          haptic="selection"
          onPress={() => setIsPagedMode((m) => !m)}
          style={{ borderRadius: RADII.pill }}
        >
          <View style={[styles.viewModeButton, { borderColor: theme.borderSoft, backgroundColor: isDark ? theme.card : '#F2ECE0' }]}>
            <Feather name={isPagedMode ? 'book-open' : 'align-left'} size={13} color={accent} />
            <Text style={[styles.viewModeText, { color: theme.dim, fontFamily: FONTS.sansSemiBold }]}>
              {isPagedMode ? 'Storybook Mode' : 'Continuous View'}
            </Text>
          </View>
        </PressableSurface>
      </View>

      {/* ── 4. Parchment Book Card & Illuminated Drop Cap ── */}
      {isPagedMode ? (
        <View
          style={[
            styles.parchmentCard,
            {
              backgroundColor: parchmentBg,
              borderColor: parchmentBorder,
              boxShadow: shadowValue,
            },
          ]}
        >
          {/* Deckle edge subtle header ornament */}
          <View style={styles.deckleHeader}>
            <View style={[styles.flourishLine, { backgroundColor: `${accent}30` }]} />
            <Text style={[styles.flourishSymbol, { color: accent }]}>❦</Text>
            <View style={[styles.flourishLine, { backgroundColor: `${accent}30` }]} />
          </View>

          {/* Illuminated paragraph content */}
          <View style={styles.paragraphContent}>
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

          {/* If on final page, show the celebratory Moral Card */}
          {safePage === totalPages - 1 ? (
            <View style={[styles.finalMoralCard, { backgroundColor: `${accent}12`, borderColor: `${accent}30` }]}>
              <View style={[styles.moralBadgeIcon, { backgroundColor: `${accent}25` }]}>
                <Feather name="award" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moralCardHeading, { color: accent, fontFamily: headingFontFamily }]}>
                  {activeLanguage === 'hi' ? 'कथा का फल (बोध)' : 'Fruit of the Tale'}
                </Text>
                <Text style={[styles.moralCardBody, { color: theme.text, fontFamily: textFontFamily }]}>
                  {moralText}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        /* Continuous scroll mode for all 6 paragraphs */
        <View style={{ gap: 18 }}>
          {bodyParagraphs.map((para, idx) => (
            <View
              key={idx}
              style={[
                styles.parchmentCard,
                {
                  backgroundColor: parchmentBg,
                  borderColor: parchmentBorder,
                  boxShadow: shadowValue,
                  paddingVertical: 18,
                },
              ]}
            >
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
                {para}
              </Text>
            </View>
          ))}

          {/* Moral at end of continuous view */}
          <View style={[styles.finalMoralCard, { backgroundColor: `${accent}12`, borderColor: `${accent}30`, marginTop: 8 }]}>
            <View style={[styles.moralBadgeIcon, { backgroundColor: `${accent}25` }]}>
              <Feather name="award" size={18} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.moralCardHeading, { color: accent, fontFamily: headingFontFamily }]}>
                {activeLanguage === 'hi' ? 'कथा का फल (बोध)' : 'Fruit of the Tale'}
              </Text>
              <Text style={[styles.moralCardBody, { color: theme.text, fontFamily: textFontFamily }]}>
                {moralText}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── 5. Progress & Audio Bar (Bottom Controls) ── */}
      {isPagedMode ? (
        <View
          style={[
            styles.bottomControlBar,
            {
              backgroundColor: isDark ? theme.card : '#F8F3EA',
              borderColor: theme.borderSoft,
            },
          ]}
        >
          {/* Audio Listen Button */}
          {onTTS ? (
            <PressableSurface
              haptic="selection"
              onPress={onTTS}
              disabled={isTTSGenerating}
              style={{ borderRadius: RADII.pill }}
            >
              <View
                style={[
                  styles.audioButton,
                  {
                    backgroundColor: isSpeaking ? accent : `${accent}16`,
                    borderColor: `${accent}35`,
                  },
                ]}
              >
                <Feather
                  name={isSpeaking ? 'square' : 'volume-2'}
                  size={15}
                  color={isSpeaking ? COLORS.onMediaWhite : accent}
                />
                <Text
                  style={[
                    styles.audioButtonText,
                    {
                      color: isSpeaking ? COLORS.onMediaWhite : accent,
                      fontFamily: FONTS.sansSemiBold,
                    },
                  ]}
                >
                  {isTTSGenerating ? 'Loading…' : isSpeaking ? 'Stop' : 'Listen'}
                </Text>
              </View>
            </PressableSurface>
          ) : (
            <View style={{ width: 40 }} />
          )}

          {/* Stepper / Page Dots */}
          <View style={styles.paginationCenter}>
            <View style={styles.dotsRow}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <PressableSurface
                  key={i}
                  onPress={() => setCurrentPage(i)}
                  style={{ padding: 4 }}
                >
                  <View
                    style={[
                      styles.pageDot,
                      {
                        backgroundColor: i === safePage ? accent : `${theme.dim}30`,
                        width: i === safePage ? 16 : 6,
                      },
                    ]}
                  />
                </PressableSurface>
              ))}
            </View>
            <Text style={[styles.pageIndicatorText, { color: theme.dim, fontFamily: FONTS.sansSemiBold }]}>
              {safePage + 1} of {totalPages}
            </Text>
          </View>

          {/* Navigation Buttons: Previous / Next */}
          <View style={styles.navButtonsRow}>
            {safePage > 0 ? (
              <PressableSurface
                haptic="selection"
                onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
                style={{ borderRadius: RADII.pill }}
              >
                <View style={[styles.navArrowButton, { backgroundColor: isDark ? '#2A2016' : '#EDE3D2', borderColor: theme.borderSoft }]}>
                  <Feather name="chevron-left" size={16} color={theme.text} />
                </View>
              </PressableSurface>
            ) : null}

            {safePage < totalPages - 1 ? (
              <PressableSurface
                haptic="selection"
                onPress={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                style={{ borderRadius: RADII.pill }}
              >
                <View style={[styles.navArrowButton, { backgroundColor: accent, borderColor: accent }]}>
                  <Feather name="chevron-right" size={16} color={COLORS.onMediaWhite} />
                </View>
              </PressableSurface>
            ) : (
              <PressableSurface
                haptic="selection"
                onPress={onComplete}
                style={{ borderRadius: RADII.pill }}
              >
                <View style={[styles.navCompleteButton, { backgroundColor: accent }]}>
                  <Feather name="check" size={14} color={COLORS.onMediaWhite} />
                  <Text style={[styles.navCompleteText, { color: COLORS.onMediaWhite, fontFamily: FONTS.sansSemiBold }]}>
                    Done
                  </Text>
                </View>
              </PressableSurface>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  heroCard: {
    width: '100%',
    height: 220,
    borderRadius: RADII.xl,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkWrapper: {
    ...StyleSheet.absoluteFill,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  artworkGradient: {
    ...StyleSheet.absoluteFill,
  },
  avatarFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  avatarEmblem: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 42,
  },
  avatarBadge: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  titleSection: {
    gap: 4,
    marginTop: 4,
  },
  storyTitle: {
    ...TYPE.title,
    fontSize: 26,
    lineHeight: 32,
  },
  storySubtitle: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  metaPillText: {
    fontSize: 12,
  },
  moralPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    maxWidth: '65%',
  },
  moralPillText: {
    fontSize: 12,
  },
  switcherContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  switcherTrack: {
    flexDirection: 'row',
    borderRadius: RADII.pill,
    borderWidth: 1,
    padding: 3,
    alignItems: 'center',
  },
  switcherTab: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: RADII.pill,
  },
  switcherTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  switcherText: {
    fontSize: 13,
  },
  viewModeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  viewModeText: {
    fontSize: 11.5,
  },
  parchmentCard: {
    borderRadius: RADII.xl,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
  },
  deckleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  flourishLine: {
    flex: 1,
    height: 1,
    maxWidth: 60,
  },
  flourishSymbol: {
    fontSize: 14,
  },
  paragraphContent: {
    gap: 8,
  },
  dropCapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dropCapBox: {
    width: 48,
    height: 48,
    borderRadius: RADII.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dropCapLetter: {
    fontSize: 28,
    lineHeight: 34,
  },
  bodyText: {
    flex: 1,
    letterSpacing: 0.2,
  },
  finalMoralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADII.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  moralBadgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moralCardHeading: {
    fontSize: 15,
    marginBottom: 2,
  },
  moralCardBody: {
    fontSize: 13.5,
    lineHeight: 20,
    opacity: 0.9,
  },
  bottomControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.pill,
    borderWidth: 1,
    marginTop: 8,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  audioButtonText: {
    fontSize: 12.5,
  },
  paginationCenter: {
    alignItems: 'center',
    gap: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pageDot: {
    height: 6,
    borderRadius: 3,
  },
  pageIndicatorText: {
    fontSize: 11,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.pill,
  },
  navCompleteText: {
    fontSize: 12.5,
  },
});
