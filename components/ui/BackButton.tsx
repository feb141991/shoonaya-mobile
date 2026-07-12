import { Pressable, Text, useColorScheme, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { COLORS, FONTS, MIN_TOUCH_TARGET } from '@/lib/constants';

// Extracted from the identical "chevron-left + Back text" Pressable
// duplicated across several screens — none of which set accessibilityRole/
// Label or a minimum touch-target height. Standardized onto quiz.tsx,
// vrat.tsx, and sankalpa.tsx (exact-match duplicates); Pathshala's
// detail/reader screens use the showLabel={false} icon-only variant since
// their header pairs the icon with its own title text instead of a "Back"
// label. app/nitya-karma.tsx intentionally NOT touched — it already moved
// to its own distinct circular/glass back-button treatment as part of an
// earlier visual pass and standardizing it here would be a regression.

type BackButtonProps = {
  label?: string;
  // Icon-only header variant (e.g. Pathshala detail/reader): hides the text
  // label while keeping the same accessible name, min touch target, and
  // router.back() default. Added so screens that previously rendered a bare
  // arrow-left icon next to their own title can standardize on this
  // component without picking up an unwanted visible "Back" label.
  showLabel?: boolean;
  iconSize?: number;
  iconColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

export function BackButton({
  label = 'Back',
  showLabel = true,
  iconSize = 16,
  iconColor,
  onPress,
  style,
}: BackButtonProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const resolvedColor = iconColor ?? dim;

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
      <Feather name="chevron-left" size={iconSize} color={resolvedColor} />
      {showLabel ? (
        <Text style={{ color: resolvedColor, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}
