import { Text, View, useColorScheme } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { MotionView } from '@/components/ui/Motion';
import type { PathshalaPath } from '@/lib/pathshala-types';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, TYPE, themeColor } from '@/lib/constants';

type PathCardProps = {
  path: PathshalaPath;
  progressPct: number;
  onPress: () => void;
  index?: number;
};

export function PathCard({ path, progressPct, onPress, index = 0 }: PathCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const theme = themeColor(isDark);
  const brand = theme.brand;
  const progress = Math.max(0, Math.min(progressPct, 100));

  return (
    <MotionView animationKey={path.id} delay={Math.min(index, 5) * 32} distance={6}>
      <PressableSurface
        onPress={onPress}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: 26,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: border,
          padding: 17,
          gap: 14,
          boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.brandSoft,
                  borderWidth: 1,
                  borderColor: theme.premiumBorder,
                }}
              >
                <Feather name="book-open" size={17} color={brand} />
              </View>
              <Text style={{ ...TYPE.cardHeading, color: text, flex: 1 }} numberOfLines={2}>
                {path.title}
              </Text>
            </View>
            <Text style={{ fontFamily: FONTS.sans, fontSize: 13, color: dim }} numberOfLines={2}>
              {path.description}
            </Text>
          </View>

          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: theme.brandSoft,
            }}
          >
            <Text style={{ fontFamily: FONTS.sansMedium, fontSize: 11, color: brand, textTransform: 'capitalize' }}>
              {path.difficulty}
            </Text>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: isDark ? COLORS.homeRingTrackDark : COLORS.homeRingTrackLight,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: brand,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={{ fontFamily: FONTS.sans, fontSize: 12, color: dim }}>
            {progress}% complete
          </Text>
        </View>
      </PressableSurface>
    </MotionView>
  );
}
