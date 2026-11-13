import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import type { KinshipTier } from '@/lib/kinship';
import { COLORS, FONTS, RADII, themeColor } from '@/lib/constants';

interface VanshKinshipModalProps {
  activeKinshipTier: KinshipTier | null;
  onClose: () => void;
  isDark: boolean;
}

export function VanshKinshipModal({
  activeKinshipTier,
  onClose,
  isDark,
}: VanshKinshipModalProps) {
  const theme = themeColor(isDark);
  if (!activeKinshipTier) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={Boolean(activeKinshipTier)}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.tooltipCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.tooltipHeaderRow}>
            <View style={styles.titleRow}>
              <Text style={[styles.tooltipTitle, { color: theme.text, fontFamily: FONTS.serifBold }]}>
                {activeKinshipTier.label}
              </Text>
              <View style={[styles.genTag, { backgroundColor: theme.brandSoft }]}>
                <Text style={[styles.genTagText, { color: theme.brand }]}>
                  Gen {activeKinshipTier.generation}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close kinship explanation">
              <Feather name="x" size={18} color={theme.dim} />
            </Pressable>
          </View>

          <Text style={[styles.tooltipSubtitle, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
            {activeKinshipTier.hindiLabel} · {activeKinshipTier.description}
          </Text>

          <Text style={[styles.tooltipBody, { color: theme.text, fontFamily: FONTS.sans }]}>
            {activeKinshipTier.tooltip}
          </Text>

          <View style={[styles.tooltipDivider, { borderTopColor: theme.borderSoft }]}>
            <Text style={[styles.tooltipNote, { color: theme.dim, fontFamily: FONTS.sans }]}>
              In Kutumb Vansh, generations trace your sacred roots from foundational elders down to future descendants.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.familyModalScrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tooltipCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADII.xl,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  tooltipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 18,
  },
  genTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
  genTagText: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 11,
  },
  tooltipSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
  tooltipBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  tooltipDivider: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 12,
  },
  tooltipNote: {
    fontSize: 11,
    lineHeight: 16,
  },
});
