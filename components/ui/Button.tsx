import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { COLORS, FONTS, MIN_TOUCH_TARGET, RADII } from '@/lib/constants';

// Reusable CTA primitive — extracted from the near-identical Pressable +
// ActivityIndicator-swap + Text block that was hand-rolled in at least six
// screens this session (login, onboarding, otp, whatsapp, nitya-karma,
// sankalpa), each with its own slightly different border radius/padding.
// New adoption only (not retrofit onto those screens in this slice — see
// design-system report).
//
// Accepts `style` (merged last, so it can win — full-width via
// `{ width: '100%' }`/`{ alignSelf: 'stretch' }`, inline via
// `{ alignSelf: 'flex-start' }`, footer spacing via margin, etc.) and uses
// Pressable's style-callback form internally for real pressed-state
// feedback (a momentary opacity dip), separate from the disabled/loading
// opacity.

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const isDark = useColorScheme() === 'dark';
  const isBusy = loading || !!disabled;

  const border = isDark ? COLORS.borderDark : COLORS.borderLight;
  const text = isDark ? COLORS.creamBg : COLORS.ink;

  const palette =
    variant === 'primary'
      ? { bg: COLORS.brandGold, borderColor: COLORS.brandGold, textColor: COLORS.ink }
      : variant === 'secondary'
        ? { bg: 'transparent', borderColor: border, textColor: text }
        : { bg: 'transparent', borderColor: 'transparent', textColor: COLORS.brandGold };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isBusy, busy: loading }}
      disabled={isBusy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          borderRadius: RADII.lg,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderColor: palette.borderColor,
          backgroundColor: palette.bg,
          paddingHorizontal: size === 'sm' ? 16 : 22,
          paddingVertical: size === 'sm' ? 10 : 15,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isBusy ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.textColor} />
      ) : (
        <Text
          style={{
            fontFamily: FONTS.sansSemiBold,
            fontSize: size === 'sm' ? 13 : 15,
            color: palette.textColor,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
