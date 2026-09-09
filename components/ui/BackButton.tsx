import { useCallback } from 'react';
import { BackHandler, Text, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { usePathname, useRouter, useFocusEffect, type Href } from 'expo-router';

import { PressableSurface } from '@/components/ui/PressableSurface';
import { COLORS, FONTS, MIN_TOUCH_TARGET, SHADOWS, themeColor } from '@/lib/constants';

type BackButtonProps = {
  label?: string;
  variant?: 'text' | 'icon' | 'glass' | 'hero';
  showLabel?: boolean;
  iconSize?: number;
  iconColor?: string;
  onPress?: () => void;
  fallbackHref?: Href;
  handleHardwareBack?: boolean;
  style?: StyleProp<ViewStyle>;
};

function inferParentFallback(pathname: string): Href {
  if (pathname.startsWith('/bhakti')) return '/(tabs)/bhakti';
  if (pathname.startsWith('/mantras')) return '/(tabs)/bhakti';
  if (pathname.startsWith('/pathshala')) return '/(tabs)/pathshala';
  if (pathname.startsWith('/lineage')) return '/(tabs)/pathshala';
  if (pathname.startsWith('/japa')) return '/(tabs)/japa';
  if (pathname.startsWith('/settings')) return '/settings';
  if (pathname.startsWith('/kundali')) return '/kundali';
  if (pathname.startsWith('/dharm-veer')) return '/dharm-veer';
  if (pathname.startsWith('/vrat')) return '/vrat';
  if (pathname.startsWith('/my-progress/')) return '/my-progress';
  return '/(tabs)';
}

// Android's default stack behavior is correct for ordinary screens. This is
// deliberately opt-in for routes that can be opened directly (for example
// from a notification or deep link) and therefore need a deterministic
// parent when no stack history exists.
export function useFallbackBackHandler(
  fallbackHref?: Href,
  enabled = false,
  onPress?: () => void,
  onBeforeBack?: () => void | Promise<void>,
) {
  const router = useRouter();
  const pathname = usePathname();

  const navigateBack = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // Preserve the BackButton's historical direct-entry behavior for the
      // many readers that do not declare a more specific parent route.
      router.replace(fallbackHref ?? inferParentFallback(pathname));
    }
  }, [fallbackHref, onPress, pathname, router]);

  const handleBack = useCallback(() => {
    if (!onBeforeBack) {
      navigateBack();
      return;
    }
    void Promise.resolve(onBeforeBack()).finally(navigateBack);
  }, [navigateBack, onBeforeBack]);

  // Focus-scoped, not a plain mount/unmount effect: React Navigation's
  // native-stack keeps a screen mounted (not unmounted) once something is
  // pushed on top of it, for the back-swipe animation. A plain useEffect
  // here would leave this screen's hardware-back listener registered the
  // whole time it sits underneath another screen -- if that top screen
  // doesn't register its own listener, Android's back press falls through
  // to this stale one and navigates as if the press came from the
  // screen beneath instead of the one actually on screen.
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [enabled, handleBack])
  );

  return handleBack;
}

export function BackButton({
  label = 'Back',
  variant,
  showLabel = true,
  iconSize,
  iconColor,
  onPress,
  fallbackHref,
  handleHardwareBack = false,
  style,
}: BackButtonProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = themeColor(isDark);
  const dim = isDark ? COLORS.textDimDark : COLORS.textDimLight;
  const resolvedVariant = variant ?? (showLabel ? 'text' : 'glass');
  const isText = resolvedVariant === 'text';
  const isHero = resolvedVariant === 'hero';
  const resolvedColor = iconColor ?? (isText ? dim : theme.text);
  const resolvedIconSize = iconSize ?? (isText ? 16 : isHero ? 20 : 19);

  const handleBack = useFallbackBackHandler(fallbackHref, handleHardwareBack, onPress);

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
