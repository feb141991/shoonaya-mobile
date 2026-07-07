import { Pressable, Text, useColorScheme, type PressableProps } from 'react-native';

import { COLORS, FONTS, RADII } from '@/lib/constants';

// Small selectable chip — extracted from the mantra selector (bhakti.tsx)
// and target-days selector (sankalpa.tsx) patterns, which built the same
// selected/unselected pill styling independently.
//
// Visual height (40) is intentionally below MIN_TOUCH_TARGET (44) — this is
// a compact control meant to sit several-in-a-row (e.g. 4-6 pills across a
// row), and inflating each to a full 44px would look bulky and force
// wrapping sooner than necessary. Per WCAG 2.5.5 / Apple HIG, a compact
// control satisfies the touch-target guidance by expanding its *hit area*
// rather than its visual size, so hitSlop compensates: 40px visual height +
// 4px hitSlop top/bottom = 48px effective vertical hit area.

type PillProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  selected?: boolean;
  accessibilityLabel?: string;
};

export function Pill({
  label,
  selected = false,
  accessibilityLabel,
  onPress,
  disabled,
  ...props
}: PillProps) {
  const isDark = useColorScheme() === 'dark';
  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const card = isDark ? COLORS.cardBgDark : COLORS.cardBgLight;
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;

  const interactive = typeof onPress === 'function';

  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityState={interactive ? { selected, disabled: !!disabled } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={{
        minHeight: 40,
        borderRadius: RADII.pill,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? COLORS.brandGold : border,
        backgroundColor: selected ? card : 'transparent',
        paddingHorizontal: 14,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
      {...props}
    >
      <Text
        style={{
          fontFamily: FONTS.sansSemiBold,
          fontSize: 12,
          color: selected ? COLORS.brandGold : dim,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
