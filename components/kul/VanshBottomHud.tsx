import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, RADII } from '@/lib/constants';
import { getKinshipTier } from '@/lib/kinship';
import type { Vansh3DNode } from '@/lib/vansh3d';
import { BRANCH_THEMES } from '@/lib/vanshThemes';

interface VanshBottomHudProps {
  selectedNode: Vansh3DNode | null;
  gotra?: string | null;
  theme: {
    card: string;
    border: string;
    text: string;
    dim: string;
    brand: string;
    brandSoft: string;
    brandStrong: string;
  };
}

export function VanshBottomHud({ selectedNode, gotra, theme }: VanshBottomHudProps) {
  if (!selectedNode) return null;

  const kinship = getKinshipTier(selectedNode.generation);
  const branchTheme = BRANCH_THEMES[selectedNode.branchType] || BRANCH_THEMES.pitri;

  return (
    <View style={[styles.hudInspector, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Top Tag Row */}
      <View style={styles.hudHeaderRow}>
        <View style={styles.tagGroup}>
          <Text style={[styles.statusTag, { color: selectedNode.isRemembered ? theme.dim : branchTheme.text }]}>
            {selectedNode.isRemembered ? 'SMRITI / MEMORIAL' : 'LIVING'}
          </Text>
          <View style={[styles.branchPill, { backgroundColor: theme.brandSoft }]}>
            <Text style={[styles.branchPillText, { color: branchTheme.text }]}>
              {selectedNode.branchType.toUpperCase()}
            </Text>
          </View>
        </View>
        {selectedNode.isRemembered ? (
          <Text style={{ fontSize: 12 }}>🪔</Text>
        ) : null}
      </View>

      {/* Title & Relationship Subtitle */}
      <View style={styles.titleSection}>
        <Text style={[styles.hudName, { color: theme.text, fontFamily: FONTS.serifBold }]} numberOfLines={1}>
          {selectedNode.data.name}
        </Text>
        <Text style={[styles.hudSanskrit, { color: branchTheme.text, fontFamily: FONTS.sans }]}>
          {selectedNode.data.role || kinship.label} • Gen {selectedNode.generation}
        </Text>
      </View>

      {/* Two-Column Gotra & Vamsha Sutra Box */}
      <View style={styles.gridRow}>
        <View style={[styles.gridBox, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
          <Text style={[styles.gridLabel, { color: theme.dim }]}>Gotra</Text>
          <Text style={[styles.gridValue, { color: theme.text, fontFamily: FONTS.sansSemiBold }]} numberOfLines={1}>
            {gotra || 'Kashyapa'}
          </Text>
        </View>
        <View style={[styles.gridBox, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}>
          <Text style={[styles.gridLabel, { color: theme.dim }]}>Vamsha Sutra</Text>
          <Text style={[styles.gridValue, { color: theme.text, fontFamily: FONTS.sansSemiBold }]} numberOfLines={1}>
            {branchTheme.sutra}
          </Text>
        </View>
      </View>

      {/* Interactive Helper Footer */}
      <Text style={[styles.footerHint, { color: theme.dim }]}>
        Tap any node to focus • Drag to rotate 3D
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hudInspector: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 68,
    zIndex: 90,
    borderRadius: RADII.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTag: {
    fontSize: 9.5,
    fontFamily: FONTS.sansSemiBold,
    letterSpacing: 0.6,
  },
  branchPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADII.pill,
  },
  branchPillText: {
    fontSize: 9,
    fontFamily: FONTS.sansSemiBold,
  },
  titleSection: {
    marginTop: 2,
    marginBottom: 6,
  },
  hudName: {
    fontSize: 14,
  },
  hudSanskrit: {
    fontSize: 10.5,
    marginTop: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  gridBox: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: RADII.md,
    borderWidth: 0.5,
  },
  gridLabel: {
    fontSize: 8.5,
  },
  gridValue: {
    fontSize: 10.5,
    marginTop: 1,
  },
  footerHint: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
});
