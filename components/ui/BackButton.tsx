import { Pressable, Text, useColorScheme, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';

// Extracted from the identical "chevron-left + Back text" Pressable
// duplicated in app/nitya-karma.tsx and app/sankalpa.tsx (and close variants
// elsewhere) — none of which set accessibilityRole/Label or a minimum
// touch-target height. New adoption only in this slice; not retrofitted
// onto those screens here.

type BackButtonProps = {
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function BackButton({ label = 'Back', onPress, style }: BackButtonProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={onPress ?? (() => router.back())}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: MIN_TOUCH_TARGET,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Feather name="chevron-left" size={16} color={dim} />
      <Text style={{ color: dim, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
