import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS, RADII } from '@/lib/constants';
import { getKinshipTier } from '@/lib/kinship';
import type { Vansh3DNode } from '@/lib/vansh3d';

interface VanshBottomHudProps {
  selectedNode: Vansh3DNode | null;
  theme: {
    card: string;
    border: string;
    text: string;
    brand: string;
    brandSoft: string;
  };
}

export function VanshBottomHud({ selectedNode, theme }: VanshBottomHudProps) {
  if (!selectedNode) return null;

  const kinship = getKinshipTier(selectedNode.generation);

  return (
    <View style={[styles.hudInspector, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.hudHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hudName, { color: theme.text, fontFamily: FONTS.serifBold }]} numberOfLines={1}>
            {selectedNode.data.name}
          </Text>
          <Text style={[styles.hudSanskrit, { color: theme.brand, fontFamily: FONTS.sansSemiBold }]}>
            {kinship.label} · Gen {selectedNode.generation}
            {selectedNode.data.role ? ` · ${selectedNode.data.role}` : ''}
          </Text>
        </View>
        {selectedNode.isRemembered ? (
          <View style={[styles.hudDiyaBadge, { backgroundColor: theme.brandSoft }]}>
            <Text style={{ fontSize: 13 }}>🪔 Smriti</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hudInspector: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 68,
    zIndex: 90,
    borderRadius: RADII.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudName: {
    fontSize: 13,
  },
  hudSanskrit: {
    fontSize: 11,
    marginTop: 1,
  },
  hudDiyaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.pill,
  },
});
