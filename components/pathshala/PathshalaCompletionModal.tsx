import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, SHADOWS, themeColor } from '@/lib/constants';

export type PathshalaCompletionModalProps = {
  visible: boolean;
  onClose: () => void;
  lessonTitle: string;
  lessonNumber: number;
  totalLessons: number;
  pathTitle: string;
  tradition?: string;
  karmaEarned?: number;
  dailySadhanaUpdated?: boolean;
  hasNextLesson: boolean;
  onContinueNextLesson: () => void;
  onReturnToPath: () => void;
};

const TRADITION_GLYPHS: Record<string, string> = {
  hindu: 'ॐ',
  sikh: 'ੴ',
  buddhist: '☸',
  jain: '卐',
  default: 'ॐ',
};

export function PathshalaCompletionModal({
  visible,
  onClose,
  lessonTitle,
  lessonNumber,
  totalLessons,
  pathTitle,
  tradition = 'hindu',
  karmaEarned = 8,
  dailySadhanaUpdated = true,
  hasNextLesson,
  onContinueNextLesson,
  onReturnToPath,
}: PathshalaCompletionModalProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const glyph = TRADITION_GLYPHS[tradition] ?? TRADITION_GLYPHS.default;
  const isPathDone = !hasNextLesson || lessonNumber >= totalLessons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(24, 20, 16, 0.96)' : 'rgba(255, 252, 245, 0.98)',
              borderColor: theme.premiumBorder,
              boxShadow: isDark ? SHADOWS.md.dark : SHADOWS.md.light,
            },
          ]}
        >
          {/* Top Indicator Handle */}
          <View style={[styles.handle, { backgroundColor: theme.borderSoft }]} />

          {/* Sacred Glyph Halo */}
          <View style={[styles.haloContainer, { borderColor: theme.brand, backgroundColor: theme.brandSoft }]}>
            <Text style={[styles.glyphText, { color: theme.brand }]}>{glyph}</Text>
          </View>

          {/* Celebration Header */}
          <Text style={[styles.title, { color: theme.text }]}>
            {isPathDone ? 'Sacred Path Completed!' : `Lesson ${lessonNumber} Completed!`}
          </Text>
          <Text style={[styles.lessonSubtitle, { color: theme.dim }]} numberOfLines={2}>
            {lessonTitle}
          </Text>
          <Text style={[styles.pathName, { color: theme.brand }]}>
            {pathTitle}
          </Text>

          {/* Rewards & Milestones Badges */}
          <View style={styles.badgesRow}>
            {karmaEarned > 0 ? (
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.12)', borderColor: 'rgba(197,160,89,0.4)' }]}>
                <Feather name="star" size={13} color={theme.brand} />
                <Text style={[styles.badgeText, { color: theme.brand }]}>+{karmaEarned} Karma</Text>
              </View>
            ) : null}

            {dailySadhanaUpdated ? (
              <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(46,125,50,0.20)' : 'rgba(46,125,50,0.12)', borderColor: 'rgba(46,125,50,0.35)' }]}>
                <Feather name="check" size={13} color={isDark ? '#81C784' : '#2E7D32'} />
                <Text style={[styles.badgeText, { color: isDark ? '#81C784' : '#2E7D32' }]}>Sadhana Done</Text>
              </View>
            ) : null}

            <View style={[styles.badge, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.badgeText, { color: theme.dim }]}>{lessonNumber}/{totalLessons}</Text>
            </View>
          </View>

          {/* Meditative Contemplation Reflection */}
          <View style={[styles.reflectionCard, { backgroundColor: isDark ? 'rgba(18, 15, 12, 0.6)' : 'rgba(245, 239, 226, 0.6)', borderColor: theme.borderSoft }]}>
            <Text style={[styles.reflectionPrompt, { color: theme.brand }]}>
              Pause & Contemplate
            </Text>
            <Text style={[styles.reflectionQuote, { color: theme.text }]}>
              {isPathDone
                ? 'You have completed this entire sacred study path. Sit in quiet gratitude and let these timeless verses take deep root in your daily life.'
                : 'Carry the stillness and insight of this verse into your next conversation and deed before proceeding.'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {hasNextLesson ? (
              <PressableSurface
                haptic="impact"
                onPress={onContinueNextLesson}
                style={[styles.primaryBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={[styles.primaryBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>
                  Continue to Lesson {lessonNumber + 1}
                </Text>
                <Feather name="arrow-right" size={16} color={isDark ? COLORS.darkBg : COLORS.ink} />
              </PressableSurface>
            ) : (
              <PressableSurface
                haptic="impact"
                onPress={onReturnToPath}
                style={[styles.primaryBtn, { backgroundColor: theme.brand }]}
              >
                <Text style={[styles.primaryBtnText, { color: isDark ? COLORS.darkBg : COLORS.ink }]}>
                  Complete Path & Return
                </Text>
                <Feather name="check" size={16} color={isDark ? COLORS.darkBg : COLORS.ink} />
              </PressableSurface>
            )}

            <PressableSurface
              haptic="selection"
              onPress={onReturnToPath}
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.secondaryBtnText, { color: theme.dim }]}>
                Return to Path Overview
              </Text>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 6, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1.2,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  haloContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  glyphText: {
    fontFamily: FONTS.serifBold,
    fontSize: 28,
    lineHeight: 34,
  },
  title: {
    fontFamily: FONTS.serifBold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  lessonSubtitle: {
    fontFamily: FONTS.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 10,
  },
  pathName: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
  },
  reflectionCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    alignItems: 'center',
    gap: 6,
  },
  reflectionPrompt: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reflectionQuote: {
    fontFamily: FONTS.serif,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionContainer: {
    width: '100%',
    gap: 10,
    marginTop: 22,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 13.5,
  },
});
