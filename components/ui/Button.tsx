import {
  ActivityIndicator,
  Pressable,
  Text,
  useColorScheme,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { COLORS, MIN_TOUCH_TARGET, RADII, SHADOWS, TYPE, themeColor } from '@/lib/constants';

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
  const theme = themeColor(isDark);
  const isBusy = loading || !!disabled;

  const palette =
    variant === 'primary'
      ? { bg: theme.brand, borderColor: theme.brand, textColor: isDark ? COLORS.darkBg : COLORS.ink }
      : variant === 'secondary'
        ? { bg: theme.glass, borderColor: theme.premiumBorder, textColor: theme.text }
        : { bg: 'transparent', borderColor: 'transparent', textColor: theme.brand };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isBusy, busy: loading }}
      disabled={isBusy}
      onPress={(event) => {
        if (!isBusy) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.(event);
      }}
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
          boxShadow: variant === 'primary'
            ? (isDark ? SHADOWS.md.dark : SHADOWS.md.light)
            : undefined,
          opacity: isBusy ? 0.6 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !isBusy ? 0.985 : 1 }],
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
            ...TYPE.label,
            fontSize: size === 'sm' ? TYPE.label.fontSize : 14.5,
            color: palette.textColor,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
