import { useEffect } from 'react';
import { BackHandler, Text, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, themeColor } from '@/lib/constants';

type BackButtonProps = {
  label?: string;
  variant?: 'text' | 'icon' | 'glass' | 'hero';
  showLabel?: boolean;
  iconSize?: number;
  iconColor?: string;
  onPress?: () => void;
  fallbackHref?: string;
  handleHardwareBack?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({
  label = 'Back',
  variant,
  showLabel = true,
  iconSize,
  iconColor,
  onPress,
  fallbackHref,
  handleHardwareBack = true,
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

  const handleBack = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else if (fallbackHref) {
      router.replace(fallbackHref as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    if (!handleHardwareBack && !fallbackHref) return;

    const onBackPress = () => {
      handleBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleHardwareBack, fallbackHref, onPress]);

  return (
    <PressableSurface
      accessibilityLabel={label}
      haptic="selection"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={handleBack}
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
