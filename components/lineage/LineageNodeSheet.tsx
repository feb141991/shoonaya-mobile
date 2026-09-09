import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';

import { LineageNode } from '@/lib/lineage-data';
import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';
import { PressableSurface } from '@/components/ui/PressableSurface';

interface LineageNodeSheetProps {
  node: LineageNode | null;
  visible: boolean;
  onClose: () => void;
}

export function LineageNodeSheet({ node, visible, onClose }: LineageNodeSheetProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);

  if (!node) return null;

  const handleAudioPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleColumn}>
              <Text style={[styles.nodeTitle, { color: theme.text }]}>
                {node.name}
              </Text>
              {node.sanskritName ? (
                <Text style={[styles.sanskritSubtitle, { color: theme.brand }]}>
                  {node.sanskritName}
                </Text>
              ) : null}
              <Text style={[styles.designation, { color: theme.dim }]}>
                {node.title} · {node.era}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: theme.borderSoft },
              ]}
              accessibilityLabel="Close detail sheet"
            >
              <Feather name="x" size={18} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Meta Tags Row */}
            <View style={styles.tagsRow}>
              {node.location ? (
                <View style={[styles.tag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.borderSoft }]}>
                  <Feather name="map-pin" size={12} color={theme.brand} />
                  <Text style={[styles.tagText, { color: theme.text }]}>{node.location}</Text>
                </View>
              ) : null}
              {node.vedaOrScripture ? (
                <View style={[styles.tag, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.borderSoft }]}>
                  <Feather name="book-open" size={12} color={COLORS.brandGold} />
                  <Text style={[styles.tagText, { color: theme.text }]}>{node.vedaOrScripture}</Text>
                </View>
              ) : null}
            </View>

            {/* Mahavakya Highlight */}
            {node.mahavakya ? (
              <View style={[styles.mahavakyaCard, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : '#FEF3C7', borderColor: theme.brandSoft }]}>
                <Text style={[styles.mahavakyaLabel, { color: theme.brand }]}>VEDIC MAHAVAKYA</Text>
                <Text style={[styles.mahavakyaText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                  {node.mahavakya}
                </Text>
              </View>
            ) : null}

            {/* Summary */}
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {node.summary}
            </Text>

            {/* Key Contributions */}
            {node.keyContributions.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeading, { color: theme.brand }]}>
                  KEY TEACHINGS & CONTRIBUTIONS
                </Text>
                {node.keyContributions.map((item, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: theme.brand }]} />
                    <Text style={[styles.bulletText, { color: theme.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Stotra / Audio Section */}
            {node.stotraOrChant ? (
              <View style={[styles.stotraCard, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}>
                <View style={styles.stotraHeader}>
                  <Feather name="volume-2" size={18} color={theme.brand} />
                  <Text style={[styles.stotraTitle, { color: theme.text }]}>
                    {node.stotraOrChant.title}
                  </Text>
                </View>
                <Text style={[styles.stotraDesc, { color: theme.dim }]}>
                  {node.stotraOrChant.description}
                </Text>
                <PressableSurface
                  style={[styles.audioButton, { backgroundColor: theme.brand }]}
                  onPress={handleAudioPress}
                  accessibilityLabel={`Listen to ${node.stotraOrChant.title}`}
                >
                  <Feather name="play" size={16} color="#FFFFFF" />
                  <Text style={styles.audioButtonText}>Listen to Chanting</Text>
                </PressableSurface>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderWidth: 1,
    maxHeight: '82%',
    paddingBottom: 28,
  },
  handleBarContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 12,
  },
  nodeTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 20,
    lineHeight: 26,
  },
  sanskritSubtitle: {
    fontFamily: FONTS.serif,
    fontSize: 14,
    marginTop: 2,
  },
  designation: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
  },
  mahavakyaCard: {
    padding: 12,
    borderRadius: RADII.md,
    borderWidth: 1,
    marginVertical: 8,
  },
  mahavakyaLabel: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  mahavakyaText: {
    fontFamily: FONTS.serifBold,
    fontSize: 16,
    marginTop: 2,
  },
  summaryText: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 10,
  },
  sectionBlock: {
    marginTop: 12,
  },
  sectionHeading: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  stotraCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: RADII.lg,
    borderWidth: 1,
  },
  stotraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stotraTitle: {
    fontFamily: FONTS.serifBold,
    fontSize: 15,
  },
  stotraDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 12,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADII.pill,
  },
  audioButtonText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
