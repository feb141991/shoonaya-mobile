import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { FONTS, RADII } from '@/lib/constants';
import type { Vansh3DCrest } from '@/lib/vansh3d';

interface VanshCrestBadgeProps {
  crest: Vansh3DCrest | null;
  theme: {
    card: string;
    border: string;
    brand: string;
    brandStrong: string;
    brandSoft: string;
  };
}

export function VanshCrestBadge({ crest, theme }: VanshCrestBadgeProps) {
  if (!crest?.proj) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.crestFloatingBadge,
        {
          left: crest.proj.sx - 110,
          top: crest.proj.sy - 24,
          backgroundColor: theme.card,
          borderColor: theme.brand,
          shadowColor: theme.brand,
        },
      ]}
    >
      <View style={[styles.crestIconCircle, { backgroundColor: theme.brandSoft }]}>
        <Feather name="shield" size={12} color={theme.brand} />
      </View>
      <Text style={[styles.crestGotraText, { color: theme.brandStrong, fontFamily: FONTS.serifBold }]}>
        {crest.gotra ? `${crest.gotra} Gotra` : 'Kul Parampara'}
        {crest.pravara ? ` · ${crest.pravara}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  crestFloatingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  crestIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestGotraText: {
    fontSize: 11,
  },
});
