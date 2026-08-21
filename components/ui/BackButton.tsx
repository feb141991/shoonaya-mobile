import { Text, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, themeColor } from '@/lib/constants';

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
  variant?: 'text' | 'icon' | 'glass' | 'hero';
  // Icon-only header variant (e.g. Pathshala detail/reader): hides the text
  // label while keeping the same accessible name, min touch target, and
  // router.back() default. Added so screens that previously rendered a bare
  // arrow-left icon next to their own title can standardize on this
  // component without picking up an unwanted visible "Back" label.
  showLabel?: boolean;
  iconSize?: number;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({
  label = 'Back',
  variant,
  showLabel = true,
  iconSize,
  iconColor,
  onPress,
  style,
}: BackButtonProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const resolvedVariant = variant ?? (showLabel ? 'text' : 'glass');
  const isText = resolvedVariant === 'text';
  const isHero = resolvedVariant === 'hero';
  const resolvedColor = iconColor ?? (isText ? dim : theme.text);
  const resolvedIconSize = iconSize ?? (isText ? 16 : isHero ? 20 : 19);

  return (
    <PressableSurface
      accessibilityLabel={label}
      haptic="selection"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={onPress ?? (() => router.back())}
      style={[
        isText
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: MIN_TOUCH_TARGET,
              alignSelf: 'flex-start',
            }
          : {
              width: MIN_TOUCH_TARGET,
              height: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              borderRadius: isHero ? 18 : 22,
              borderWidth: 1,
              borderColor: theme.premiumBorder,
              backgroundColor: isHero ? theme.glass : theme.card,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? SHADOWS.sm.dark : SHADOWS.sm.light,
            },
        style,
      ]}
    >
      <Feather name="chevron-left" size={resolvedIconSize} color={resolvedColor} />
      {isText && showLabel ? (
        <Text style={{ color: resolvedColor, fontFamily: FONTS.sansSemiBold, fontSize: 12 }}>{label}</Text>
      ) : null}
    </PressableSurface>
  );
}
