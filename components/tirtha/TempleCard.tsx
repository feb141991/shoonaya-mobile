import { Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';
import type { Temple } from '@/lib/overpass';

type TempleCardProps = {
  temple: Temple;
  distanceLabel: string;
  saved: boolean;
  onSave: () => void;
  onCheckIn: () => void;
  onFocusMap?: () => void;
};

export function TempleCard({ temple, distanceLabel, saved, onSave, onCheckIn, onFocusMap }: TempleCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const brand = isDark ? COLORS.brandGoldDark : COLORS.brandGoldLight;
  const textOnBrand = isDark ? COLORS.textOnBrandDark : COLORS.textOnBrandLight;

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
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: FONTS.sansSemiBold, fontSize: 15, color: text }}>{temple.name}</Text>
          {onFocusMap ? (
            <PressableSurface
              onPress={onFocusMap}
              haptic="selection"
              hitSlop={8}
              accessibilityLabel="Show on map"
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Feather name="map-pin" size={14} color={brand} />
            </PressableSurface>
          ) : null}
        </View>
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
            minHeight: MIN_TOUCH_TARGET,
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
            minHeight: MIN_TOUCH_TARGET,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: FONTS.sansSemiBold, fontSize: 12, color: textOnBrand }}>
            Check-in
          </Text>
        </PressableSurface>
      </View>
    </View>
  );
}
