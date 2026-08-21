import { Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS } from '@/lib/constants';
import type { Temple } from '@/lib/overpass';

type TempleCardProps = {
  temple: Temple;
  distanceLabel: string;
  saved: boolean;
  onSave: () => void;
  onCheckIn: () => void;
};

export function TempleCard({ temple, distanceLabel, saved, onSave, onCheckIn }: TempleCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;

  return (
    <View
      style={{
        borderRadius: 22,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>{temple.name}</Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim, textTransform: 'capitalize' }}>
          {temple.tradition} · {distanceLabel}
        </Text>
        <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }} numberOfLines={2}>
          {temple.address ?? 'Address unavailable'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PressableSurface
          onPress={onSave}
          haptic="selection"
          style={{
            flex: 1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: saved ? brand : border,
            paddingVertical: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Feather name="bookmark" size={14} color={saved ? brand : text} />
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: saved ? brand : text }}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </PressableSurface>

        <PressableSurface
          onPress={onCheckIn}
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: brand,
            paddingVertical: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: isDark ? COLORS.darkBg : COLORS.creamBg }}>
            Check-in
          </Text>
        </PressableSurface>
      </View>
    </View>
  );
}
